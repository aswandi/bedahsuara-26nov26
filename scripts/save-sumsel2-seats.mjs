// Otorisasi pemilik dalam chat: simpan status kursi dapil 5038.
// Preview: node --env-file=.env --experimental-strip-types scripts/save-sumsel2-seats.mjs
// Simpan: tambahkan --apply. Tidak dijalankan oleh endpoint publik.
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import mysql from 'mysql2/promise'
import { sainteLague } from '../server/utils/sainteLague.ts'

const manifest = JSON.parse(await readFile(new URL('./data/sumsel2-elected-2024.json', import.meta.url), 'utf8'))
const apply = process.argv.includes('--apply')
const db = await mysql.createConnection({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT), database: process.env.DB_NAME,
  user: process.env.DB_USER, password: process.env.DB_PASSWORD
})
const rows = async (sql, params = []) => (await db.query(sql, params))[0]
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
try {
  await db.query(apply ? 'START TRANSACTION' : 'START TRANSACTION READ ONLY')
  const [dapil] = await rows('SELECT * FROM constituencies WHERE id = ?', [manifest.constituencyId])
  assert.equal(dapil.election_year, manifest.electionYear)
  assert.equal(dapil.chamber, manifest.contestType)
  assert.equal(dapil.code, manifest.constituencyCode)
  assert.equal(dapil.seat_count, manifest.seatCount)
  const reports = await rows('SELECT * FROM vote_reports WHERE id IN (?, ?, ?)', [manifest.inputReportId, manifest.comparisonReportId, manifest.candidateCrossCheckReportId])
  for (const report of reports) {
    assert.equal(report.constituency_id, dapil.id)
    assert.equal(report.election_id, manifest.electionYear)
    assert.equal(report.contest_type, manifest.contestType)
    assert.equal(report.quality_status, 'usable')
  }
  assert.equal(reports.length, 3)
  const input = reports.find(report => Number(report.id) === manifest.inputReportId)
  const comparison = reports.find(report => Number(report.id) === manifest.comparisonReportId)
  const crossCheck = reports.find(report => Number(report.id) === manifest.candidateCrossCheckReportId)
  assert.equal(input.scope_level, 'constituency')
  assert.equal(input.value_format, 'party_components')
  assert.equal(comparison.scope_level, 'constituency')
  assert.equal(comparison.value_format, 'party_totals')
  assert.equal(crossCheck.value_format, 'candidate_votes')
  const parties = await rows('SELECT id, source_key, ballot_number FROM election_parties WHERE election_year = ? AND is_local = 0 ORDER BY ballot_number', [manifest.electionYear])
  const votes = {}
  for (const party of parties) {
    const value = input.votes_json[party.source_key]?.jml_suara_total
    assert(Number.isSafeInteger(value) && value >= 0, 'Suara partai tidak lengkap')
    assert.equal(value, comparison.votes_json[party.source_key], 'Versi suara partai berbeda')
    votes[party.id] = value
  }
  const roster = await rows(`SELECT * FROM candidates WHERE election_year = ? AND contest_type = ? AND constituency_id = ? ORDER BY id${apply ? ' FOR UPDATE' : ''}`, [manifest.electionYear, manifest.contestType, dapil.id])
  assert.equal(roster.length, manifest.rosterCount)
  const calculation = sainteLague(votes, dapil.seat_count, new Set(parties.filter(p => roster.some(c => c.election_party_id === p.id)).map(p => p.id)))
  assert.equal(calculation.tie, false, 'Seri kursi memerlukan pemeriksaan persebaran suara KPU')
  const verifiedWinners = manifest.winners.map(winner => {
    const party = parties.find(p => p.ballot_number === winner.partyBallot)
    const matches = roster.filter(c => c.source_key === winner.sourceKey && c.election_party_id === party?.id && c.ballot_number === winner.candidateBallot)
    assert.equal(matches.length, 1, 'Pemetaan identitas caleg tidak tunggal')
    const candidate = matches[0]
    assert.equal(crossCheck.votes_json[candidate.source_key], winner.votes, 'Suara silang tidak sesuai lampiran KPU')
    return { ...winner, candidateId: candidate.id, partyId: party.id }
  })
  for (const party of parties) {
    assert.equal(verifiedWinners.filter(w => w.partyId === party.id).length, calculation.seatsByParty[party.id] ?? 0, 'Kursi partai berbeda dari daftar resmi')
  }
  const assignments = calculation.cells.filter(cell => cell.seatNo != null).sort((a, b) => a.seatNo - b.seatNo).map(cell => {
    const partyWinners = verifiedWinners.filter(w => w.partyId === cell.partyId).sort((a, b) => b.votes - a.votes)
    const winner = partyWinners[(cell.divisor - 1) / 2]
    assert(winner, 'Kursi tidak memiliki caleg resmi')
    return { seatNumber: cell.seatNo, partyId: cell.partyId, divisor: cell.divisor, numerator: votes[cell.partyId], candidateId: winner.candidateId, name: winner.name }
  })
  assert.equal(assignments.length, dapil.seat_count)
  const winnerIds = new Set(verifiedWinners.map(w => w.candidateId))
  for (const candidate of roster) {
    assert(['unknown', winnerIds.has(candidate.id) ? 'elected' : 'not_elected'].includes(candidate.elected_status), 'Status sebelumnya berbeda; perlu rekonsiliasi')
  }
  const fingerprint = hash({ manifest, votes, roster: roster.map(c => [c.id, c.source_key, c.election_party_id, c.ballot_number]) })
  const existing = await rows(`SELECT id FROM seat_allocation_runs WHERE constituency_id = ? AND status = 'computed' AND JSON_UNQUOTE(JSON_EXTRACT(rules_json, '$.fingerprint')) = ?`, [dapil.id, fingerprint])
  const preview = { constituencyId: dapil.id, candidateCount: roster.length, elected: winnerIds.size, notElected: roster.length - winnerIds.size, assignments, fingerprint }
  if (!apply) {
    console.log(JSON.stringify({ mode: 'preview', ...preview }, null, 2))
    await db.rollback()
  } else if (existing.length) {
    const saved = await rows('SELECT * FROM seat_allocations WHERE run_id = ? ORDER BY seat_number', [existing[0].id])
    assert.deepEqual(saved.map(s => [s.seat_number, s.candidate_id]), assignments.map(a => [a.seatNumber, a.candidateId]))
    assert(roster.every(c => c.elected_status === (winnerIds.has(c.id) ? 'elected' : 'not_elected')))
    await db.rollback()
    console.log(JSON.stringify({ mode: 'already_saved', runId: existing[0].id, ...preview }, null, 2))
  } else {
    const rules = {
      fingerprint, ruleVersion: 'pkpu-6-2024-official-match-v1', rulesUrl: manifest.rulesUrl,
      thresholdPercent: 0, officialDecision: manifest.officialDecision, officialWinners: verifiedWinners,
      candidateCrossCheckReportId: manifest.candidateCrossCheckReportId,
      candidateCrossCheckScope: crossCheck.scope_level,
      inputHashes: reports.map(r => ({ reportId: Number(r.id), votesHash: hash(r.votes_json) })),
      seatNumberMeaning: 'Urutan alokasi Sainte-Lague dapil, bukan nomor urut lampiran keputusan',
      previousCandidateStatuses: roster.map(c => ({ id: c.id, electedStatus: c.elected_status }))
    }
    await mkdir(new URL('../docs/audits/', import.meta.url), { recursive: true })
    await writeFile(new URL(`../docs/audits/sumsel2-seats-${fingerprint.slice(0, 12)}-before.json`, import.meta.url), JSON.stringify({ manifest, preview, previousCandidateStatuses: rules.previousCandidateStatuses }, null, 2))
    const inserted = await rows(`INSERT INTO seat_allocation_runs (constituency_id,input_report_id,seat_count,method,rules_json,status) VALUES (?,?,?,'sainte_lague',?,'computed')`, [dapil.id, input.id, dapil.seat_count, JSON.stringify(rules)])
    for (const assignment of assignments) {
      await rows('INSERT INTO seat_allocations (run_id,seat_number,election_party_id,divisor,numerator,candidate_id) VALUES (?,?,?,?,?,?)', [inserted.insertId, assignment.seatNumber, assignment.partyId, assignment.divisor, assignment.numerator, assignment.candidateId])
    }
    await rows(`UPDATE candidates SET elected_status = CASE WHEN id IN (${[...winnerIds].map(() => '?').join(',')}) THEN 'elected' ELSE 'not_elected' END WHERE election_year = ? AND contest_type = ? AND constituency_id = ?`, [...winnerIds, manifest.electionYear, manifest.contestType, dapil.id])
    const check = await rows('SELECT elected_status,COUNT(*) n FROM candidates WHERE constituency_id = ? GROUP BY elected_status', [dapil.id])
    assert.equal(Number(check.find(r => r.elected_status === 'elected')?.n), winnerIds.size)
    assert.equal(Number(check.find(r => r.elected_status === 'not_elected')?.n), roster.length - winnerIds.size)
    await db.commit()
    console.log(JSON.stringify({ mode: 'saved', runId: inserted.insertId, ...preview }, null, 2))
  }
} catch (error) {
  await db.rollback()
  throw error
} finally {
  await db.end()
}
