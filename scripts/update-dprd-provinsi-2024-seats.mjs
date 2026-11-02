// Preview: node --env-file=.env --experimental-strip-types scripts/update-dprd-provinsi-2024-seats.mjs
// Apply only verified KPU-result dapils: add --apply.
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import mysql from 'mysql2/promise'
import { sainteLague } from '../server/utils/sainteLague.ts'

const apply = process.argv.includes('--apply')
const parsed = JSON.parse(await readFile(new URL('./data/dprd-provinsi-2024-kpu-results.json', import.meta.url), 'utf8'))
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')
const roman = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12, XIII: 13, XIV: 14, XV: 15 }
const romanize = value => value.replace(/\b(X{0,3}(?:IX|IV|V?I{1,3}))\s*$/i, (_, n) => String(roman[n.toUpperCase()] ?? n))
const closeName = (a, b) => {
  const left = normalize(a).replaceAll(' ', '')
  const right = normalize(b).replaceAll(' ', '')
  if (left === right) return 1
  const row = Array.from({ length: right.length + 1 }, (_, i) => i)
  for (let i = 1; i <= left.length; i++) {
    let diagonal = row[0]
    row[0] = i
    for (let j = 1; j <= right.length; j++) {
      const old = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (left[i - 1] === right[j - 1] ? 0 : 1))
      diagonal = old
    }
  }
  return 1 - row[right.length] / Math.max(left.length, right.length, 1)
}

const db = await mysql.createConnection({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT), database: process.env.DB_NAME,
  user: process.env.DB_USER, password: process.env.DB_PASSWORD
})
const rows = async (sql, params = []) => (await db.query(sql, params))[0]

try {
  await db.query(apply ? 'START TRANSACTION' : 'START TRANSACTION READ ONLY')
  const constituencies = await rows(`SELECT * FROM constituencies WHERE election_year = 2024 AND chamber = 'dprd_provinsi' ORDER BY id`)
  const provinces = await rows(`SELECT id, name FROM regions WHERE election_year = 2024 AND level = 'province'`)
  const roster = await rows(`SELECT c.*, p.ballot_number AS party_ballot, p.source_key AS party_source_key
    FROM candidates c LEFT JOIN election_parties p ON p.id = c.election_party_id
    WHERE c.election_year = 2024 AND c.contest_type = 'dprd_provinsi' ORDER BY c.constituency_id, c.election_party_id, c.ballot_number`)
  const parties = await rows(`SELECT * FROM election_parties WHERE election_year = 2024 ORDER BY ballot_number`)
  const reports = await rows(`SELECT id, constituency_id, value_format, quality_status, report_origin, votes_json
    FROM vote_reports WHERE election_id = 2024 AND contest_type = 'dprd_provinsi'
      AND scope_level = 'constituency' AND quality_status = 'usable' AND report_origin = 'reported'
    ORDER BY constituency_id, value_format, id`)
  const savedRuns = await rows(`SELECT s.id, s.constituency_id, s.status, s.rules_json
    FROM seat_allocation_runs s JOIN constituencies c ON c.id = s.constituency_id
    WHERE c.election_year = 2024 AND c.chamber = 'dprd_provinsi'`)

  const provinceByName = new Map(provinces.map(p => [normalize(p.name), Number(p.id)]))
  const constituencyByName = new Map(constituencies.map(c => [`${c.province_id}|${normalize(c.name)}`, c]))
  const candidatesByKey = new Map()
  const candidatesByConstituency = new Map()
  for (const candidate of roster) {
    const key = `${candidate.constituency_id}|${candidate.party_ballot}|${candidate.ballot_number}`
    const list = candidatesByKey.get(key) ?? []
    list.push(candidate)
    candidatesByKey.set(key, list)
    const local = candidatesByConstituency.get(Number(candidate.constituency_id)) ?? []
    local.push(candidate)
    candidatesByConstituency.set(Number(candidate.constituency_id), local)
  }

  const provinceForFile = file => {
    let name = file.replace(/^L5\.\d+_/i, '').replace(/\.pdf$/i, '').replaceAll('_', ' ')
    if (name === 'BANGKA BELITUNG') name = 'KEPULAUAN BANGKA BELITUNG'
    if (name === 'DI YOGYAKARTA') name = 'DAERAH ISTIMEWA YOGYAKARTA'
    return provinceByName.get(normalize(name)) ?? null
  }
  const labelForDatabase = label => {
    let value = String(label).replace(/\([^)]*\)/g, '').trim().toUpperCase()
    value = value.replace(/^JATENG\b/, 'JAWA TENGAH').replace(/^JATIM\b/, 'JAWA TIMUR')
    return romanize(value)
  }

  const sourceByConstituency = new Map()
  const unresolvedLabels = []
  for (const document of parsed.documents) {
    const provinceId = provinceForFile(document.file)
    if (!provinceId) {
      unresolvedLabels.push({ file: document.file, reason: 'provinsi PDF tidak terpetakan' })
      continue
    }
    for (const candidate of document.candidateRows) {
      const label = labelForDatabase(candidate.dapil)
      let constituency = constituencyByName.get(`${provinceId}|${normalize(label)}`)
      if (!constituency) {
        unresolvedLabels.push({ file: document.file, dapil: candidate.dapil, reason: 'nama dapil tidak cocok' })
        continue
      }
      const list = sourceByConstituency.get(Number(constituency.id)) ?? []
      list.push({ ...candidate, file: document.file, sha256: document.sha256 })
      sourceByConstituency.set(Number(constituency.id), list)
    }
  }

  const reportsByConstituency = new Map()
  for (const report of reports) {
    const list = reportsByConstituency.get(Number(report.constituency_id)) ?? []
    list.push(report)
    reportsByConstituency.set(Number(report.constituency_id), list)
  }
  const statusByDapil = new Map()
  const eligibleDapils = []
  const alreadySaved = []
  const skipped = []
  const validReports = new Set(['party_totals', 'party_components'])

  for (const dapil of constituencies) {
    if (!Number(dapil.seat_count)) {
      skipped.push({ dapil: dapil.name, reason: 'alokasi kursi kosong; entri non-pemilu tidak dihitung' })
      continue
    }
    const localRoster = candidatesByConstituency.get(Number(dapil.id)) ?? []
    const sourceRows = sourceByConstituency.get(Number(dapil.id)) ?? []
    if (!localRoster.length || !sourceRows.length) {
      skipped.push({ dapil: dapil.name, reason: !sourceRows.length ? 'PDF Lampiran II tidak berisi teks caleg yang dapat dipetakan' : 'daftar caleg DB kosong' })
      continue
    }

    const uniqueSource = new Map()
    let duplicateConflict = false
    for (const source of sourceRows) {
      const key = `${source.partyBallot}|${source.candidateBallot}`
      const prior = uniqueSource.get(key)
      if (prior && (normalize(prior.name) !== normalize(source.name) || prior.votes !== source.votes || prior.rank !== source.rank)) duplicateConflict = true
      if (!prior) uniqueSource.set(key, source)
    }
    if (duplicateConflict) {
      skipped.push({ dapil: dapil.name, reason: 'baris caleg PDF ganda dengan nilai berbeda' })
      continue
    }
    if (uniqueSource.size !== localRoster.length || localRoster.some(c => c.election_party_id == null)) {
      skipped.push({ dapil: dapil.name, reason: `cakupan caleg belum lengkap (${uniqueSource.size}/${localRoster.length})` })
      continue
    }

    const verified = []
    let identityFailure = false
    for (const source of uniqueSource.values()) {
      const matches = candidatesByKey.get(`${dapil.id}|${source.partyBallot}|${source.candidateBallot}`) ?? []
      if (matches.length !== 1 || closeName(matches[0].name, source.name) < 0.82) {
        identityFailure = true
        break
      }
      verified.push({ ...source, candidate: matches[0] })
    }
    if (identityFailure || verified.length !== localRoster.length) {
      skipped.push({ dapil: dapil.name, reason: 'identitas partai/nomor caleg/nama tidak cocok tunggal' })
      continue
    }
    const byParty = new Map()
    for (const candidate of verified) {
      const list = byParty.get(Number(candidate.candidate.election_party_id)) ?? []
      list.push(candidate)
      byParty.set(Number(candidate.candidate.election_party_id), list)
    }
    const rankFailure = [...byParty.values()].some(list => {
      const ranks = list.map(x => Number(x.rank)).sort((a, b) => a - b)
      return ranks.some((rank, i) => !Number.isInteger(rank) || rank !== i + 1)
    })
    if (rankFailure) {
      skipped.push({ dapil: dapil.name, reason: 'peringkat KPU caleg tidak lengkap atau berulang' })
      continue
    }

    const localReports = (reportsByConstituency.get(Number(dapil.id)) ?? []).filter(r => validReports.has(r.value_format))
    const totalsReports = localReports.filter(r => r.value_format === 'party_totals')
    const componentReports = localReports.filter(r => r.value_format === 'party_components')
    const selectedReport = totalsReports.at(-1) ?? componentReports.at(-1)
    if (!selectedReport) {
      skipped.push({ dapil: dapil.name, reason: 'tidak ada laporan suara partai langsung yang berstatus usable' })
      continue
    }
    const parseVotes = report => {
      const votes = {}
      for (const party of parties) {
        const value = report.votes_json[party.source_key]
        const number = report.value_format === 'party_components' ? value?.jml_suara_total : value
        if (number == null) continue
        const parsedValue = Number(number)
        if (!Number.isSafeInteger(parsedValue) || parsedValue < 0) throw new Error(`Suara partai tidak valid: ${dapil.name} / ${party.name}`)
        votes[Number(party.id)] = parsedValue
      }
      return votes
    }
    const votes = parseVotes(selectedReport)
    let versionConflict = false
    for (const report of [...totalsReports, ...componentReports]) {
      const comparison = parseVotes(report)
      const keys = new Set([...Object.keys(votes), ...Object.keys(comparison)])
      if ([...keys].some(key => (votes[key] ?? 0) !== (comparison[key] ?? 0))) versionConflict = true
    }
    if (versionConflict || [...byParty.keys()].some(id => votes[id] == null)) {
      skipped.push({ dapil: dapil.name, reason: versionConflict ? 'versi laporan suara partai usable berbeda' : 'suara partai tidak lengkap untuk partai caleg' })
      continue
    }

    const calculation = sainteLague(votes, Number(dapil.seat_count), new Set(Object.keys(votes).map(Number)))
    if (calculation.tie) {
      skipped.push({ dapil: dapil.name, reason: 'nilai batas Sainte-Lague seri, perlu aturan pemutus KPU' })
      continue
    }
    const winners = []
    const assignments = []
    for (const cell of calculation.cells.filter(x => x.seatNo != null).sort((a, b) => a.seatNo - b.seatNo)) {
      const ranked = [...(byParty.get(cell.partyId) ?? [])].sort((a, b) => a.rank - b.rank)
      const winner = ranked[(cell.divisor - 1) / 2]
      if (!winner) {
        skipped.push({ dapil: dapil.name, reason: `caleg tidak cukup untuk seluruh kursi partai ${cell.partyId}` })
        assignments.length = 0
        break
      }
      const assignment = { seatNumber: cell.seatNo, partyId: cell.partyId, divisor: cell.divisor, numerator: votes[cell.partyId], candidateId: Number(winner.candidate.id), name: winner.candidate.name, ballot: winner.candidateBallot, votes: winner.votes, officialRank: winner.rank }
      assignments.push(assignment)
      winners.push({ ...assignment, sourceName: winner.name, sourcePage: winner.page, sourceFile: winner.file })
    }
    if (assignments.length !== Number(dapil.seat_count)) continue

    const electedIds = new Set(winners.map(x => x.candidateId))
    const statusConflicts = localRoster.filter(c => c.elected_status !== 'unknown' && c.elected_status !== (electedIds.has(Number(c.id)) ? 'elected' : 'not_elected'))
    if (statusConflicts.length) {
      skipped.push({ dapil: dapil.name, reason: `status lama bertentangan untuk ${statusConflicts.length} caleg; perlu rekonsiliasi` })
      continue
    }
    const priorRun = savedRuns.find(r => Number(r.constituency_id) === Number(dapil.id) && r.status === 'computed')
    if (priorRun) {
      alreadySaved.push({ dapil: dapil.name, runId: Number(priorRun.id), candidateCount: localRoster.length, seats: assignments.length })
      continue
    }

    const sourceDocument = parsed.documents.find(d => d.file === verified[0].file)
    const rosterHashRows = localRoster.map(c => [Number(c.id), c.source_key, Number(c.election_party_id), Number(c.ballot_number)]).sort((a, b) => a[0] - b[0])
    const voteHash = hash(votes)
    const fingerprint = hash({ dapilId: Number(dapil.id), year: 2024, seatCount: Number(dapil.seat_count), reportId: Number(selectedReport.id), reportVotesHash: hash(selectedReport.votes_json), pdfHash: sourceDocument.sha256, candidates: verified.map(x => [x.candidate.source_key, x.candidateBallot, x.votes, x.rank]), rosterHashRows })
    const reportFingerprints = [...totalsReports, ...componentReports].map(r => ({ id: Number(r.id), format: r.value_format, hash: hash(r.votes_json) }))
    const rules = {
      fingerprint, ruleVersion: 'sainte-lague-dprd-provinsi-2024-pkpu6-v1', thresholdPercent: 0,
      regulation: 'PKPU 6 Tahun 2024 Pasal 37: perolehan kursi partai dari suara sah dengan metode Sainte-Lague; calon terpilih mengikuti peringkat suara sah resmi KPU.',
      regulationUrl: 'https://jdih.kpu.go.id/data/data_pkpu/2024pkpu006.pdf',
      officialDecision: null,
      sourceDocument: { kind: 'KPU Provinsi L5 Lampiran II (peringkat suara sah caleg)', file: sourceDocument.file, sha256: sourceDocument.sha256 },
      inputReportId: Number(selectedReport.id), inputReportOrigin: selectedReport.report_origin,
      inputReportFormat: selectedReport.value_format, inputVotesHash: voteHash,
      comparedReportVersions: reportFingerprints,
      candidateRankSource: 'Peringkat resmi pada Lampiran II Keputusan KPU Provinsi; tidak diagregasi dari kabupaten/kota.',
      seatCountSource: { constituencyId: Number(dapil.id), seatCount: Number(dapil.seat_count), seatSourceId: dapil.seat_source_id },
      officialWinners: winners.map(w => ({ candidateId: w.candidateId, partyId: w.partyId, partyBallot: parties.find(p => Number(p.id) === w.partyId)?.ballot_number, candidateBallot: w.ballot, votes: w.votes, rank: w.officialRank, seatNumber: w.seatNumber, sourcePage: w.sourcePage })),
      previousCandidateStatuses: localRoster.map(c => ({ id: Number(c.id), electedStatus: c.elected_status })),
      rosterHash: hash(rosterHashRows),
    }
    const preview = { constituencyId: Number(dapil.id), dapil: dapil.name, seatCount: Number(dapil.seat_count), inputReportId: Number(selectedReport.id), candidateCount: localRoster.length, electedCount: electedIds.size, notElectedCount: localRoster.length - electedIds.size, assignments, fingerprint, rules }
    eligibleDapils.push(preview)
    statusByDapil.set(Number(dapil.id), { roster: localRoster, electedIds, assignments, preview })
  }

  const summary = {
    mode: apply ? 'apply' : 'preview',
    pdfDocuments: parsed.documents.length,
    databaseConstituencies: constituencies.filter(c => Number(c.seat_count) > 0).length,
    mappedAndVerified: eligibleDapils.length,
    candidatesToUpdate: [...statusByDapil.values()].reduce((n, x) => n + x.roster.length, 0),
    winnersToSave: eligibleDapils.reduce((n, x) => n + x.electedCount, 0),
    alreadySaved: alreadySaved.length,
    skipped: skipped.length,
    unresolvedSourceLabels: unresolvedLabels.length,
    skippedSample: skipped.slice(0, 40),
    savedSample: eligibleDapils.slice(0, 8).map(({ rules, ...x }) => x),
    alreadySavedSample: alreadySaved,
  }
  if (!apply) {
    console.log(JSON.stringify(summary, null, 2))
    await db.rollback()
    process.exitCode = 0
  } else {
    const backup = {
      createdAt: new Date().toISOString(),
      summary,
      dapils: [...statusByDapil.values()].map(x => ({
        ...x.preview,
        previousCandidateStatuses: x.roster.map(c => ({ id: Number(c.id), status: c.elected_status })),
      })),
    }
    const backupPath = new URL(`../docs/audits/dprd-provinsi-2024-${new Date().toISOString().replace(/[:.]/g, '-')}-before.json`, import.meta.url)
    await mkdir(new URL('../docs/audits/', import.meta.url), { recursive: true })
    await writeFile(backupPath, JSON.stringify(backup, null, 2), 'utf8')
    const saved = []
    for (const [constituencyId, item] of statusByDapil) {
      const { preview, roster: localRoster, electedIds, assignments } = item
      const rules = preview.rules
      const inserted = await rows(`INSERT INTO seat_allocation_runs
        (constituency_id,input_report_id,seat_count,method,rules_json,status)
        VALUES (?,?,?,'sainte_lague',?,'computed')`,
      [constituencyId, preview.inputReportId, preview.seatCount, JSON.stringify(rules)])
      for (const assignment of assignments) {
        await rows(`INSERT INTO seat_allocations
          (run_id,seat_number,election_party_id,divisor,numerator,candidate_id)
          VALUES (?,?,?,?,?,?)`,
        [inserted.insertId, assignment.seatNumber, assignment.partyId, assignment.divisor, assignment.numerator, assignment.candidateId])
      }
      const ids = localRoster.map(c => Number(c.id))
      await rows(`UPDATE candidates SET elected_status = CASE WHEN id IN (${[...electedIds].map(() => '?').join(',')}) THEN 'elected' ELSE 'not_elected' END WHERE id IN (${ids.map(() => '?').join(',')})`, [...electedIds, ...ids])
      const check = await rows(`SELECT elected_status, COUNT(*) AS n FROM candidates WHERE constituency_id = ? AND election_year = 2024 AND contest_type = 'dprd_provinsi' GROUP BY elected_status`, [constituencyId])
      if (Number(check.find(r => r.elected_status === 'elected')?.n ?? 0) !== electedIds.size || Number(check.find(r => r.elected_status === 'not_elected')?.n ?? 0) !== ids.length - electedIds.size) {
        throw new Error(`Validasi status caleg gagal untuk constituency ${constituencyId}`)
      }
      const savedSeats = await rows(`SELECT seat_number,election_party_id,divisor,numerator,candidate_id FROM seat_allocations WHERE run_id=? ORDER BY seat_number`, [inserted.insertId])
      if (savedSeats.length !== preview.seatCount || savedSeats.some((seat, i) => Number(seat.candidate_id) !== assignments[i].candidateId || Number(seat.seat_number) !== assignments[i].seatNumber)) {
        throw new Error(`Validasi alokasi kursi gagal untuk constituency ${constituencyId}`)
      }
      saved.push({ dapil: preview.dapil, runId: Number(inserted.insertId), candidates: ids.length, elected: electedIds.size })
    }
    await db.commit()
    console.log(JSON.stringify({ ...summary, saved, backup: backupPath.pathname }, null, 2))
  }
} catch (error) {
  await db.rollback()
  throw error
} finally {
  await db.end()
}
