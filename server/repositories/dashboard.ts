import { query, queryOne } from '../utils/db'

export async function getDashboardData() {
  // 1. Data Pemilu & status
  const elections = await query<any>(
    `SELECT id, year, kind, name, data_status FROM elections ORDER BY year DESC, id DESC`
  )

  // 2. Statistik Wilayah
  const regionStats = await query<any>(
    `SELECT level, COUNT(*) as total FROM regions WHERE election_year = 2024 GROUP BY level`
  )
  const regionCounts: Record<string, number> = {}
  for (const r of regionStats) {
    regionCounts[r.level] = Number(r.total)
  }

  // 3. Pilpres 2024 Nasional
  const pilpres2024Report = await queryOne<any>(
    `SELECT id, votes_json FROM vote_reports 
     WHERE election_id = 2024 AND contest_type = 'pilpres' AND scope_level = 'national' LIMIT 1`
  )
  const tickets2024 = await query<any>(
    `SELECT source_key, ballot_number, name FROM tickets WHERE election_id = 2024 AND contest_type = 'pilpres' ORDER BY ballot_number`
  )
  let pilpres2024Votes: any[] = []
  if (pilpres2024Report && pilpres2024Report.votes_json) {
    const vj = typeof pilpres2024Report.votes_json === 'string' 
      ? JSON.parse(pilpres2024Report.votes_json) 
      : pilpres2024Report.votes_json
    pilpres2024Votes = tickets2024.map(t => ({
      ballotNumber: t.ballot_number,
      name: t.name,
      votes: Number(vj[t.source_key] || 0)
    }))
  }

  // 4. Pilpres 2019 Nasional
  const pilpres2019Report = await queryOne<any>(
    `SELECT id, votes_json FROM vote_reports 
     WHERE election_id = 2019 AND contest_type = 'pilpres' AND scope_level = 'national' LIMIT 1`
  )
  const tickets2019 = await query<any>(
    `SELECT source_key, ballot_number, name FROM tickets WHERE election_id = 2019 AND contest_type = 'pilpres' ORDER BY ballot_number`
  )
  let pilpres2019Votes: any[] = []
  if (pilpres2019Report && pilpres2019Report.votes_json) {
    const vj = typeof pilpres2019Report.votes_json === 'string' 
      ? JSON.parse(pilpres2019Report.votes_json) 
      : pilpres2019Report.votes_json
    pilpres2019Votes = tickets2019.map(t => ({
      ballotNumber: t.ballot_number,
      name: t.name,
      votes: Number(vj[t.source_key] || 0)
    }))
  }

  // 5. Total Kursi DPR RI 2024
  const dprSeats2024 = await queryOne<any>(
    `SELECT COUNT(id) as total_dapil, COALESCE(SUM(seat_count), 0) as total_seats 
     FROM constituencies WHERE election_year = 2024 AND chamber = 'dpr_ri'`
  )

  return {
    elections,
    regionCounts,
    dprSeats2024: {
      totalDapil: Number(dprSeats2024?.total_dapil || 0),
      totalSeats: Number(dprSeats2024?.total_seats || 0)
    },
    pilpres2024: pilpres2024Votes,
    pilpres2019: pilpres2019Votes
  }
}
