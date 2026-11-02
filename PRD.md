# PRD — BEDAH SUARA (bedahsuara.id)

Versi 1.0 · Status: Draft untuk persetujuan

## 1. Latar Belakang & Tujuan
Data pemilu Indonesia tersebar dan sulit dibaca. BEDAH SUARA menyajikan sekilas data Pemilu 2019, Pemilu 2024, dan Pilkada 2024 secara bertingkat (Nasional → TPS) dengan peta, grafik, tabel, dan simulasi kursi Sainte-Laguë. Versi publik memberi gambaran ringkas; versi berbayar (login) membuka data dan analisa lebih lengkap dan detail.

**Sasaran:** (1) dashboard ringkas publik yang menarik; (2) drill-down sampai TPS untuk pengguna berizin; (3) fondasi monetisasi lewat akses berjenjang; (4) fondasi untuk menu Analisa & Strategi Kampanye (coming soon).

## 2. Pengguna
| Persona | Kebutuhan |
|---|---|
| Publik | Lihat ringkasan hasil per wilayah tanpa login |
| Caleg/tim sukses | Data detail dapil/kabupaten, sampai kecamatan–TPS |
| Pengurus partai provinsi/kabupaten | Data wilayahnya |
| Admin nasional | Semua data, kelola user |

## 3. Ruang Lingkup
**Termasuk:** Dashboard; Pemilu 2019 & 2024 (Pilpres, DPD, DPR RI, DPRD Provinsi, DPRD Kab/Kota); Pilkada 2024 (Pilgub, Pilbup/Pilwalkot); Profil Dapil (aktif: DPR RI); auth + RBAC; tracking akses; footer.
**Coming soon:** Profil Dapil selain DPR RI; Analisa; Strategi Kampanye.
**Di luar lingkup:** pembayaran otomatis (akses diberikan manual via WA 62811945222), Pemilu 2014 (data `not_available`).

## 4. Batasan Data (WAJIB)
1. Database: MySQL `bedahsuara_gpt6` (port 3310). Kredensial lewat `.env`.
2. **Tidak membuat tabel baru** tanpa konfirmasi. Tabel yang sudah tersedia dan cukup dipakai (lihat §11).
3. **Tidak ada agregasi lintas tingkat.** Setiap tingkat sudah memiliki laporan suara sendiri (`vote_reports.scope_level`). Kecamatan dibaca dari baris kecamatan, bukan SUM desa/TPS; sama untuk semua tingkat.
4. Data pemilu read-only; tulis hanya ke tabel user/sesi/aktivitas yang sudah ada.
5. Boleh dikalkulasi saat tampil: persentase, peringkat, dan Sainte-Laguë (kalkulasi turunan dari suara partai dapil, bukan agregasi wilayah).
6. Tidak mengambil desain/kode dari folder lain di luar repo (kecuali `bedahsuara-from-db-gptsol`).

## 5. Navigasi (Header atas, dropdown saat hover)
- **Beranda** (Dashboard)
- **Pemilu 2019** ▾ Pilpres · DPD · DPR RI · DPRD Provinsi · DPRD Kab/Kota
- **Pemilu 2024** ▾ Pilpres · DPD · DPR RI · DPRD Provinsi · DPRD Kab/Kota
- **Pilkada 2024** ▾ Pilgub · Pilbup/Pilwalkot
- **Profil Dapil** ▾ DPR RI (aktif) · Pilpres/DPD/DPRD Prov/DPRD Kab-Kota (Coming Soon)
- **Analisa** (Coming Soon) · **Strategi Kampanye** (Coming Soon)
- Tombol Login/Akun. Mobile: drawer + accordion.

## 6. Fitur

### 6.1 Dashboard (halaman depan)
Ringkasan semua database: kartu statistik per pemilu (jumlah wilayah, pemilih, suara sah, partisipasi), pemenang Pilpres 2019 vs 2024, perolehan kursi/suara partai teratas DPR RI, peta nasional, grafik tren 2019 vs 2024, status ketersediaan data (`elections.data_status`), CTA akses berbayar. Seluruh card & header beranimasi.

### 6.2 Halaman kontes (semua jenis, 2019 & 2024)
Pola drill-down seragam; setiap halaman wajib **peta + grafik + tabel**:
Nasional (semua provinsi) → klik Provinsi → Dapil/Kab-Kota → … → Kecamatan 🔒 → Desa 🔒 → TPS 🔒.

**Aturan tabel partai:** header kolom memuat **logo partai** (`election_party_assets`), **baris kedua tepat setelah header = total suara**. Sticky header, sortable, responsif (scroll horizontal di mobile).

### 6.3 DPR RI (modul prioritas)
1. **Nasional:** peta provinsi, grafik suara partai, tabel semua provinsi. Klik provinsi → halaman daftar Dapil provinsi tersebut.
2. **Daftar Dapil provinsi:** peta, grafik, tabel dapil (jumlah kursi, suara sah).
3. **Detail Dapil:**
   - Tabel suara partai + pembagi **1, 3, 5, 7** (+ lanjutan sesuai jumlah kursi) + **kursi hasil Sainte-Laguë**, memperhitungkan **ambang parlemen 4%** (nasional, Pemilu 2024).
   - Di bawahnya **satu tabel per partai**: logo partai, total suara partai, daftar caleg (nama/inisial, tanpa foto) + suara + persentase dalam partai + status **terpilih/tidak**.
   - Suara partai per Kabupaten/Kota (peta, grafik, tabel); klik → halaman Kabupaten.
4. **Kabupaten/Kota → Kecamatan 🔒:** suara partai & caleg per kecamatan, lengkap peta, grafik, tabel (aturan logo + total di baris kedua).
5. Desa/Kelurahan 🔒 dan TPS 🔒 dengan pola yang sama.

### 6.4 Sainte-Laguë & Ambang Batas
- Pembagi bilangan ganjil 1, 3, 5, 7, …; kursi dialokasikan ke nilai hasil bagi tertinggi sebanyak `constituencies.seat_count`.
- Partai di bawah **4%** suara sah nasional tidak ikut alokasi (DPR RI). DPRD: tanpa ambang.
- Caleg terpilih: suara terbanyak internal partai sampai jumlah kursi partai; sinkronkan dengan `candidates.elected_status` bila ada, dan tandai selisih sebagai catatan kualitas data.
- Hasil hitung disajikan di semua halaman dapil (2019 & 2024, DPR RI/DPRD). Hasil disimpan ke `seat_allocation_runs`/`seat_allocations` (disetujui).

### 6.5 Akses & Autentikasi
- Publik: Dashboard dan semua level sampai **Kabupaten/Kota** (ringkas).
- **Kecamatan ke bawah diproteksi.** Tanpa login → halaman login berisi informasi akses: *kirim WA ke 62811945222*.
- Role (`users.role`, `user_access_bindings`):
| Role | Cakupan |
|---|---|
| Nasional | Semua data + CRUD user |
| Provinsi | 1 provinsi dipilih |
| Dapil DPR RI | 1 dapil dipilih |
| Kabupaten | 1 kabupaten dipilih |
- **Data contoh gratis:** DPR RI **Sumatera Selatan II** terbuka penuh sampai TPS tanpa batas akses berbayar.
- Keamanan: hash password (argon2/bcrypt), sesi token ter-hash, CSRF, rate-limit login, `access_expires_at`, opsi MFA (kolom sudah ada), `must_change_password`.
- Admin Nasional: CRUD user + binding wilayah.

### 6.6 Tracking Aktivitas
Setiap akses halaman user login dicatat: user, `route_template`, scope (wilayah/kontes), waktu, tipe event. Halaman admin menampilkan log & ringkasan (halaman terpopuler, user aktif).

### 6.7 Footer
WA **62811945222** · bagian dari **software-pilkada.com** · dibuat oleh **aswandi.or.id**.

## 7. Desain & UX
Elegan, modern, responsif (mobile-first), animasi masuk pada setiap section/card/header (fade-slide, stagger, counter angka, hover lift, transisi peta/grafik), skeleton loading, dark/light opsional, `prefers-reduced-motion` dihormati. Warna partai dari `election_parties.color`.

## 8. Non-Fungsional
- Performa: halaman tingkat atas < 2 dtk (p75); query dengan indeks, cache server (Nitro) untuk data statis; tabel besar (TPS 1,6 jt, vote_reports 10 jt) wajib paginasi/filter by parent, tanpa full scan.
- Peta: geometri dari `region_boundaries` (simplify/tile per level).
- Aksesibilitas WCAG AA, SEO (SSR Nuxt), keamanan OWASP, HTTPS di bedahsuara.id.
- Observabilitas: log error, audit (`audit_logs`).

## 9. Metrik Sukses
Kunjungan unik/bulan, konversi permintaan akses via WA, jumlah user aktif berbayar, waktu muat, kedalaman drill-down rata-rata.

## 10. Risiko & Mitigasi
| Risiko | Mitigasi |
|---|---|
| Data `partial` untuk 2019/2024/Pilkada | Tampilkan status ketersediaan & `data_quality_issues` |
| Query berat di tabel jutaan baris | Indeks, paginasi, cache, hanya baca per-tingkat |
| Cakupan Dapil↔Wilayah tidak 1:1 | Gunakan `constituency_regions.coverage`, jangan agregasi manual |
| Hasil Sainte-Laguë ≠ resmi KPU | Beri label "simulasi/kalkulasi" dan bandingkan `elected_status` |
| Kebocoran data berbayar | RBAC di server (bukan hanya UI) + tracking |

## 11. Pemetaan Data (hasil inspeksi skema `bedahsuara_gpt6`)
| Kebutuhan | Tabel/View |
|---|---|
| Pemilu/Pilkada | `elections` (2014 n/a, 2019, 2024, 2025=Pilkada 2024) |
| Wilayah (national 2, province 74, regency 1.288, district 14.737, village 167.389, tps 1.637.771) | `regions` (`level`, `parent_id`, `registered_voters`, `expected_tps`) |
| Dapil & kursi | `constituencies` (`chamber`, `seat_count`), `constituency_regions` |
| Partai & logo & warna | `parties`, `election_parties`, `election_party_assets` |
| Caleg | `candidates` (`elected_status`, `ballot_number`) |
| Suara per tingkat | `vote_reports` (`scope_level`, `region_id`, `constituency_id`), view `v_party_votes`, `v_candidate_votes` |
| Suara preferensi | `preferred_vote_reports`, `v_preferred_*` |
| Peta | `region_boundaries` (`geometry_json`) |
| Auth & tracking | `users`, `user_access_bindings`, `user_sessions`, `user_activity_events` |
| Kualitas data | `data_quality_issues`, `v_import_coverage` |
| Opsional (butuh konfirmasi tulis) | `seat_allocation_runs`, `seat_allocations` |

> Nilai pasti `scope_level`, `contest_type`, `chamber` perlu diverifikasi saat Sprint 0 (belum diinspeksi nilainya).

## 12. Keputusan Pemilik
1. **Akses gratis non-Sumsel II:** sampai level Kabupaten/Kota. Kecamatan ke bawah diproteksi. (Disetujui)
2. **Sainte-Laguë:** hasil boleh disimpan ke tabel yang sudah ada `seat_allocation_runs`/`seat_allocations` (bukan tabel baru). Ini satu-satunya tulisan ke tabel non-user yang diizinkan; data pemilu tetap read-only. (Disetujui)
3. **Harga:** tidak ditampilkan. Halaman info akses hanya mengarahkan ke WA 62811945222. (Disetujui)
4. **Caleg:** cukup nama atau inisial, tanpa foto. (Disetujui)

### Masih terbuka
- Nilai pasti `users.role`/`scope_kind` dan enum `scope_level`/`contest_type`/`chamber` (verifikasi di Sprint 0).
