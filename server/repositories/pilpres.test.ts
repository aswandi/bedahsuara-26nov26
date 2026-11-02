import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getPilpresNational } from './pilpres'

vi.mock('../utils/db', () => ({ query: vi.fn() }))
import { query } from '../utils/db'
const mockedQuery = vi.mocked(query)

describe('laporan nasional Pilpres', () => {
  beforeEach(() => mockedQuery.mockReset())

  it('mempertahankan nilai yang hilang dan identitas sumber', async () => {
    mockedQuery.mockResolvedValueOnce([{ data_status: 'partial' }])
      .mockResolvedValueOnce([{ id: 1, source_id: 2, region_id: 3, quality_status: 'needs_review', valid_votes: null, votes_json: { a: 0 } }])
      .mockResolvedValueOnce([{ source_key: 'a', ballot_number: 1, name: 'A' }, { source_key: 'b', ballot_number: 2, name: 'B' }])
    const result = await getPilpresNational(2024)
    expect(result.report).toMatchObject({ sourceId: 2, qualityStatus: 'needs_review', validVotes: null })
    expect(result.tickets.map(t => t.votes)).toEqual([0, null])
  })

  it('tidak memilih laporan ketika sumber lebih dari satu', async () => {
    mockedQuery.mockResolvedValueOnce([{ data_status: 'partial' }]).mockResolvedValueOnce([{ id: 1 }, { id: 2 }]).mockResolvedValueOnce([])
    const result = await getPilpresNational(2024)
    expect(result.status).toBe('ambiguous')
    expect(result.report).toBeNull()
  })
})
