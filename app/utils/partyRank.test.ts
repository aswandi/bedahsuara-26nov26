import { describe, expect, it } from 'vitest'
import { partyRanks } from './partyRank'

describe('peringkat suara partai per wilayah', () => {
  it('memberi peringkat yang sama untuk nilai seri tanpa menandai nol atau nilai kosong', () => {
    expect(partyRanks({ 1: 100, 2: 80, 3: 80, 4: 20, 5: 0, 6: null })).toEqual({ 1: 1, 2: 2, 3: 2, 4: 3 })
  })
})
