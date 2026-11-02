# CLAUDE.md — BEDAH SUARA (bedahsuara.id)

Panduan untuk Claude/agen AI yang mengerjakan repo ini. Baca bersama [PRD.md](PRD.md), [roadmap.md](roadmap.md), [AGENTS.md](AGENTS.md).

## Ringkasan
Aplikasi web data pemilu Indonesia (Pemilu 2019 & 2024, Pilkada 2024) bertingkat: Nasional → Provinsi → Dapil → Kabupaten/Kota → Kecamatan → Desa/Kelurahan → TPS. Tampilan ringkas gratis publik; level Kecamatan ke bawah diproteksi login. Versi berbayar memberi data/analisa lebih detail.

- Nama: **BEDAH SUARA** · Domain: **bedahsuara.id**
- Stack: **Nuxt 4 full-stack** (Vue 3, Nitro server routes) + TypeScript
- Database: MySQL, db `bedahsuara_gpt6`, port `3310`

## Aturan Keras (WAJIB)
1. **Jangan membuat tabel baru** di `bedahsuara_gpt6` tanpa konfirmasi eksplisit pemilik. Jika butuh, **berhenti dan tanya**. Tabel yang sudah ada dan dipakai: `users`, `user_access_bindings`, `user_sessions`, `user_activity_events` (auth/tracking), `seat_allocation_runs`/`seat_allocations` (opsional, tulis hanya atas konfirmasi). Pemetaan skema lengkap di PRD §11.
2. **Jangan mengagregasi data antar-tingkat.** Data sudah tersedia per tingkat dan final. Total kecamatan diambil dari baris tingkat kecamatan, **bukan** `SUM` desa/TPS. Sama untuk kabupaten, dapil, provinsi, nasional.
3. **Jangan menyalin desain/kode dari folder di luar repo ini.** Satu-satunya rujukan eksternal yang diizinkan: `bedahsuara-from-db-gptsol`.
4. **Kredensial hanya lewat `.env`** (tidak di-commit, tidak ditulis di dokumen/kode). Sediakan `.env.example` tanpa nilai rahasia.
5. Akses DB **read-only** untuk data pemilu. Dilarang `INSERT/UPDATE/DELETE/DDL` pada tabel data pemilu.
6. Nomor WA kontak yang benar: **62811945222**.
7. Tahap awal hanya dokumen (PRD, roadmap, CLAUDE/AGENTS). Jangan mulai coding sebelum diminta.

## Konfigurasi (`.env`)
```
DB_HOST=127.0.0.1
DB_PORT=3310
DB_NAME=bedahsuara_gpt6
DB_USER=...
DB_PASSWORD=...
AUTH_SECRET=...
WA_CONTACT=62811945222
```

## Konvensi Teknis
- Nuxt 4 (`app/` + `server/`), TypeScript strict, Pinia, Tailwind CSS, animasi dengan `motion-v`/GSAP.
- Peta: Leaflet/MapLibre + `region_boundaries`. Grafik: ECharts. Tabel: komponen sendiri dengan sticky header.
- DB: `mysql2` pool, query parameterized, query di `server/repositories/*`, API di `server/api/*`.
- Rute berlapis, mis. `/pemilu/2024/dpr-ri`, `/.../[prov]`, `/.../dapil/[dapil]`, `/.../kab/[kab]`, `/.../kec/[kec]`, `/.../desa/[desa]`, `/.../tps/[tps]`.
- Middleware: level ≥ Kecamatan butuh login + cek cakupan wilayah (di server, bukan hanya UI).
- Tracking: middleware mencatat ke `user_activity_events`.
- UI Bahasa Indonesia, angka format `id-ID`.
- Tabel besar (`regions` TPS 1,6 jt; `vote_reports` 10 jt): selalu filter by parent + paginasi.

## Aturan Tabel & Tampilan
- Header tabel partai **memakai logo partai**; **baris kedua setelah header = total suara**.
- Setiap halaman wilayah: **peta + grafik + tabel**.
- Semua card/section/header beranimasi, responsif, elegan; hormati `prefers-reduced-motion`.
- Navbar atas dengan dropdown saat mouse over (mobile: accordion).

## Sainte-Laguë
- Pembagi **1, 3, 5, 7, …** per dapil; kursi = `constituencies.seat_count`.
- DPR RI: hanya partai ≥ **4%** suara sah nasional yang ikut alokasi. DPRD: tanpa ambang.
- Caleg terpilih: suara terbanyak internal partai sebanyak kursi partai; bandingkan dengan `candidates.elected_status`.
- Hasil adalah **kalkulasi turunan** dari suara partai dapil yang ada, bukan agregasi wilayah.
- Pilpres/DPD/Pilkada: tanpa kursi; tampilkan ranking & persentase.

## Hak Akses
| Role | Cakupan |
|---|---|
| Nasional | Semua data + CRUD user |
| Provinsi | 1 provinsi terpilih |
| Dapil DPR RI | 1 dapil terpilih |
| Kabupaten | 1 kabupaten terpilih |

- Demo gratis: **Sumatera Selatan II** (DPR RI) terbuka penuh sampai TPS.
- Halaman terproteksi tanpa login → tampil login + info akses: kirim WA ke **62811945222**.

## Footer
WA 62811945222 · bagian dari **software-pilkada.com** · dibuat oleh **aswandi.or.id**.

## Definisi Selesai
Sesuai aturan keras, tipe aman, responsif, animasi aktif, tanpa agregasi lintas tingkat, tanpa rahasia ter-commit.
