# Dokumentasi Skema Database `bedahsuara_gpt6`

Hasil inspeksi langsung terhadap MySQL database `bedahsuara_gpt6` (read-only):

## 1. Tabel Utama & Statistik Baris
- `elections` (4 baris):
  - 2014 (`pemilu`, data_status: `not_available`)
  - 2019 (`pemilu`, data_status: `partial`)
  - 2024 (`pemilu`, data_status: `partial`)
  - 2025 (`pilkada`, year: 2024, data_status: `partial`)
- `regions` (~1.838.837 baris):
  - `national`: 2
  - `province`: 74
  - `regency`: 1.288
  - `district`: 14.737
  - `village`: 167.389
  - `tps`: 1.637.771
  - Enum `level`: `'national','province','regency','district','village','tps'`
  - Enum `region_kind`: `'kabupaten','kota','overseas'`
- `constituencies` (5.331 baris):
  - Enum `chamber`: `'dpr_ri','dprd_provinsi','dprd_kabupaten'`
  - Relasi ke `province_id`, `regency_id`, `seat_count`.
- `constituency_regions` (~4.838.724 baris):
  - Enum `coverage`: `'whole','partial','unspecified'`
- `parties` (26 baris) & `election_parties` (44 baris):
  - Memiliki `ballot_number`, `color`, `is_local`.
- `election_party_assets` (39 baris):
  - Memiliki `asset_path`, `source_url`, `verification_status`.
- `candidates` (~501.140 baris):
  - Enum `contest_type`: `'dpd','dpr_ri','dprd_provinsi','dprd_kabupaten'`
  - Enum `elected_status`: `'unknown','elected','not_elected'`
- `vote_reports` (~10.445.329 baris):
  - Enum `contest_type`: `'pilpres','dpd','dpr_ri','dprd_provinsi','dprd_kabupaten','pilgub','pilbup','pilwalkot'`
  - Enum `scope_level`: `'national','province','constituency','regency','district','village','tps'`
  - Enum `report_origin`: `'reported','reported_child','source_aggregate'`
  - `value_format`: `'party_components','party_totals','candidate_votes','ticket_votes'`
- `region_boundaries` (~71.534 baris):
  - `geometry_format`: `'leaflet_path'` (koordinat `[lat, lng]` poligon bertingkat)
- `users`, `user_sessions`, `user_access_bindings`, `user_activity_events`:
  - `users.role`: `'super_admin','viewer'`
  - `users.scope_kind`: `'national','province','regency','dpr_ri','dprd_provinsi','dprd_kabupaten'`
  - `users.status`: `'active','disabled','deleted'`
  - `user_activity_events`: mencatat aktivitas rute, event_type, scope_json.
  - `user_access_bindings`: batasan wilayah per user.
- `seat_allocation_runs` & `seat_allocations`:
  - Untuk menyimpan hasil Sainte-Laguë (disetujui pemilik, tanpa tabel baru).

## 2. Aturan Query Penting
Karena `vote_reports` memiliki 10+ juta baris:
1. Wajib memanfaatkan indeks gabungan:
   - `ix_vote_reports_dapil` (`election_id, contest_type, constituency_id, scope_level, value_format`)
   - `ix_vote_reports_region` (`election_id, contest_type, region_id, value_format`)
   - `ix_vote_reports_scope` (`election_id, contest_type, scope_level, source_id`)
2. Selalu gunakan `scope_level` yang sesuai dengan tingkat yang diminta. **Jangan pernah mengagregasi tingkat atas dari tingkat bawah**.

### Suara caleg DPRD Provinsi 2024

- Dapil Sumatera Selatan 1 (`constituency_id=5037`): laporan suara caleg pilihan adalah `11643497`, `scope_level='regency'`, `region_id=992515` (Kota Palembang), `report_origin='reported_child'`, `quality_status='usable'`.
- Sumber `740` adalah `pemilu2024.hr_dprd_pro_dapil`; metadata menyimpan `parent_scope='constituency'` dan `parent_source_row=7372`. Meskipun berasal dari sumber dapil, baris ini disimpan sebagai laporan Kabupaten/Kota.
- Terdapat 101 suara caleg yang cocok dengan master caleg dapil. Contoh: Ahmad Dailami 6.229, Prima Salam 31.898. Laporan `candidate_votes` dengan `scope_level='constituency'` belum tersedia untuk dapil ini.
- Halaman dapil membaca laporan Kabupaten/Kota melalui `preferred_vote_reports` dan menampilkan kolom wilayah asalnya. Angka tersebut tidak dijumlahkan atau diperlakukan sebagai suara dapil untuk penetapan kursi caleg.

### Status dan urutan kursi Sumatera Selatan 2 (5038)

- Atas instruksi eksplisit pemilik dalam chat, status 118 caleg dapil 5038 diperbarui dari lampiran Keputusan KPU Sumsel 74/2024, 28 Mei 2024, halaman 6: 7 `elected`, 111 `not_elected`. Ini status penetapan Pemilu 2024 pada keputusan tersebut, bukan daftar keanggotaan/PAW terkini.
- Sumber resmi: https://jdih.kpu.go.id/kepkpuprov/download/103229. Ketentuan: PKPU 6/2024 Pasal 13, 18, 19, 37, 38, 40.
- Tabel/field yang sudah ada mencukupi: `candidates.elected_status`, `seat_allocation_runs` (run `1`), `seat_allocations.candidate_id`, `seat_allocations.seat_number`. Tidak ada DDL.
- `input_report_id=11643189` adalah suara partai tingkat dapil; seluruh 18 partai cocok dengan `1811233`. Laporan caleg Kota Palembang `11643498` hanya untuk pemeriksaan silang angka pada lampiran resmi, tidak diagregasi menjadi suara dapil.
- `seat_number` menyimpan urutan alokasi Sainte-Lague dapil: Zaitun (1), Anwar Al Syadat (2), Nopianto (3), Muhammad Yansuri (4), Zulfikri Kadir (5), Tamtama (6), Fajar Febriansyah (7). Nomor ini berbeda dari nomor urut daftar pada SK. Urutan dalam partai dihitung dari `(divisor + 1) / 2`.
- `rules_json` menyimpan sumber keputusan, identitas caleg resmi, nomor daftar SK, hash masukan, fingerprint, serta status sebelum perubahan. Salinan sebelum perubahan ada di `docs/audits/sumsel2-seats-ed5f0fa378c9-before.json`.
- Skrip terbatas dapil ini: `node --env-file=.env --experimental-strip-types scripts/save-sumsel2-seats.mjs` untuk preview; tambah `--apply` untuk simpan. Transaksi memvalidasi dapil/tahun/partai/nomor DCT/source key/suara dan menolak versi berbeda, konflik status, atau seri. Menjalankan ulang snapshot yang sama menghasilkan `already_saved`.
- API hanya membaca hasil simpan; snapshot tidak digunakan jika identitas caleg, jumlah kursi, pembagi, suara masukan, atau urutan alokasi tidak lagi cocok.
- Verifikasi: 11 unit test lulus, pembacaan ulang 7 kursi dan 118 status cocok, HTTP API/SSR 200 beserta sumber dan status. Typecheck masih gagal pada berkas lain seperti konfigurasi tipe Node, halaman provinsi, repositori peta/DPRD, dan utilitas DB; berkas fitur ini tidak dilaporkan bermasalah. Tidak tersedia skrip lint pada `package.json`.

### Perhitungan kursi DPRD Provinsi 2024 (cakupan parsial)

- Atas instruksi eksplisit pemilik, hasil diterapkan untuk 103 dapil yang lolos pencocokan roster KPU Lampiran II dengan caleg di basis data, peringkat suara partai, jumlah kursi, dan laporan suara partai langsung tingkat dapil. Sumber calon dan peringkat: 38 dokumen KPU `L5.*` dalam `G:\Drive Saya\2026\data-suara-sumber-internet\2024\dprd-provinsi\lampiran-resmi`.
- Metode mengikuti PKPU 6/2024: alokasi kursi partai menggunakan Sainte-Laguë tanpa ambang batas 4% untuk DPRD Provinsi; calon yang memperoleh kursi mengikuti urutan suara caleg dalam partai sebagaimana dicatat di Lampiran II KPU. Nomor kursi tersimpan mengikuti urutan hasil Sainte-Laguë.
- Tersimpan 103 run, 774 alokasi kursi baru, dan status 10.765 caleg (774 `elected`, 9.991 `not_elected`). Run Sumsel II yang sudah ada tetap utuh; hitungan saat baca ulang menjadi 104 run dan 781 alokasi keseluruhan.
- Sebanyak 198 dapil 2024 belum diperbarui karena dokumen/roster tidak berhasil dicocokkan secara lengkap dan meyakinkan dengan data langsung. Ada 301 dapil elektoral di DB; satu entri tambahan `GORONTALO 6 (U)` tidak memiliki jumlah kursi dan tidak diproses. Parser mencatat 441 label sumber belum terselesaikan.
- Status caleg DPRD Provinsi 2019 belum diubah. Basis data tidak memiliki laporan suara caleg langsung tingkat dapil untuk 2019; laporan kabupaten/kota tidak dijumlahkan untuk menebak hasil dapil. Data kursi partai saja tidak cukup untuk menetapkan caleg penerima kursi.
- Skrip preview/apply: `scripts/update-dprd-provinsi-2024-seats.mjs`; data ekstrak sumber: `scripts/data/dprd-provinsi-2024-kpu-results.json`; parser: `scripts/parse-dprd-provinsi-2024-kpu.py`. Snapshot sebelum penerapan: `docs/audits/dprd-provinsi-2024-2026-10-31T08-57-27-197Z-before.json`.
- Verifikasi baca ulang DB: 104 run/104 dapil, 781 alokasi terisi seluruhnya dengan ID caleg unik. Status DPRD Provinsi 2024 setelah penerapan: 781 `elected`, 10.102 `not_elected`, 22.377 `unknown` (status Sumsel II yang telah ada termasuk di sini). Server web lokal pada port 3002 belum aktif saat pemeriksaan, sehingga tampilan HTTP belum diverifikasi.
