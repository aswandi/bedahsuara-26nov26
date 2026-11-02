/** Peringkat berdasarkan nilai berbeda; nilai seri mendapatkan peringkat yang sama. */
export function partyRanks(votes: Record<number, number | null | undefined>): Record<number, number> {
  const levels = [...new Set(Object.values(votes).filter((n): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0))].sort((a, b) => b - a)
  return Object.fromEntries(Object.entries(votes).flatMap(([id, votes]) => typeof votes === 'number' && votes > 0 && levels.includes(votes) ? [[Number(id), levels.indexOf(votes) + 1]] : []))
}
