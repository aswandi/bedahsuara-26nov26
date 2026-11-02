# Roadmap — BEDAH SUARA (bedahsuara.id)

Estimasi dalam sprint 1–2 minggu. Rujukan: [PRD.md](PRD.md), [CLAUDE.md](CLAUDE.md).

## Sprint 0 — Fondasi (Minggu 1)
- [x] Scaffold Nuxt 4 + TS + Tailwind + Pinia + ECharts + Leaflet/MapLibre
- [x] `.env`, pool `mysql2` read-only, `.env.example`
- [x] Verifikasi nilai `scope_level`, `contest_type`, `chamber`, `role`, `scope_kind`; catat di `docs/schema.md`
- [x] Indeks/performa: cek `EXPLAIN` query kunci (tanpa mengubah skema tanpa konfirmasi)
- [x] Design system: tema, animasi, komponen Card/Header/DataTable (logo partai + baris total ke-2)

## Sprint 1 — Layout & Dashboard (M2)
- [x] Navbar atas dengan dropdown hover + mobile drawer
- [x] Footer (WA 62811945222, software-pilkada.com, aswandi.or.id)
- [x] Dashboard ringkasan 2019/2024/Pilkada + animasi
- [x] Halaman Coming Soon (Profil Dapil non-DPR, Analisa, Strategi Kampanye)

## Sprint 2 — Mesin Data & Sainte-Laguë (M3)
- [x] Repositori per tingkat (tanpa agregasi lintas tingkat)
- [x] Modul Sainte-Laguë (1,3,5,7…) + ambang 4% + caleg terpilih; unit test dengan data resmi
- [x] Komponen Peta/Grafik/Tabel reusable

## Sprint 3 — DPR RI 2024 (M4–5)
- [x] Nasional → Provinsi → Daftar Dapil
- [x] Detail Dapil (tabel Sainte-Laguë, tabel per partai + caleg)
- [x] Suara partai per Kab/Kota → halaman Kab/Kota
- [x] Profil Dapil DPR RI (aktif)

## Sprint 4 — Auth, RBAC, Tracking (M6)
- [x] Login, sesi, CSRF, rate-limit, halaman login dengan info WA 62811945222
- [x] Middleware proteksi Kecamatan ke bawah + cek cakupan (nasional/provinsi/dapil/kabupaten)
- [x] Akses penuh gratis Sumsel II sampai TPS
- [x] Admin: CRUD user + binding wilayah
- [x] Tracking akses halaman + dashboard log

## Sprint 5 — Level Kecamatan–TPS DPR RI (M7)
- [x] Kecamatan, Desa/Kelurahan, TPS (peta, grafik, tabel) dengan paginasi

## Sprint 6 — Perluasan Kontes 2024 (M8–9)
- [ ] Pilpres, DPD, DPRD Provinsi, DPRD Kab/Kota sampai TPS (Sainte-Laguë untuk DPRD)
  - Parsial: halaman Pilpres 2024 nasional menggunakan laporan nasional langsung. Suara sah yang kosong tetap tidak tersedia; laporan provinsi belum ditampilkan karena terdapat beberapa laporan per wilayah yang perlu direkonsiliasi. Drill-down dan kontes lainnya belum selesai.
  - Parsial: halaman nasional dan daftar dapil per provinsi DPRD Provinsi 2024 aktif. Satu laporan Riau 3 dicocokkan dengan lampiran resmi KPU setelah versi basis data berbeda; rincian dapil sampai TPS belum selesai.

## Sprint 7 — Pemilu 2019 (M10–11)
- [ ] Semua kontes 2019 semua tingkat; perbandingan 2019 vs 2024

## Sprint 8 — Pilkada 2024 (M12)
- [ ] Pilgub, Pilbup/Pilwalkot semua tingkat

## Sprint 9 — Hardening & Rilis (M13)
- [ ] Performa, cache, SEO, aksesibilitas, uji keamanan, uji responsif
- [ ] Deploy bedahsuara.id (HTTPS), monitoring
- [ ] UAT dan rilis v1.0

## Pasca-v1 (Backlog)
- Profil Dapil: Pilpres, DPD, DPRD Prov, DPRD Kab/Kota
- Menu Analisa & Strategi Kampanye
- Paket berbayar otomatis, ekspor data, MFA wajib admin

## Keputusan yang Menunggu Konfirmasi
Keputusan pemilik tercatat di PRD §12; sisanya verifikasi enum di Sprint 0. Pembuatan tabel baru **selalu** memerlukan persetujuan.
