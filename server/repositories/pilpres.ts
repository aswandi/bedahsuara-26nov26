import { query } from '../utils/db'

interface ReportRow { id: number; source_id: number; region_id: number | null; quality_status: string; valid_votes: number | null; votes_json: string | Record<string, number | null> }
interface TicketRow { source_key: string; ballot_number: number | null; name: string }

/** Laporan nasional langsung; lebih dari satu laporan tidak dipilih secara sembarang. */
export async function getPilpresNational(year: number) {
  const elections = await query<{ data_status: string }>(
    `SELECT data_status FROM elections WHERE id = ? AND kind = 'pemilu'`, [year]
  )
  const reports = await query<ReportRow>(
    `SELECT id, source_id, region_id, quality_status, valid_votes, votes_json
       FROM vote_reports WHERE election_id = ? AND contest_type = 'pilpres'
       AND scope_level = 'national' AND value_format = 'ticket_votes' LIMIT 2`, [year]
  )
  const tickets = await query<TicketRow>(
    `SELECT source_key, ballot_number, name FROM tickets
       WHERE election_id = ? AND contest_type = 'pilpres' ORDER BY ballot_number`, [year]
  )
  if (reports.length !== 1) return { status: reports.length ? 'ambiguous' : 'unavailable', electionStatus: elections[0]?.data_status ?? null, report: null, tickets: [] }
  const report = reports[0]!
  const votes = typeof report.votes_json === 'string' ? JSON.parse(report.votes_json) : report.votes_json
  return {
    status: 'available', electionStatus: elections[0]?.data_status ?? null,
    report: { id: report.id, sourceId: report.source_id, regionId: report.region_id, qualityStatus: report.quality_status, validVotes: report.valid_votes == null ? null : Number(report.valid_votes) },
    tickets: tickets.map(t => ({ key: t.source_key, ballotNumber: t.ballot_number, name: t.name, votes: votes?.[t.source_key] == null ? null : Number(votes[t.source_key]) }))
  }
}
