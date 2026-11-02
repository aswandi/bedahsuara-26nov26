import type { QuotientCell } from './sainteLague'

export interface SavedSeat {
  seat_number: number
  election_party_id: number
  divisor: number
  numerator: number
  candidate_id: number | null
}

/** Tolak snapshot lama, lintas dapil, kandidat ganda, dan alokasi yang berbeda. */
export function savedSeatsMatch(
  saved: SavedSeat[], cells: QuotientCell[], votes: Record<number, number>,
  roster: { id: number; election_party_id: number | null }[], seatCount: number, tie: boolean
): boolean {
  if (tie || saved.length !== seatCount) return false
  const winners = cells.filter(cell => cell.seatNo != null)
  if (winners.length !== seatCount) return false
  const candidateIds = new Set<number>()
  const seatNumbers = new Set<number>()
  return saved.every(seat => {
    const candidateId = Number(seat.candidate_id)
    if (!seat.candidate_id || candidateIds.has(candidateId) || seatNumbers.has(Number(seat.seat_number))) return false
    candidateIds.add(candidateId)
    seatNumbers.add(Number(seat.seat_number))
    const candidate = roster.find(row => Number(row.id) === candidateId)
    const current = winners.find(cell => cell.seatNo === Number(seat.seat_number))
    return candidate != null && Number(candidate.election_party_id) === Number(seat.election_party_id)
      && current?.partyId === Number(seat.election_party_id) && current.divisor === Number(seat.divisor)
      && votes[Number(seat.election_party_id)] === Number(seat.numerator)
  })
}
