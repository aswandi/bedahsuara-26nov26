import { describe, expect, it } from 'vitest'
import { sainteLague } from '../sainteLague'

describe('sainteLague', () => {
  it('mengalokasikan kursi dengan pembagi 1,3,5,7', () => {
    // 5 kursi: 100000, 70000, 33333, 25000, 23333 -> P1:2, P2:2, P3:1
    const votes = { 1: 100000, 2: 70000, 3: 25000 }
    const r = sainteLague(votes, 5, new Set([1, 2, 3]))
    expect(r.divisors.slice(0, 4)).toEqual([1, 3, 5, 7])
    expect(r.seatsByParty).toEqual({ 1: 2, 2: 2, 3: 1 })
    expect(r.tie).toBe(false)
  })

  it('mengabaikan partai di bawah ambang (tidak eligible)', () => {
    const r = sainteLague({ 1: 1000, 2: 900, 3: 800 }, 2, new Set([1, 3]))
    expect(r.seatsByParty).toEqual({ 1: 1, 3: 1 })
  })

  it('menandai seri pada batas kursi', () => {
    const r = sainteLague({ 1: 300, 2: 100 }, 2, new Set([1, 2]))
    // 300/1=300, 300/3=100, 100/1=100 -> seri di kursi ke-2
    expect(r.tie).toBe(true)
  })
})
