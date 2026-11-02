import { getBoundaries } from '../repositories/boundaries'
import { query } from '../utils/db'

/** GET /api/boundaries?year=2024&level=province  atau  ?year=2024&ids=1,2,3  atau  ?year=2024&dapil=4874 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const year = Number(q.year)
  if (![2019, 2024].includes(year)) throw createError({ statusCode: 400, statusMessage: 'Tahun tidak valid' })
  let ids: number[] = []
  if (q.level === 'province') {
    ids = (await query<any>(`SELECT id FROM regions WHERE election_year = ? AND level = 'province'`, [year])).map((r) => r.id)
  } else if (q.parent) {
    const parentId = Number(q.parent)
    if (!Number.isSafeInteger(parentId) || parentId <= 0) throw createError({ statusCode: 400, statusMessage: 'Wilayah tidak valid' })
    const childLevel = q.childLevel === 'regency' ? 'regency' : 'village'
    const parentLevel = childLevel === 'regency' ? 'province' : 'district'
    ids = (await query<any>(`SELECT child.id FROM regions child JOIN regions parent ON parent.id = child.parent_id
      WHERE child.election_year = ? AND child.level = ? AND parent.id = ? AND parent.election_year = ? AND parent.level = ? ORDER BY child.id LIMIT 600`, [year, childLevel, parentId, year, parentLevel])).map(r => r.id)
  } else if (q.dapil) {
    ids = (await query<any>(
      `SELECT DISTINCT region_id AS id FROM vote_reports
        WHERE election_id = ? AND contest_type = 'dpr_ri' AND constituency_id = ? AND scope_level = 'regency' AND value_format = 'party_components'`,
      [year, Number(q.dapil)]
    )).map((r) => r.id)
  } else if (q.ids) {
    ids = String(q.ids).split(',').map(Number).filter(Boolean)
  }
  return getBoundaries(year, ids, q.level === 'province' ? 120 : 220)
})
