import { query } from '../utils/db'

type Ring = [number, number][]
const cache = new Map<string, { at: number; data: any }>()
const TTL = 1000 * 60 * 60

/** Sederhanakan ring: ambil tiap N titik agar maksimal ~maxPts titik. */
function simplify(ring: Ring, maxPts: number): Ring {
  if (ring.length <= maxPts) return ring
  const step = Math.ceil(ring.length / maxPts)
  const out = ring.filter((_, i) => i % step === 0)
  const last = ring[ring.length - 1]
  if (out[out.length - 1] !== last) out.push(last)
  return out
}

function flatten(geo: any): Ring[] {
  // format leaflet_path: array bersarang [lat,lng]; ratakan ke daftar ring
  const rings: Ring[] = []
  const walk = (n: any) => {
    if (Array.isArray(n) && typeof n[0] === 'number') return
    if (Array.isArray(n) && Array.isArray(n[0]) && typeof n[0][0] === 'number') { rings.push(n as Ring); return }
    if (Array.isArray(n)) n.forEach(walk)
  }
  walk(geo)
  return rings
}

export interface BoundaryItem { regionId: number; name: string; rings: Ring[] }

/** Batas wilayah per id (maks 600 id), disederhanakan untuk tampilan peta. */
export async function getBoundaries(year: number, ids: number[], maxPts = 160): Promise<BoundaryItem[]> {
  if (!ids.length) return []
  const key = `${year}:${maxPts}:${ids.join(',')}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL) return hit.data
  const rows = await query<any>(
    `SELECT region_id, name, geometry_json FROM region_boundaries WHERE election_year = ? AND region_id IN (?)`,
    [year, ids.slice(0, 600)]
  )
  const data = rows.map((r) => {
    let geo: any
    try { geo = typeof r.geometry_json === 'string' ? JSON.parse(r.geometry_json) : r.geometry_json } catch { geo = [] }
    return { regionId: r.region_id, name: r.name, rings: flatten(geo).map((g) => simplify(g, maxPts)) }
  })
  cache.set(key, { at: Date.now(), data })
  return data
}
