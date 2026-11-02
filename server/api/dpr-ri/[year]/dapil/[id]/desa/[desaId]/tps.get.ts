import { query, queryOne } from '../../../../../../../utils/db'
import { checkAccess, getUserFromSession } from '../../../../../../../utils/auth'

export default defineEventHandler(async (event) => {
  const year = Number(getRouterParam(event, 'year'))
  const dapilId = Number(getRouterParam(event, 'id'))
  const villageId = Number(getRouterParam(event, 'desaId'))
  if (![year, dapilId, villageId].every(Number.isSafeInteger)) throw createError({ statusCode: 400 })

  const village = await queryOne<any>(`SELECT r.id, reg.id AS regency_id FROM regions r
    JOIN regions dist ON dist.id = r.parent_id JOIN regions reg ON reg.id = dist.parent_id
    JOIN constituency_regions cr ON cr.region_id = r.id AND cr.constituency_id = ? AND cr.election_year = ? AND cr.coverage = 'whole'
    JOIN constituencies c ON c.id = cr.constituency_id AND c.election_year = ? AND c.chamber = 'dpr_ri'
    WHERE r.id = ? AND r.election_year = ? AND r.level = 'village' LIMIT 1`, [dapilId, year, year, villageId, year])
  if (!village) throw createError({ statusCode: 404, statusMessage: 'Cakupan desa tidak ditemukan' })
  const access = checkAccess(await getUserFromSession(event), { constituencyId: dapilId, regionId: village.regency_id, level: 'tps' })
  if (!access.allowed) throw createError({ statusCode: 403, statusMessage: access.reason })

  const tps = await query<any>(`SELECT id, name, code FROM regions WHERE election_year = ? AND parent_id = ? AND level = 'tps' ORDER BY code LIMIT 200`, [year, villageId])
  if (!tps.length) return { tps: [] }
  const reports = await query<any>(`SELECT id, region_id, value_format, quality_status, source_id, report_origin FROM vote_reports
    WHERE election_id = ? AND contest_type = 'dpr_ri' AND scope_level = 'tps' AND region_id IN (?)
      AND (constituency_id = ? OR (constituency_id IS NULL AND value_format IN ('party_components','party_totals')))
      AND value_format IN ('party_components','party_totals','candidate_votes')`, [year, tps.map(t => t.id), dapilId])
  const ids = reports.map(r => r.id)
  const partyVotes = ids.length ? await query<any>(`SELECT report_id, election_party_id, source_party_key, party_votes, total_votes FROM v_party_votes WHERE report_id IN (?)`, [ids]) : []
  const candidates = ids.length ? await query<any>(`SELECT v.report_id, v.source_candidate_key, v.candidate_id, v.election_party_id, v.votes, c.name, c.ballot_number FROM v_candidate_votes v LEFT JOIN candidates c ON c.id = v.candidate_id AND c.constituency_id = ? WHERE v.report_id IN (?)`, [dapilId, ids]) : []
  const parties = await query<any>(`SELECT id, name, color, ballot_number FROM election_parties WHERE election_year = ? AND is_local = 0 ORDER BY ballot_number`, [year])
  return { parties, tps: tps.map(t => {
    const rs = reports.filter(r => r.region_id === t.id)
    const pr = rs.filter(r => r.value_format !== 'candidate_votes')
    const cr = rs.filter(r => r.value_format === 'candidate_votes')
    return { ...t, partyReports: pr, candidateReports: cr,
      partyVotes: pr.length === 1 ? partyVotes.filter(v => v.report_id === pr[0].id) : [],
      candidates: cr.length === 1 ? candidates.filter(v => v.report_id === cr[0].id) : [] }
  }) }
})
