import { query } from '../utils/db'
import { sainteLague } from '../utils/sainteLague'

// Suara sah Riau 3 pada lampiran Keputusan KPU 1050/2024, tabel Riau 1-8.
// https://jdih.kpu.go.id/data/data_kepkpu/2024kpt1050_L5.4Riau.pdf
const OFFICIAL_RIAU3_BALLOT_VOTES: Record<number, number> = {
  1: 15695, 2: 52748, 3: 25255, 4: 73393, 5: 30676, 6: 1823,
  7: 1289, 8: 25420, 9: 119, 10: 928, 11: 0, 12: 16543,
  13: 317, 14: 36768, 15: 10663, 16: 765, 17: 3348, 24: 233
}
const OFFICIAL_RIAU3_SOURCE = 'https://jdih.kpu.go.id/data/data_kepkpu/2024kpt1050_L5.4Riau.pdf'

/** Ringkasan DPRD provinsi dari laporan langsung setiap dapil provinsi. */
export async function nationalDprdProvinsi(year: number) {
  const provinces = await query<any>(
    `SELECT r.id, r.name, r.code,
      (SELECT COUNT(*) FROM constituencies c WHERE c.election_year = ? AND c.chamber = 'dprd_provinsi' AND c.province_id = r.id) dapil_count,
      (SELECT COALESCE(SUM(c.seat_count),0) FROM constituencies c WHERE c.election_year = ? AND c.chamber = 'dprd_provinsi' AND c.province_id = r.id) seats
      FROM regions r WHERE r.election_year = ? AND r.level = 'province' ORDER BY r.code`, [year, year, year]
  )
  const parties = await query<any>(
    `SELECT id, ballot_number, name, color, is_local FROM election_parties WHERE election_year = ? ORDER BY ballot_number`, [year]
  )
  const dapil = await query<any>(
    `SELECT c.id, c.name, c.province_id, c.seat_count,
      (SELECT MIN(v.id) FROM vote_reports v WHERE v.election_id = ? AND v.contest_type = 'dprd_provinsi' AND v.scope_level = 'constituency' AND v.constituency_id = c.id AND v.value_format = 'party_components' AND v.report_origin = 'reported' AND v.quality_status = 'usable') components_id,
      (SELECT MIN(v.id) FROM vote_reports v WHERE v.election_id = ? AND v.contest_type = 'dprd_provinsi' AND v.scope_level = 'constituency' AND v.constituency_id = c.id AND v.value_format = 'party_totals' AND v.report_origin = 'reported' AND v.quality_status = 'usable') totals_id
      FROM constituencies c WHERE c.election_year = ? AND c.chamber = 'dprd_provinsi'`, [year, year, year]
  )
  const reportIds = [...new Set(dapil.flatMap(d => [d.components_id, d.totals_id]).filter(Boolean))]
  const voteRows = reportIds.length ? await query<any>(
    `SELECT report_id, election_party_id, total_votes FROM v_party_votes WHERE report_id IN (?) AND election_party_id IS NOT NULL`, [reportIds]
  ) : []
  const byReport = new Map<number, Record<number, number>>()
  for (const row of voteRows) {
    if (row.total_votes == null) continue
    const votes = byReport.get(Number(row.report_id)) ?? {}
    votes[Number(row.election_party_id)] = Number(row.total_votes)
    byReport.set(Number(row.report_id), votes)
  }
  const acehId = Number(provinces.find(p => p.name === 'ACEH')?.id)
  const result = provinces.map(p => ({ ...p, votes: {} as Record<number, number>, partySeats: {} as Record<number, number>, reportedDapil: 0, conflictedDapil: 0, officialSourceDapil: 0 }))
  const byProvince = new Map(result.map(p => [Number(p.id), p]))
  const dapilRows: any[] = []
  for (const d of dapil) {
    const province = byProvince.get(Number(d.province_id))
    if (!province) continue
    const components = byReport.get(Number(d.components_id))
    const totals = byReport.get(Number(d.totals_id))
    let votes = components ?? totals
    let officialSource: string | undefined
    const expected = parties.filter(p => !p.is_local || Number(d.province_id) === acehId)
    if (!votes || expected.some(p => votes[p.id] == null)) {
      dapilRows.push({ ...d, votes: null, partySeats: null, complete: false })
      continue
    }
    if (components && totals && expected.some(p => components[p.id] !== totals[p.id])) {
      if (Number(year) === 2024 && Number(d.id) === 5025) {
        votes = Object.fromEntries(expected.map(p => [p.id, OFFICIAL_RIAU3_BALLOT_VOTES[Number(p.ballot_number)]]))
        if (expected.some(p => votes![p.id] == null)) throw new Error('Data resmi KPU Riau 3 tidak lengkap')
        officialSource = OFFICIAL_RIAU3_SOURCE
        province.officialSourceDapil++
      } else {
        province.conflictedDapil++
        dapilRows.push({ ...d, votes: null, partySeats: null, complete: false, conflict: true })
        continue
      }
    }
    province.reportedDapil++
    for (const p of expected) province.votes[p.id] = (province.votes[p.id] ?? 0) + votes[p.id]
    const seats = sainteLague(votes, Number(d.seat_count), new Set(expected.map(p => Number(p.id)))).seatsByParty
    for (const [id, count] of Object.entries(seats)) province.partySeats[Number(id)] = (province.partySeats[Number(id)] ?? 0) + count
    dapilRows.push({ ...d, votes, partySeats: seats, complete: true, source: officialSource })
  }
  return { parties, provinces: result, dapil: dapilRows }
}

/** Pemenang partai per kabupaten/kota dari laporan langsung scope regency. */
export async function regencyPartyWinners(year: number, provinceId: number, provinceName: string, parties: any[]) {
  const expectedParties = parties.filter(p => !p.is_local || provinceName === 'ACEH')
  const reports = await query<any>(
    `SELECT vr.id AS report_id, vr.region_id, r.name AS region_name, vr.constituency_id
      FROM vote_reports vr
      JOIN regions r ON r.id = vr.region_id AND r.election_year = vr.election_id AND r.level = 'regency' AND r.parent_id = ?
      JOIN constituencies c ON c.id = vr.constituency_id AND c.election_year = vr.election_id AND c.chamber = 'dprd_provinsi' AND c.province_id = ?
      WHERE vr.election_id = ? AND vr.contest_type = 'dprd_provinsi' AND vr.scope_level = 'regency'
        AND vr.value_format = 'party_components' AND vr.report_origin = 'reported' AND vr.quality_status = 'usable'
      ORDER BY vr.region_id, vr.constituency_id, vr.id`,
    [provinceId, provinceId, year]
  )
  if (!reports.length) return []

  const reportIds = reports.map(r => Number(r.report_id))
  const voteRows = await query<any>(
    `SELECT report_id, election_party_id, total_votes FROM v_party_votes
      WHERE report_id IN (?) AND election_party_id IS NOT NULL`,
    [reportIds]
  )
  const votesByReport = new Map<number, Map<number, number>>()
  for (const row of voteRows) {
    if (row.total_votes == null) continue
    const reportVotes = votesByReport.get(Number(row.report_id)) ?? new Map<number, number>()
    reportVotes.set(Number(row.election_party_id), Number(row.total_votes))
    votesByReport.set(Number(row.report_id), reportVotes)
  }

  const reportsByRegion = new Map<number, any[]>()
  for (const report of reports) {
    const id = Number(report.region_id)
    const regionReports = reportsByRegion.get(id) ?? []
    regionReports.push(report)
    reportsByRegion.set(id, regionReports)
  }

  return [...reportsByRegion.entries()].map(([regionId, regionReports]) => {
    const complete = regionReports.every(report => {
      const reportVotes = votesByReport.get(Number(report.report_id))
      return reportVotes && expectedParties.every(p => reportVotes.has(Number(p.id)))
    })
    if (!complete) return { regionId, regionName: regionReports[0].region_name, complete: false, winnerPartyIds: [], partyVotes: {} }

    const totals = new Map<number, number>(expectedParties.map(p => [Number(p.id), 0]))
    for (const report of regionReports) {
      const reportVotes = votesByReport.get(Number(report.report_id))!
      for (const party of expectedParties) {
        const id = Number(party.id)
        totals.set(id, totals.get(id)! + reportVotes.get(id)!)
      }
    }
    const maxVotes = Math.max(...totals.values())
    const winnerPartyIds = [...totals.entries()].filter(([, votes]) => votes === maxVotes).map(([id]) => id)
    const winner = expectedParties.find(p => Number(p.id) === winnerPartyIds[0])
    return {
      regionId,
      regionName: regionReports[0].region_name,
      complete: true,
      tied: winnerPartyIds.length > 1,
      winnerPartyIds,
      winnerPartyName: winnerPartyIds.length === 1 ? winner?.name : null,
      winnerPartyColor: winnerPartyIds.length === 1 ? winner?.color : null,
      votes: maxVotes,
      partyVotes: Object.fromEntries(totals),
      totalVotes: [...totals.values()].reduce((sum, votes) => sum + votes, 0)
    }
  })
}

/** Rincian kecamatan dalam kabupaten/kota untuk satu dapil DPRD Provinsi. */
export async function dprdProvinsiRegencyDetail(year: number, constituencyId: number, regencyId: number) {
  const regency = await query<any>(
    `SELECT r.id, r.name, r.code, r.parent_id, c.id AS dapil_id, c.name AS dapil_name,
        c.province_id, pr.name AS province_name
      FROM regions r
      JOIN constituencies c ON c.id = ? AND c.election_year = r.election_year AND c.chamber = 'dprd_provinsi'
      JOIN regions pr ON pr.id = c.province_id AND pr.election_year = r.election_year
      WHERE r.election_year = ? AND r.id = ? AND r.level = 'regency' AND r.parent_id = c.province_id`,
    [constituencyId, year, regencyId]
  )
  if (!regency.length) return null
  const region = regency[0]
  const parties = await query<any>(
    `SELECT id, ballot_number, name, color, is_local FROM election_parties
      WHERE election_year = ? AND (is_local = 0 OR ? = 'ACEH') ORDER BY ballot_number`,
    [year, region.province_name]
  )
  const districts = await query<any>(
    `SELECT r.id AS regionId, r.name, r.code FROM regions r
      WHERE r.election_year = ? AND r.parent_id = ? AND r.level = 'district'
        AND EXISTS (SELECT 1 FROM constituency_regions cr
          WHERE cr.constituency_id = ? AND cr.region_id = r.id AND cr.election_year = r.election_year)
      ORDER BY r.name`,
    [year, regencyId, constituencyId]
  )
  const regencyCandidateReport = await query<any>(
    `SELECT vr.id AS reportId FROM preferred_vote_reports p
      JOIN vote_reports vr ON vr.id = p.report_id
      WHERE p.election_id = ? AND p.contest_type = 'dprd_provinsi'
        AND p.constituency_key = ? AND p.scope_level = 'regency' AND p.metric_family = 'candidate'
        AND vr.election_id = ? AND vr.contest_type = 'dprd_provinsi' AND vr.constituency_id = ?
        AND vr.region_id = ? AND vr.scope_level = 'regency' AND vr.value_format = 'candidate_votes'
        AND vr.quality_status = 'usable' AND vr.report_origin IN ('reported', 'reported_child')
      ORDER BY vr.id LIMIT 1`,
    [year, constituencyId, year, constituencyId, regencyId]
  )
  const regencyCandidates = regencyCandidateReport.length ? await query<any>(
    `SELECT v.source_candidate_key, v.candidate_id, v.election_party_id, v.votes,
        c.name, c.ballot_number
      FROM v_candidate_votes v
      LEFT JOIN candidates c ON c.id = v.candidate_id AND c.constituency_id = ?
        AND c.election_year = ? AND c.contest_type = 'dprd_provinsi'
      WHERE v.report_id = ? ORDER BY v.election_party_id, c.ballot_number, v.source_candidate_key`,
    [constituencyId, year, Number(regencyCandidateReport[0].reportId)]
  ) : []
  if (!districts.length) return { regency: region, parties, districts: [] }

  const districtIds = districts.map((district: any) => Number(district.regionId))
  const reports = await query<any>(
    `SELECT vr.id AS reportId, vr.region_id AS regionId, vr.value_format AS valueFormat
      FROM vote_reports vr
      WHERE vr.election_id = ? AND vr.contest_type = 'dprd_provinsi' AND vr.constituency_id = ?
        AND vr.region_id IN (?) AND vr.scope_level = 'district'
        AND vr.value_format IN ('party_components', 'candidate_votes')
        AND ((vr.value_format = 'party_components' AND vr.report_origin = 'reported')
          OR (vr.value_format = 'candidate_votes' AND vr.report_origin IN ('reported', 'reported_child')))
        AND vr.quality_status = 'usable'
      ORDER BY vr.id`,
    [year, constituencyId, districtIds]
  )
  const reportByDistrictAndFormat = new Map<string, number>()
  for (const report of reports) {
    const key = `${Number(report.regionId)}:${report.valueFormat}`
    if (!reportByDistrictAndFormat.has(key)) reportByDistrictAndFormat.set(key, Number(report.reportId))
  }
  const preferredCandidateReports = await query<any>(
    `SELECT vr.id AS reportId, vr.region_id AS regionId
      FROM preferred_vote_reports p
      JOIN vote_reports vr ON vr.id = p.report_id
      WHERE p.election_id = ? AND p.contest_type = 'dprd_provinsi'
        AND p.constituency_key = ? AND p.scope_level = 'district' AND p.metric_family = 'candidate'
        AND vr.election_id = ? AND vr.contest_type = 'dprd_provinsi' AND vr.constituency_id = ?
        AND vr.scope_level = 'district' AND vr.value_format = 'candidate_votes'
        AND vr.quality_status = 'usable' AND vr.report_origin IN ('reported', 'reported_child')
        AND vr.region_id IN (?)
      ORDER BY vr.id`,
    [year, constituencyId, year, constituencyId, districtIds]
  )
  for (const report of preferredCandidateReports) {
    reportByDistrictAndFormat.set(`${Number(report.regionId)}:candidate_votes`, Number(report.reportId))
  }
  const reportIds = [...reportByDistrictAndFormat.values()]
  const partyRows = reportIds.length ? await query<any>(
    `SELECT report_id, election_party_id, total_votes FROM v_party_votes
      WHERE report_id IN (?) AND election_party_id IS NOT NULL`,
    [reportIds]
  ) : []
  const candidateRows = reportIds.length ? await query<any>(
    `SELECT v.report_id, v.candidate_id, v.election_party_id, v.votes,
        v.source_candidate_key, c.name, c.ballot_number
      FROM v_candidate_votes v
      LEFT JOIN candidates c ON c.id = v.candidate_id AND c.constituency_id = ?
        AND c.election_year = ? AND c.contest_type = 'dprd_provinsi'
      WHERE v.report_id IN (?) ORDER BY v.election_party_id, c.ballot_number, v.source_candidate_key`,
    [constituencyId, year, reportIds]
  ) : []

  const districtData = districts.map((district: any) => {
    const regionId = Number(district.regionId)
    const partyReportId = reportByDistrictAndFormat.get(`${regionId}:party_components`)
    const candidateReportId = reportByDistrictAndFormat.get(`${regionId}:candidate_votes`)
    const votes: Record<number, number | null> = Object.fromEntries(parties.map((party: any) => [Number(party.id), null]))
    for (const row of partyRows) {
      if (Number(row.report_id) === partyReportId && row.total_votes != null) votes[Number(row.election_party_id)] = Number(row.total_votes)
    }
    const candidates = candidateReportId ? candidateRows
      .filter((row: any) => Number(row.report_id) === candidateReportId)
      .map((row: any) => ({
        id: row.candidate_id ?? row.source_candidate_key,
        name: row.name ?? `Caleg belum terpetakan (${row.source_candidate_key})`,
        ballotNumber: row.ballot_number == null ? null : Number(row.ballot_number),
        partyId: row.election_party_id == null ? null : Number(row.election_party_id),
        votes: row.votes == null ? null : Number(row.votes)
      })) : []
    return {
      ...district,
      partyVotes: votes,
      partyReportAvailable: Boolean(partyReportId),
      candidateReportAvailable: Boolean(candidateReportId),
      candidates
    }
  })

  return {
    regency: region,
    parties,
    regencyCandidateReportAvailable: Boolean(regencyCandidateReport.length),
    regencyCandidates: regencyCandidates.map((candidate: any) => ({
      id: candidate.candidate_id ?? candidate.source_candidate_key,
      name: candidate.name ?? `Caleg belum terpetakan (${candidate.source_candidate_key})`,
      ballotNumber: candidate.ballot_number == null ? null : Number(candidate.ballot_number),
      partyId: candidate.election_party_id == null ? null : Number(candidate.election_party_id),
      votes: candidate.votes == null ? null : Number(candidate.votes)
    })),
    districts: districtData
  }
}
