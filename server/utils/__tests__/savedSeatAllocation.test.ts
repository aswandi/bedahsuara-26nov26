import { describe, expect, it } from 'vitest'
import { savedSeatsMatch, type SavedSeat } from '../savedSeatAllocation'
import { sainteLague } from '../sainteLague'

const votes = { 22: 80338, 28: 58530 }
const calculation = sainteLague(votes, 2, new Set([22, 28]))
const roster = [{ id: 322104, election_party_id: 22 }, { id: 333784, election_party_id: 28 }]
const saved: SavedSeat[] = [
  { seat_number: 1, election_party_id: 22, divisor: 1, numerator: 80338, candidate_id: 322104 },
  { seat_number: 2, election_party_id: 28, divisor: 1, numerator: 58530, candidate_id: 333784 }
]
const matches = (seats = saved, input = votes, candidates = roster, tie = false) => savedSeatsMatch(seats, calculation.cells, input, candidates, 2, tie)

describe('integritas kursi tersimpan', () => {
  it('menerima hasil yang masih sesuai suara dan identitas caleg', () => expect(matches()).toBe(true))
  it('menolak snapshot setelah suara sumber berubah', () => expect(matches(saved, { ...votes, 22: 80339 })).toBe(false))
  it('menolak caleg yang bukan anggota dapil atau partai terkait', () => {
    expect(matches(saved, votes, roster.slice(1))).toBe(false)
    expect(matches(saved, votes, [{ ...roster[0]!, election_party_id: 28 }, roster[1]!])).toBe(false)
  })
  it('menolak duplikasi caleg, nomor kursi, atau hasil yang belum lengkap', () => {
    expect(matches([{ ...saved[0]! }, { ...saved[1]!, candidate_id: 322104 }])).toBe(false)
    expect(matches([{ ...saved[0]! }, { ...saved[1]!, seat_number: 1 }])).toBe(false)
    expect(matches(saved.slice(1))).toBe(false)
  })
  it('menolak hasil seri tanpa keputusan persebaran suara', () => expect(matches(saved, votes, roster, true)).toBe(false))
})
