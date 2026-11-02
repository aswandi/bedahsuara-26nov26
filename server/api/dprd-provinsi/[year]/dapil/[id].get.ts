import { nationalDprdProvinsi } from '../../../../repositories/dprdProvinsi'
import { sainteLague } from '../../../../utils/sainteLague'
import { query } from '../../../../utils/db'
import { savedSeatsMatch, type SavedSeat } from '../../../../utils/savedSeatAllocation'

export default defineEventHandler(async (event) => {
  const year = Number(getRouterParam(event, 'year'))
  const id = Number(getRouterParam(event, 'id'))
  if (year !== 2024 || !Number.isSafeInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Parameter tidak valid' })
  }

  // Gunakan sumber dan aturan rekonsiliasi yang sama dengan tabel daftar dapil.
  const summary = await nationalDprdProvinsi(year)
  const dapil = summary.dapil.find((row: any) => Number(row.id) === id)
  if (!dapil) throw createError({ statusCode: 404, statusMessage: 'Dapil tidak ditemukan' })

  const province = summary.provinces.find((row: any) => Number(row.id) === Number(dapil.province_id))
  const parties = summary.parties.filter((party: any) => !party.is_local || province?.name === 'ACEH')
  if (!dapil.complete) return { province, dapil, parties, available: false }

  // Ambil laporan suara partai yang memang tercatat pada tingkat kabupaten/kota
  // untuk dapil ini. Nilai ini tetap per kabupaten; tidak diturunkan dari TPS.
  const regencyReports = await query<any>(
    `SELECT vr.id AS reportId, vr.region_id AS regionId, r.name AS regionName
      FROM vote_reports vr
      JOIN regions r ON r.id = vr.region_id AND r.election_year = vr.election_id AND r.level = 'regency'
      WHERE vr.election_id = ? AND vr.contest_type = 'dprd_provinsi'
        AND vr.constituency_id = ? AND vr.scope_level = 'regency'
        AND vr.value_format = 'party_components' AND vr.report_origin = 'reported'
        AND vr.quality_status = 'usable'
      ORDER BY r.name, vr.id`,
    [year, id]
  )
  const regencyVoteRows = regencyReports.length ? await query<any>(
    `SELECT report_id, election_party_id, total_votes FROM v_party_votes
      WHERE report_id IN (?) AND election_party_id IS NOT NULL`,
    [regencyReports.map((report: any) => Number(report.reportId))]
  ) : []
  const votesByRegencyReport = new Map<number, Map<number, number>>()
  for (const row of regencyVoteRows) {
    if (row.total_votes == null) continue
    const votes = votesByRegencyReport.get(Number(row.report_id)) ?? new Map<number, number>()
    votes.set(Number(row.election_party_id), Number(row.total_votes))
    votesByRegencyReport.set(Number(row.report_id), votes)
  }
  const regenciesById = new Map<number, any>()
  for (const report of regencyReports) {
    const regionId = Number(report.regionId)
    const regency = regenciesById.get(regionId) ?? {
      regionId,
      regionName: report.regionName,
      complete: true,
      partyVotes: Object.fromEntries(parties.map((party: any) => [Number(party.id), null]))
    }
    const reportVotes = votesByRegencyReport.get(Number(report.reportId))
    for (const party of parties) {
      const partyId = Number(party.id)
      const votes = reportVotes?.get(partyId)
      if (votes == null) regency.complete = false
      else regency.partyVotes[partyId] = (regency.partyVotes[partyId] ?? 0) + votes
    }
    regenciesById.set(regionId, regency)
  }
  const regencyPartyVotes = [...regenciesById.values()].sort((a, b) => a.regionName.localeCompare(b.regionName, 'id'))

  const calculation = sainteLague(
    dapil.votes,
    Number(dapil.seat_count),
    new Set(parties.map((party: any) => Number(party.id)))
  )

  const reports = await query<any>(
    `SELECT value_format, MIN(id) AS report_id FROM vote_reports
      WHERE election_id = ? AND contest_type = 'dprd_provinsi' AND constituency_id = ?
        AND scope_level = 'constituency' AND value_format IN ('party_components', 'candidate_votes')
        AND report_origin = 'reported' AND quality_status = 'usable'
      GROUP BY value_format`,
    [year, id]
  )
  const partyReportId = reports.find((report: any) => report.value_format === 'party_components')?.report_id
  const candidateReportId = reports.find((report: any) => report.value_format === 'candidate_votes')?.report_id

  // Suara kabupaten tetap berlabel kabupaten; jangan dijumlahkan menjadi suara dapil.
  const candidateRegionalReports = candidateReportId ? [] : await query<any>(
    `SELECT vr.id AS reportId, vr.region_id AS regionId, r.name AS regionName
      FROM preferred_vote_reports p
      JOIN vote_reports vr ON vr.id = p.report_id
      JOIN regions r ON r.id = vr.region_id
      WHERE p.election_id = ? AND p.contest_type = 'dprd_provinsi'
        AND p.constituency_key = ? AND p.scope_level = 'regency' AND p.metric_family = 'candidate'
        AND vr.constituency_id = ? AND vr.value_format = 'candidate_votes'
        AND vr.quality_status = 'usable' AND vr.report_origin IN ('reported', 'reported_child')
      ORDER BY r.name`,
    [year, id, id]
  )
  const regionalVotesByCandidate = new Map<number, Record<string, number | null>>()
  if (candidateRegionalReports.length) {
    const regionalRows = await query<any>(
      `SELECT v.candidate_id, v.region_id, v.votes
        FROM v_candidate_votes v JOIN candidates c ON c.id = v.candidate_id
        WHERE v.report_id IN (${candidateRegionalReports.map(() => '?').join(',')})
          AND c.constituency_id = ? AND c.election_year = ? AND c.contest_type = 'dprd_provinsi'`,
      [...candidateRegionalReports.map((report: any) => report.reportId), id, year]
    )
    for (const row of regionalRows) {
      const values = regionalVotesByCandidate.get(Number(row.candidate_id)) ?? {}
      values[String(row.region_id)] = row.votes == null ? null : Number(row.votes)
      regionalVotesByCandidate.set(Number(row.candidate_id), values)
    }
  }

  const partyImageRows = partyReportId ? await query<any>(
    `SELECT election_party_id, party_votes FROM v_party_votes
      WHERE report_id = ? AND election_party_id IS NOT NULL`,
    [partyReportId]
  ) : []
  const partyImageVotes = Object.fromEntries(partyImageRows
    .filter((row: any) => row.party_votes != null)
    .map((row: any) => [Number(row.election_party_id), Number(row.party_votes)]))

  const candidateRows = candidateReportId ? await query<any>(
    `SELECT v.source_candidate_key, v.candidate_id, v.election_party_id, v.votes,
        c.name, c.ballot_number, c.elected_status
      FROM v_candidate_votes v
      LEFT JOIN candidates c ON c.id = v.candidate_id AND c.constituency_id = ?
      WHERE v.report_id = ?
      ORDER BY v.election_party_id, c.ballot_number, v.source_candidate_key`,
    [id, candidateReportId]
  ) : []
  const candidateRoster = await query<any>(
    `SELECT id, name, election_party_id, ballot_number, elected_status
      FROM candidates
      WHERE election_year = ? AND contest_type = 'dprd_provinsi' AND constituency_id = ?
      ORDER BY election_party_id, ballot_number, id`,
    [year, id]
  )
  const votesByCandidate = new Map<number, any>()
  for (const candidate of candidateRows) {
    if (candidate.candidate_id != null) votesByCandidate.set(Number(candidate.candidate_id), candidate)
  }

  const savedRuns = await query<any>(
    `SELECT id, seat_count, rules_json, created_at FROM seat_allocation_runs
      WHERE constituency_id = ? AND input_report_id = ? AND method = 'sainte_lague'
        AND status = 'computed' ORDER BY id DESC LIMIT 1`,
    [id, dapil.components_id ?? dapil.totals_id]
  )
  const savedRun = savedRuns[0]
  const savedSeats = savedRun ? await query<SavedSeat>(
    'SELECT seat_number, election_party_id, divisor, numerator, candidate_id FROM seat_allocations WHERE run_id = ? ORDER BY seat_number',
    [savedRun.id]
  ) : []
  const validSavedSeats = savedRun && Number(savedRun.seat_count) === Number(dapil.seat_count)
    && savedSeatsMatch(savedSeats, calculation.cells, dapil.votes, candidateRoster, Number(dapil.seat_count), calculation.tie)
  const seatsByCandidate = new Map<number, SavedSeat>(validSavedSeats ? savedSeats.map(seat => [Number(seat.candidate_id), seat]) : [])
  const savedRules = savedRun?.rules_json
  const officialDecision = validSavedSeats && savedRules?.officialDecision?.completeOfficialList
    && savedRules?.officialWinners?.length === savedSeats.length
    && savedSeats.every(seat => savedRules.officialWinners.some((winner: any) => Number(winner.candidateId) === Number(seat.candidate_id) && Number(winner.partyId) === Number(seat.election_party_id)))
    ? savedRules.officialDecision : null

  const partiesWithCandidates = parties.map((party: any) => {
    const roster = candidateRoster.filter((candidate: any) => Number(candidate.election_party_id) === Number(party.id))
    const candidates = roster.map((candidate: any) => {
      const vote = votesByCandidate.get(Number(candidate.id))
      return {
        id: Number(candidate.id),
        name: candidate.name,
        ballotNumber: candidate.ballot_number == null ? null : Number(candidate.ballot_number),
        votes: vote?.votes == null ? null : Number(vote.votes),
        regionalVotes: regionalVotesByCandidate.get(Number(candidate.id)) ?? {},
        officialStatus: candidate.elected_status || 'unknown'
      }
    })
    const rosterIds = new Set(roster.map((candidate: any) => Number(candidate.id)))
    for (const candidate of candidateRows.filter((row: any) => Number(row.election_party_id) === Number(party.id) && (row.candidate_id == null || !rosterIds.has(Number(row.candidate_id))))) {
      candidates.push({
        id: candidate.candidate_id ?? candidate.source_candidate_key,
        name: candidate.name || `Caleg belum terpetakan (${candidate.source_candidate_key})`,
        ballotNumber: candidate.ballot_number == null ? null : Number(candidate.ballot_number),
        votes: candidate.votes == null ? null : Number(candidate.votes),
        regionalVotes: regionalVotesByCandidate.get(Number(candidate.candidate_id)) ?? {},
        officialStatus: candidate.elected_status || 'unknown'
      })
    }
    const completeCandidateVotes = candidates.length > 0 && candidates.every((candidate: any) => candidate.votes != null)
    candidates.sort((a: any, b: any) => (b.votes ?? -1) - (a.votes ?? -1) || (a.ballotNumber ?? Infinity) - (b.ballotNumber ?? Infinity))
    const seats = Number(calculation.seatsByParty[party.id] ?? 0)
    return {
      ...party,
      totalVotes: Number(dapil.votes[party.id] ?? 0),
      partyImageVotes: partyImageVotes[Number(party.id)] ?? null,
      seats,
      candidateVoteAvailable: Boolean(candidateReportId),
      candidates: candidates.map((candidate: any, index: number) => {
        const calculatedElected = completeCandidateVotes ? index < seats : null
        const officialElected = candidate.officialStatus === 'elected' ? true : candidate.officialStatus === 'not_elected' ? false : null
        const elected = officialElected ?? calculatedElected
        return {
          ...candidate,
          seatNumber: seatsByCandidate.get(Number(candidate.id))?.seat_number ?? null,
          partySeatNumber: seatsByCandidate.has(Number(candidate.id)) ? (Number(seatsByCandidate.get(Number(candidate.id))!.divisor) + 1) / 2 : null,
          elected,
          officialElected,
          calculatedElected,
          statusSource: officialElected != null ? 'official' : calculatedElected != null ? 'calculation' : 'unavailable',
          statusConflict: calculatedElected != null && officialElected != null && calculatedElected !== officialElected
        }
      })
    }
  })

  const unmappedCandidates = candidateRoster
    .filter((candidate: any) => candidate.election_party_id == null)
    .map((candidate: any) => {
      const vote = votesByCandidate.get(Number(candidate.id))
      return {
        id: Number(candidate.id),
        name: candidate.name,
        ballotNumber: candidate.ballot_number == null ? null : Number(candidate.ballot_number),
        votes: vote?.votes == null ? null : Number(vote.votes),
        regionalVotes: regionalVotesByCandidate.get(Number(candidate.id)) ?? {}
      }
    })

  return {
    province,
    dapil,
    parties: partiesWithCandidates,
    regencyPartyVotes,
    candidateReportAvailable: Boolean(candidateReportId),
    candidateRegionalReports,
    candidateRosterAvailable: candidateRoster.length > 0,
    officialDecision,
    allocationRunId: validSavedSeats ? Number(savedRun.id) : null,
    unmappedCandidates,
    divisors: calculation.divisors,
    cells: calculation.cells,
    tie: calculation.tie,
    grandTotal: parties.reduce((sum: number, party: any) => sum + Number(dapil.votes[party.id] ?? 0), 0),
    available: true
  }
})
