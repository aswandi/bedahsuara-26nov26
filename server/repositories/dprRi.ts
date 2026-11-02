import { query, queryOne } from '../utils/db'
import { sainteLague } from '../utils/sainteLague'
import { PASSED_THRESHOLD_BALLOT, PARLIAMENT_THRESHOLD } from '../utils/threshold'

const CT = 'dpr_ri'

export async function listProvinces(year: number) {
  return query(
    `SELECT r.id, r.name, r.code, r.registered_voters,
            (SELECT COUNT(*) FROM constituencies c WHERE c.election_year = r.election_year AND c.chamber = ? AND c.province_id = r.id) AS dapil_count,
            (SELECT COALESCE(SUM(c.seat_count),0) FROM constituencies c WHERE c.election_year = r.election_year AND c.chamber = ? AND c.province_id = r.id) AS seats
       FROM regions r
      WHERE r.election_year = ? AND r.level = 'province'
      ORDER BY r.code`,
    [CT, CT, year]
  )
}

/** Ringkasan turunan dari laporan dapil; digunakan hanya ketika diminta pada halaman nasional. */
export async function nationalProvinceParties(year: number) {
  const provinces = await listProvinces(year) as any[]
  const parties = await query<any>(
    `SELECT id, ballot_number, name, color FROM election_parties WHERE election_year = ? AND is_local = 0 ORDER BY ballot_number`, [year]
  )
  const dapil = await query<any>(
    `SELECT c.id, c.province_id, c.seat_count,
            (SELECT MIN(v.id) FROM vote_reports v WHERE v.election_id = ? AND v.contest_type = 'dpr_ri'
              AND v.constituency_id = c.id AND v.scope_level = 'constituency'
              AND v.value_format = ? AND v.report_origin = 'reported' AND v.quality_status = 'usable') AS report_id
       FROM constituencies c WHERE c.election_year = ? AND c.chamber = 'dpr_ri'`, [year, year === 2019 ? 'party_totals' : 'party_components', year]
  )
  const reportIds = dapil.map(d => d.report_id).filter(Boolean)
  const rows = reportIds.length ? await query<any>(
    `SELECT report_id, election_party_id, total_votes FROM v_party_votes WHERE report_id IN (?) AND election_party_id IS NOT NULL`, [reportIds]
  ) : []
  const byReport = new Map<number, Record<number, number>>()
  for (const row of rows) {
    if (row.total_votes == null) continue
    const votes = byReport.get(Number(row.report_id)) ?? {}
    votes[Number(row.election_party_id)] = Number(row.total_votes)
    byReport.set(Number(row.report_id), votes)
  }
  const eligible = new Set(parties.filter(p => (PASSED_THRESHOLD_BALLOT[year] ?? []).includes(p.ballot_number)).map(p => Number(p.id)))
  const result = provinces.map(p => ({ ...p, votes: {} as Record<number, number>, partySeats: {} as Record<number, number>, reportedDapil: 0 }))
  const byProvince = new Map(result.map(p => [Number(p.id), p]))
  for (const d of dapil) {
    const province = byProvince.get(Number(d.province_id))
    const votes = byReport.get(Number(d.report_id))
    if (!province || !votes || parties.some(p => votes[p.id] == null)) continue
    province.reportedDapil++
    for (const [id, value] of Object.entries(votes)) province.votes[Number(id)] = (province.votes[Number(id)] ?? 0) + value
    const seats = sainteLague(votes, Number(d.seat_count), eligible).seatsByParty
    for (const [id, count] of Object.entries(seats)) province.partySeats[Number(id)] = (province.partySeats[Number(id)] ?? 0) + count
  }
  return { parties, provinces: result }
}

export async function getProvince(year: number, id: number) {
  const province = await queryOne(
    `SELECT id, name, code FROM regions WHERE election_year = ? AND level = 'province' AND id = ?`,
    [year, id]
  )
  if (!province) return null
  const dapil = await query(
    `SELECT id, code, name, seat_count FROM constituencies
      WHERE election_year = ? AND chamber = ? AND province_id = ? ORDER BY code`,
    [year, CT, id]
  )
  return { province, dapil }
}

async function pickReport(year: number, constituencyId: number, scope: string, format: string) {
  const row = await queryOne<{ id: number }>(
    `SELECT MIN(id) AS id FROM vote_reports
      WHERE election_id = ? AND contest_type = ? AND constituency_id = ? AND scope_level = ?
        AND value_format = ? AND report_origin = 'reported'`,
    [year, CT, constituencyId, scope, format]
  )
  return row?.id ?? null
}

export async function getDapilDetail(year: number, constituencyId: number) {
  const dapil = await queryOne<any>(
    `SELECT c.id, c.code, c.name, c.seat_count, c.province_id, r.name AS province_name
       FROM constituencies c LEFT JOIN regions r ON r.id = c.province_id
      WHERE c.election_year = ? AND c.chamber = ? AND c.id = ?`,
    [year, CT, constituencyId]
  )
  if (!dapil) return null

  const parties = await query<any>(
    `SELECT id, ballot_number, name, color FROM election_parties WHERE election_year = ? AND is_local = 0 ORDER BY ballot_number`,
    [year]
  )
  const partyReportId = await pickReport(year, constituencyId, 'constituency', 'party_components')
  const votes: Record<number, { party: number; total: number }> = {}
  if (partyReportId) {
    const rows = await query<any>(
      `SELECT election_party_id, party_votes, total_votes FROM v_party_votes WHERE report_id = ? AND election_party_id IS NOT NULL`,
      [partyReportId]
    )
    for (const r of rows) votes[r.election_party_id] = { party: Number(r.party_votes ?? 0), total: Number(r.total_votes ?? 0) }
  }

  // Ambang 4%: penetapan resmi per nomor urut (lihat server/utils/threshold.ts)
  const passed = new Set(
    parties.filter((p) => (PASSED_THRESHOLD_BALLOT[year] ?? []).includes(p.ballot_number)).map((p) => p.id)
  )
  const totals: Record<number, number> = {}
  for (const [id, v] of Object.entries(votes)) totals[Number(id)] = v.total
  const calc = sainteLague(totals, dapil.seat_count, passed)

  // Caleg per partai
  const candReportId = await pickReport(year, constituencyId, 'constituency', 'candidate_votes')
  const cands = candReportId
    ? await query<any>(
        `SELECT v.candidate_id AS id, c.name, c.ballot_number, v.election_party_id, v.votes, c.elected_status
           FROM v_candidate_votes v JOIN candidates c ON c.id = v.candidate_id
          WHERE v.report_id = ?`,
        [candReportId]
      )
    : []

  const partyBlocks = parties
    .filter((p) => votes[p.id] || cands.some((c) => c.election_party_id === p.id))
    .map((p) => {
      const seats = calc.seatsByParty[p.id] ?? 0
      const list = cands
        .filter((c) => c.election_party_id === p.id)
        .sort((a, b) => b.votes - a.votes)
      const sum = list.reduce((s, c) => s + Number(c.votes), 0)
      return {
        ...p,
        partyVotes: votes[p.id]?.party ?? 0,
        totalVotes: votes[p.id]?.total ?? 0,
        passedThreshold: passed.has(p.id),
        seats,
        candidates: list.map((c, i) => ({
          id: c.id,
          name: c.name,
          ballotNumber: c.ballot_number,
          votes: Number(c.votes),
          pct: sum ? (Number(c.votes) / sum) * 100 : 0,
          elected: i < seats,
          officialStatus: c.elected_status
        }))
      }
    })

  const grand = Object.values(votes).reduce((s, v) => s + v.total, 0)

  return {
    dapil,
    threshold: PARLIAMENT_THRESHOLD,
    grandTotal: grand,
    divisors: calc.divisors,
    tie: calc.tie,
    cells: calc.cells,
    parties: partyBlocks
  }
}

/** Suara partai per Kabupaten/Kota di dalam dapil (data tingkat kabupaten apa adanya). */
export async function getDapilRegencies(year: number, constituencyId: number) {
  const reports = await query<any>(
    `SELECT region_id, MIN(id) AS report_id FROM vote_reports
      WHERE election_id = ? AND contest_type = ? AND constituency_id = ? AND scope_level = 'regency'
        AND value_format = 'party_components' AND report_origin = 'reported'
      GROUP BY region_id`,
    [year, CT, constituencyId]
  )
  if (!reports.length) return []
  const ids = reports.map((r) => r.report_id)
  const rows = await query<any>(
    `SELECT report_id, election_party_id, total_votes FROM v_party_votes WHERE report_id IN (?) AND election_party_id IS NOT NULL`,
    [ids]
  )
  const names = await query<any>(`SELECT id, name FROM regions WHERE id IN (?)`, [reports.map((r) => r.region_id)])
  const nameOf = new Map(names.map((n) => [n.id, n.name]))
  return reports.map((r) => {
    const votes: Record<number, number> = {}
    for (const x of rows) if (x.report_id === r.report_id) votes[x.election_party_id] = Number(x.total_votes ?? 0)
    return {
      regionId: r.region_id,
      name: nameOf.get(r.region_id) ?? String(r.region_id),
      total: Object.values(votes).reduce((a, b) => a + b, 0),
      votes
    }
  }).sort((a, b) => a.name.localeCompare(b.name))
}

/** Detail tingkat Kabupaten/Kota dalam Dapil DPR RI */
export async function getRegencyDetail(year: number, constituencyId: number, regencyId: number) {
  const regency = await queryOne<any>(
    `SELECT r.id, r.name, r.code, r.parent_id, c.name as dapil_name, c.id as dapil_id
       FROM regions r
       JOIN constituencies c ON c.id = ?
      WHERE r.election_year = ? AND r.id = ? AND r.level = 'regency'`,
    [constituencyId, year, regencyId]
  )
  if (!regency) return null

  const parties = await query<any>(
    `SELECT id, ballot_number, name, color FROM election_parties WHERE election_year = ? AND is_local = 0 ORDER BY ballot_number`,
    [year]
  )

  // Suara partai tingkat kabupaten apa adanya
  const partyReport = await queryOne<any>(
    `SELECT id FROM vote_reports 
      WHERE election_id = ? AND contest_type = ? AND constituency_id = ? AND region_id = ? 
        AND scope_level = 'regency' AND value_format = 'party_components' AND report_origin = 'reported' LIMIT 1`,
    [year, CT, constituencyId, regencyId]
  )
  const votes: Record<number, { party: number; total: number }> = {}
  if (partyReport) {
    const rows = await query<any>(
      `SELECT election_party_id, party_votes, total_votes FROM v_party_votes WHERE report_id = ? AND election_party_id IS NOT NULL`,
      [partyReport.id]
    )
    for (const r of rows) votes[r.election_party_id] = { party: Number(r.party_votes ?? 0), total: Number(r.total_votes ?? 0) }
  }

  // Suara caleg tingkat kabupaten
  const candReport = await queryOne<any>(
    `SELECT id FROM vote_reports 
      WHERE election_id = ? AND contest_type = ? AND constituency_id = ? AND region_id = ? 
        AND scope_level = 'regency' AND value_format = 'candidate_votes' LIMIT 1`,
    [year, CT, constituencyId, regencyId]
  )
  const cands = candReport
    ? await query<any>(
        `SELECT v.candidate_id AS id, c.name, c.ballot_number, v.election_party_id, v.votes, c.elected_status
           FROM v_candidate_votes v JOIN candidates c ON c.id = v.candidate_id
          WHERE v.report_id = ?`,
        [candReport.id]
      )
    : []

  const partyBlocks = parties.map((p) => {
    const list = cands.filter((c) => c.election_party_id === p.id).sort((a, b) => b.votes - a.votes)
    const sum = list.reduce((s, c) => s + Number(c.votes), 0)
    return {
      ...p,
      partyVotes: votes[p.id]?.party ?? 0,
      totalVotes: votes[p.id]?.total ?? 0,
      candidates: list.map((c) => ({
        id: c.id,
        name: c.name,
        ballotNumber: c.ballot_number,
        votes: Number(c.votes),
        pct: sum ? (Number(c.votes) / sum) * 100 : 0,
        officialStatus: c.elected_status
      }))
    }
  })

  // Daftar Kecamatan (District) di bawah Kabupaten ini
  const districts = await query<any>(
    `SELECT r.id, r.name, r.code,
            COALESCE((SELECT MIN(v.id) FROM vote_reports v 
                      WHERE v.election_id = ? AND v.contest_type = ? AND v.constituency_id = ? AND v.region_id = r.id 
                        AND v.scope_level = 'district' AND v.value_format = 'party_components' AND v.report_origin = 'reported'), 0) as report_id
       FROM regions r
      WHERE r.election_year = ? AND r.parent_id = ? AND r.level = 'district'
      ORDER BY r.name`,
    [year, CT, constituencyId, year, regencyId]
  )

  const districtReportIds = districts.map(d => d.report_id).filter(id => id > 0)
  let districtVotesRows: any[] = []
  if (districtReportIds.length) {
    districtVotesRows = await query<any>(
      `SELECT report_id, election_party_id, total_votes FROM v_party_votes WHERE report_id IN (?) AND election_party_id IS NOT NULL`,
      [districtReportIds]
    )
  }

  const districtList = districts.map(d => {
    const dVotes: Record<number, number> = {}
    for (const x of districtVotesRows) {
      if (x.report_id === d.report_id) dVotes[x.election_party_id] = Number(x.total_votes ?? 0)
    }
    return {
      regionId: d.id,
      name: d.name,
      total: Object.values(dVotes).reduce((a, b) => a + b, 0),
      votes: dVotes
    }
  })

  const grand = Object.values(votes).reduce((s, v) => s + v.total, 0)

  return {
    regency,
    parties: partyBlocks,
    grandTotal: grand,
    districts: districtList
  }
}

/** Detail tingkat Kecamatan (District) dalam Dapil DPR RI */
export async function getDistrictDetail(year: number, constituencyId: number, districtId: number) {
  const district = await queryOne<any>(
    `SELECT r.id, r.name, r.code, r.parent_id, reg.name as regency_name, reg.id as regency_id, c.name as dapil_name, c.id as dapil_id
       FROM regions r
       JOIN regions reg ON reg.id = r.parent_id
       JOIN constituencies c ON c.id = ?
      WHERE r.election_year = ? AND r.id = ? AND r.level = 'district'`,
    [constituencyId, year, districtId]
  )
  if (!district) return null

  const parties = await query<any>(
    `SELECT id, ballot_number, name, color FROM election_parties WHERE election_year = ? AND is_local = 0 ORDER BY ballot_number`,
    [year]
  )

  // Suara partai tingkat kecamatan apa adanya
  const partyReport = await queryOne<any>(
    `SELECT id FROM vote_reports 
      WHERE election_id = ? AND contest_type = ? AND constituency_id = ? AND region_id = ? 
        AND scope_level = 'district' AND value_format = 'party_components' AND report_origin = 'reported' LIMIT 1`,
    [year, CT, constituencyId, districtId]
  )
  const votes: Record<number, { party: number; total: number }> = {}
  if (partyReport) {
    const rows = await query<any>(
      `SELECT election_party_id, party_votes, total_votes FROM v_party_votes WHERE report_id = ? AND election_party_id IS NOT NULL`,
      [partyReport.id]
    )
    for (const r of rows) votes[r.election_party_id] = { party: Number(r.party_votes ?? 0), total: Number(r.total_votes ?? 0) }
  }

  // Suara caleg tingkat kecamatan
  const candReport = await queryOne<any>(
    `SELECT id FROM vote_reports 
      WHERE election_id = ? AND contest_type = ? AND constituency_id = ? AND region_id = ? 
        AND scope_level = 'district' AND value_format = 'candidate_votes' LIMIT 1`,
    [year, CT, constituencyId, districtId]
  )
  const cands = candReport
    ? await query<any>(
        `SELECT v.candidate_id AS id, c.name, c.ballot_number, v.election_party_id, v.votes, c.elected_status
           FROM v_candidate_votes v JOIN candidates c ON c.id = v.candidate_id
          WHERE v.report_id = ?`,
        [candReport.id]
      )
    : []

  const partyBlocks = parties.map((p) => {
    const list = cands.filter((c) => c.election_party_id === p.id).sort((a, b) => b.votes - a.votes)
    const sum = list.reduce((s, c) => s + Number(c.votes), 0)
    return {
      ...p,
      partyVotes: votes[p.id]?.party ?? 0,
      totalVotes: votes[p.id]?.total ?? 0,
      candidates: list.map((c) => ({
        id: c.id,
        name: c.name,
        ballotNumber: c.ballot_number,
        votes: Number(c.votes),
        pct: sum ? (Number(c.votes) / sum) * 100 : 0,
        officialStatus: c.elected_status
      }))
    }
  })

  // Daftar Desa / Kelurahan
  const villages = await query<any>(
    `SELECT r.id, r.name, r.code,
            COALESCE((SELECT MIN(v.id) FROM vote_reports v 
                      WHERE v.election_id = ? AND v.contest_type = ? AND v.constituency_id = ? AND v.region_id = r.id 
                        AND v.scope_level = 'village' AND v.value_format = 'party_components' AND v.report_origin = 'reported'), 0) as report_id
       FROM regions r
      WHERE r.election_year = ? AND r.parent_id = ? AND r.level = 'village'
      ORDER BY r.name`,
    [year, CT, constituencyId, year, districtId]
  )

  const villageReportIds = villages.map(v => v.report_id).filter(id => id > 0)
  let villageVotesRows: any[] = []
  if (villageReportIds.length) {
    villageVotesRows = await query<any>(
      `SELECT report_id, election_party_id, total_votes FROM v_party_votes WHERE report_id IN (?) AND election_party_id IS NOT NULL`,
      [villageReportIds]
    )
  }

  const villageList = villages.map(v => {
    const vVotes: Record<number, number> = {}
    for (const x of villageVotesRows) {
      if (x.report_id === v.report_id) vVotes[x.election_party_id] = Number(x.total_votes ?? 0)
    }
    return {
      regionId: v.id,
      name: v.name,
      total: Object.values(vVotes).reduce((a, b) => a + b, 0),
      votes: vVotes
    }
  })

  return {
    district,
    parties: partyBlocks,
    grandTotal: Object.values(votes).reduce((s, v) => s + v.total, 0),
    villages: villageList
  }
}

/** Detail tingkat Desa (Village) / TPS list */
export async function getVillageDetail(year: number, constituencyId: number, villageId: number) {
  const village = await queryOne<any>(
    `SELECT r.id, r.name, r.code, r.parent_id, dist.name as district_name, dist.id as district_id,
            reg.name as regency_name, reg.id as regency_id, c.name as dapil_name, c.id as dapil_id
       FROM regions r
       JOIN regions dist ON dist.id = r.parent_id
       JOIN regions reg ON reg.id = dist.parent_id
       JOIN constituencies c ON c.id = ?
      WHERE r.election_year = ? AND r.id = ? AND r.level = 'village'`,
    [constituencyId, year, villageId]
  )
  if (!village) return null

  const parties = await query<any>(
    `SELECT id, ballot_number, name, color FROM election_parties WHERE election_year = ? AND is_local = 0 ORDER BY ballot_number`,
    [year]
  )

  const partyReport = await queryOne<any>(
    `SELECT id FROM vote_reports 
      WHERE election_id = ? AND contest_type = ? AND constituency_id = ? AND region_id = ? 
        AND scope_level = 'village' AND value_format = 'party_components' AND report_origin = 'reported' LIMIT 1`,
    [year, CT, constituencyId, villageId]
  )
  const votes: Record<number, { party: number; total: number }> = {}
  if (partyReport) {
    const rows = await query<any>(
      `SELECT election_party_id, party_votes, total_votes FROM v_party_votes WHERE report_id = ? AND election_party_id IS NOT NULL`,
      [partyReport.id]
    )
    for (const r of rows) votes[r.election_party_id] = { party: Number(r.party_votes ?? 0), total: Number(r.total_votes ?? 0) }
  }

  // TPS list (paginasi default sampai 100 TPS per desa)
  const tpsList = await query<any>(
    `SELECT r.id, r.name, r.code
       FROM regions r
      WHERE r.election_year = ? AND r.parent_id = ? AND r.level = 'tps'
      ORDER BY r.code ASC LIMIT 200`,
    [year, villageId]
  )

  return {
    village,
    parties: parties.map(p => ({ ...p, totalVotes: votes[p.id]?.total ?? 0 })),
    grandTotal: Object.values(votes).reduce((s, v) => s + v.total, 0),
    tpsList
  }
}

