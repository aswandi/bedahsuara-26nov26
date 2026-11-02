/**
 * Partai yang lolos ambang parlemen (4%) pada DPR RI.
 * Daftar partai yang memenuhi ambang nasional mengikuti penetapan resmi KPU.
 * Kunci = nomor urut partai pada election_parties.ballot_number per tahun.
 */
export const PARLIAMENT_THRESHOLD = 4

export const PASSED_THRESHOLD_BALLOT: Record<number, number[]> = {
  // 2024: PKB(1), Gerindra(2), PDIP(3), Golkar(4), NasDem(5), PKS(8), PAN(12), Demokrat(14)
  2024: [1, 2, 3, 4, 5, 8, 12, 14],
  // KPU 2019: PKB, Gerindra, PDI-P, Golkar, NasDem, PKS, PPP, PAN, Demokrat.
  2019: [1, 2, 3, 4, 5, 8, 10, 12, 14]
}
