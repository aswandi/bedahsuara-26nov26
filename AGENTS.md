# AGENTS.md — BEDAH SUARA

Instruksi untuk agen AI apa pun. Detail di [CLAUDE.md](CLAUDE.md); produk di [PRD.md](PRD.md); jadwal di [roadmap.md](roadmap.md).

## Larangan
- Dilarang membuat tabel baru di `bedahsuara_gpt6` tanpa konfirmasi pemilik.
- Dilarang menghitung agregasi tingkat atas dari tingkat bawah (kecamatan ≠ SUM desa). Pakai data per tingkat apa adanya.
- Dilarang mengambil desain/kode dari folder di luar repo ini (kecuali `bedahsuara-from-db-gptsol`).
- Dilarang menulis kredensial/rahasia di kode atau dokumen; pakai `.env`.
- Dilarang menulis ke tabel data pemilu (read-only).
- Dilarang menghindari kontrol akses atau penolakan izin; jika diblokir, laporkan dan berhenti.

## Peran Agen
| Agen | Tugas |
|---|---|
| Planner | Menjaga PRD & roadmap, menandai asumsi |
| Backend | `server/api`, repositori SQL read-only, auth, RBAC, tracking |
| Frontend | Halaman, peta, grafik, tabel, animasi, responsif |
| Data/Calc | Sainte-Laguë, ambang 4%, caleg terpilih, validasi data |
| QA | Uji hitungan, RBAC, responsif, aksesibilitas |

## Alur Kerja
1. Baca CLAUDE.md, PRD.md, roadmap.md.
2. Verifikasi nilai enum DB (`scope_level`, `contest_type`, `chamber`, `role`) dan catat di `docs/schema.md`. Pemetaan tabel awal ada di PRD §11.
3. Kerjakan per sprint di roadmap; satu perubahan per fitur.
4. Jalankan lint, typecheck, test sebelum selesai.
5. Butuh tabel/ubah skema? **Tanya dulu.**

## Standar
Nuxt 4 + TypeScript, query parameterized, UI Bahasa Indonesia, angka `id-ID`. Tabel: logo partai di header + baris total suara kedua. Setiap halaman wilayah punya peta + grafik + tabel.

## Kontak
WA: 62811945222. Footer: bagian dari software-pilkada.com, dibuat oleh aswandi.or.id.
