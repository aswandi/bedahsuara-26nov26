export interface QuotientCell {
  partyId: number
  divisor: number
  quotient: number
  /** urutan kursi (1..n) bila nilai ini mendapat kursi, selain itu null */
  seatNo: number | null
}

export interface SainteLagueResult {
  divisors: number[]
  cells: QuotientCell[]
  seatsByParty: Record<number, number>
  /** true bila nilai terakhir yang lolos sama dengan nilai pertama yang tidak lolos */
  tie: boolean
}

/**
 * Sainte-Laguë murni: pembagi 1, 3, 5, 7, ...
 * Hanya partai di `eligible` yang ikut alokasi (ambang parlemen).
 * Dihitung dari suara partai dapil yang sudah ada — bukan agregasi wilayah.
 */
export function sainteLague(
  votes: Record<number, number>,
  seats: number,
  eligible: Set<number>,
  divisorCount = Math.max(seats, 4)
): SainteLagueResult {
  const divisors = Array.from({ length: divisorCount }, (_, i) => 2 * i + 1)
  const cells: QuotientCell[] = []
  for (const [id, v] of Object.entries(votes)) {
    const partyId = Number(id)
    if (!eligible.has(partyId)) continue
    for (const d of divisors) cells.push({ partyId, divisor: d, quotient: v / d, seatNo: null })
  }
  const sorted = [...cells].sort((a, b) => b.quotient - a.quotient || a.divisor - b.divisor)
  const seatsByParty: Record<number, number> = {}
  sorted.slice(0, seats).forEach((c, i) => {
    c.seatNo = i + 1
    seatsByParty[c.partyId] = (seatsByParty[c.partyId] ?? 0) + 1
  })
  const last = sorted[seats - 1]
  const next = sorted[seats]
  const tie = !!last && !!next && last.quotient === next.quotient
  return { divisors, cells, seatsByParty, tie }
}
