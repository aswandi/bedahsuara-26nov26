<script setup lang="ts">
const nf = (n: number | undefined) => new Intl.NumberFormat('id-ID').format(n ?? 0)
const { data } = await useFetch<any>('/api/dashboard')

const waContact = useRuntimeConfig().public.waContact

// Hitung persentase suara Pilpres
const pilpres2024Total = computed(() => (data.value?.pilpres2024 ?? []).reduce((a: number, b: any) => a + b.votes, 0))
const pilpres2019Total = computed(() => (data.value?.pilpres2019 ?? []).reduce((a: number, b: any) => a + b.votes, 0))

const pilpres2024Labels = computed(() => (data.value?.pilpres2024 ?? []).map((t: any) => `Paslon 0${t.ballotNumber}`))
const pilpres2024Values = computed(() => (data.value?.pilpres2024 ?? []).map((t: any) => t.votes))
const pilpres2024Colors = ['#0284c7', '#dc2626', '#16a34a']

const pilpres2019Labels = computed(() => (data.value?.pilpres2019 ?? []).map((t: any) => `Paslon 0${t.ballotNumber}`))
const pilpres2019Values = computed(() => (data.value?.pilpres2019 ?? []).map((t: any) => t.votes))
const pilpres2019Colors = ['#dc2626', '#0284c7']
</script>

<template>
  <div class="space-y-10">
    <!-- Hero Section -->
    <section class="bs-hero relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--bs-navy)] via-slate-900 to-blue-950 p-8 text-white shadow-2xl md:p-12">
      <div class="relative z-10 max-w-3xl space-y-4">
        <span class="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--bs-gold)] backdrop-blur">
          ⚡ Portal Intelijen & Bedah Data Pemilu
        </span>
        <h1 class="text-3xl font-black tracking-tight md:text-5xl">
          Eksplorasi Data Pemilu Indonesia Hingga Level <span class="text-[var(--bs-gold)]">TPS</span>
        </h1>
        <p class="text-base text-slate-300 md:text-lg">
          Akses visualisasi data Pemilu 2019, 2024 & Pilkada 2024. Dilengkapi peta wilayah interaktif, simulasi Sainte-Laguë per dapil, dan analisis elektoral komprehensif.
        </p>
        <div class="flex flex-wrap items-center gap-3 pt-2">
          <NuxtLink to="/pemilu/2024/dpr-ri" class="bs-card inline-flex items-center gap-2 rounded-xl bg-[var(--bs-red)] px-5 py-3 font-bold text-white shadow-lg transition hover:brightness-110">
            Mulai Eksplorasi DPR RI 2024 ➔
          </NuxtLink>
          <NuxtLink to="/pemilu/2024/dpr-ri/dapil/4874" class="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/10">
            ★ Akses Demo Gratis: Dapil Sumsel II
          </NuxtLink>
        </div>
      </div>
      <!-- Background Graphic Accents -->
      <div class="pointer-events-none absolute -bottom-16 -right-16 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl"></div>
      <div class="pointer-events-none absolute -top-16 -left-16 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl"></div>
    </section>

    <!-- Ringkasan Statistik Database Wilayah -->
    <section>
      <div class="mb-4">
        <h2 class="text-xl font-extrabold text-slate-900 md:text-2xl">Cakupan Wilayah Nasional</h2>
        <p class="text-xs text-slate-500 md:text-sm">Database hierarkis mulai dari tingkat pusat hingga TPS terdaftar</p>
      </div>

      <div class="bs-stagger grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <div class="bs-card p-4 text-center">
          <div class="text-xs font-semibold text-slate-400 uppercase">Provinsi</div>
          <div class="mt-1 text-2xl font-black text-slate-800">{{ nf(data?.regionCounts?.province) }}</div>
          <div class="text-[10px] text-emerald-600 font-medium">38 Provinsi + LN</div>
        </div>
        <div class="bs-card p-4 text-center">
          <div class="text-xs font-semibold text-slate-400 uppercase">Kab/Kota</div>
          <div class="mt-1 text-2xl font-black text-slate-800">{{ nf(data?.regionCounts?.regency) }}</div>
          <div class="text-[10px] text-slate-500">Kabupaten & Kota</div>
        </div>
        <div class="bs-card p-4 text-center">
          <div class="text-xs font-semibold text-slate-400 uppercase">Kecamatan</div>
          <div class="mt-1 text-2xl font-black text-slate-800">{{ nf(data?.regionCounts?.district) }}</div>
          <div class="text-[10px] text-amber-600 font-medium">Proteksi Login 🔒</div>
        </div>
        <div class="bs-card p-4 text-center">
          <div class="text-xs font-semibold text-slate-400 uppercase">Desa/Kel</div>
          <div class="mt-1 text-2xl font-black text-slate-800">{{ nf(data?.regionCounts?.village) }}</div>
          <div class="text-[10px] text-amber-600 font-medium">Proteksi Login 🔒</div>
        </div>
        <div class="bs-card p-4 text-center">
          <div class="text-xs font-semibold text-slate-400 uppercase">Titik TPS</div>
          <div class="mt-1 text-2xl font-black text-slate-800">{{ nf(data?.regionCounts?.tps) }}</div>
          <div class="text-[10px] text-amber-600 font-medium">Proteksi Login 🔒</div>
        </div>
        <div class="bs-card p-4 text-center bg-blue-50/50 border-blue-100">
          <div class="text-xs font-semibold text-blue-800 uppercase">Dapil DPR RI</div>
          <div class="mt-1 text-2xl font-black text-blue-900">{{ nf(data?.dprSeats2024?.totalDapil) }}</div>
          <div class="text-[10px] text-blue-700 font-bold">{{ nf(data?.dprSeats2024?.totalSeats) }} Kursi Diperebutkan</div>
        </div>
      </div>
    </section>

    <!-- Sorotan Pilpres 2024 vs 2019 -->
    <section class="bs-stagger grid gap-6 lg:grid-cols-2">
      <!-- Pilpres 2024 -->
      <div class="bs-card flex flex-col justify-between p-6">
        <div>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-slate-900">Perolehan Suara Pilpres 2024</h3>
            <span class="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">Nasional</span>
          </div>
          <p class="mt-1 text-xs text-slate-500">Total Suara Sah: {{ nf(pilpres2024Total) }}</p>
          
          <div class="mt-4">
            <VoteChart 
              :labels="pilpres2024Labels" 
              :values="pilpres2024Values" 
              :colors="pilpres2024Colors" 
              :horizontal="true" 
            />
          </div>

          <div class="mt-4 space-y-2">
            <div v-for="t in data?.pilpres2024" :key="t.ballotNumber" class="flex items-center justify-between rounded-lg bg-slate-50 p-2.5 text-xs">
              <div class="font-medium text-slate-800">
                <span class="font-bold text-slate-900">Paslon 0{{ t.ballotNumber }}:</span> {{ t.name }}
              </div>
              <div class="text-right tabular-nums font-bold text-slate-900">
                {{ nf(t.votes) }}
                <span class="text-[10px] font-normal text-slate-500 block">
                  ({{ ((t.votes / (pilpres2024Total || 1)) * 100).toFixed(2) }}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pilpres 2019 -->
      <div class="bs-card flex flex-col justify-between p-6">
        <div>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-slate-900">Perolehan Suara Pilpres 2019</h3>
            <span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">Nasional</span>
          </div>
          <p class="mt-1 text-xs text-slate-500">Total Suara Sah: {{ nf(pilpres2019Total) }}</p>

          <div class="mt-4">
            <VoteChart 
              :labels="pilpres2019Labels" 
              :values="pilpres2019Values" 
              :colors="pilpres2019Colors" 
              :horizontal="true" 
            />
          </div>

          <div class="mt-4 space-y-2">
            <div v-for="t in data?.pilpres2019" :key="t.ballotNumber" class="flex items-center justify-between rounded-lg bg-slate-50 p-2.5 text-xs">
              <div class="font-medium text-slate-800">
                <span class="font-bold text-slate-900">Paslon 0{{ t.ballotNumber }}:</span> {{ t.name }}
              </div>
              <div class="text-right tabular-nums font-bold text-slate-900">
                {{ nf(t.votes) }}
                <span class="text-[10px] font-normal text-slate-500 block">
                  ({{ ((t.votes / (pilpres2019Total || 1)) * 100).toFixed(2) }}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Navigasi Akses Cepat Kontes -->
    <section class="space-y-4">
      <div>
        <h2 class="text-xl font-extrabold text-slate-900 md:text-2xl">Akses Modul Pemilu & Pilkada</h2>
        <p class="text-xs text-slate-500 md:text-sm">Jelajahi perolehan kursi Sainte-Laguë dan data partai sesuai tingkat kontes</p>
      </div>

      <div class="bs-stagger grid gap-4 md:grid-cols-3">
        <!-- Pemilu 2024 -->
        <div class="bs-card p-6">
          <div class="flex items-center justify-between">
            <h3 class="font-black text-slate-900">PEMILU 2024</h3>
            <span class="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Tersedia</span>
          </div>
          <p class="mt-1 text-xs text-slate-500">Data Pemilihan Legislatif dan Presiden 2024.</p>
          <ul class="mt-4 space-y-2 text-sm font-medium">
            <li><NuxtLink to="/pemilu/2024/dpr-ri" class="flex items-center justify-between text-blue-700 hover:underline"><span>DPR RI (Peta, Sainte-Laguë & Caleg)</span> ➔</NuxtLink></li>
            <li><NuxtLink to="/pemilu/2024/pilpres" class="flex items-center justify-between text-blue-700 hover:underline"><span>Pilpres 2024</span> ➔</NuxtLink></li>
            <li><NuxtLink to="/pemilu/2024/dpd" class="flex items-center justify-between text-blue-700 hover:underline"><span>DPD RI</span> ➔</NuxtLink></li>
            <li><NuxtLink to="/pemilu/2024/dprd-provinsi" class="flex items-center justify-between text-blue-700 hover:underline"><span>DPRD Provinsi</span> ➔</NuxtLink></li>
            <li><NuxtLink to="/pemilu/2024/dprd-kabkota" class="flex items-center justify-between text-blue-700 hover:underline"><span>DPRD Kab/Kota</span> ➔</NuxtLink></li>
          </ul>
        </div>

        <!-- Pemilu 2019 -->
        <div class="bs-card p-6">
          <div class="flex items-center justify-between">
            <h3 class="font-black text-slate-900">PEMILU 2019</h3>
            <span class="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">Tersedia</span>
          </div>
          <p class="mt-1 text-xs text-slate-500">Arsip data pemilu 2019 untuk komparasi tren suara.</p>
          <ul class="mt-4 space-y-2 text-sm font-medium">
            <li><NuxtLink to="/pemilu/2019/dpr-ri" class="flex items-center justify-between text-blue-700 hover:underline"><span>DPR RI 2019</span> ➔</NuxtLink></li>
            <li><NuxtLink to="/pemilu/2019/pilpres" class="flex items-center justify-between text-blue-700 hover:underline"><span>Pilpres 2019</span> ➔</NuxtLink></li>
            <li><NuxtLink to="/pemilu/2019/dpd" class="flex items-center justify-between text-blue-700 hover:underline"><span>DPD RI 2019</span> ➔</NuxtLink></li>
            <li><NuxtLink to="/pemilu/2019/dprd-provinsi" class="flex items-center justify-between text-blue-700 hover:underline"><span>DPRD Provinsi 2019</span> ➔</NuxtLink></li>
            <li><NuxtLink to="/pemilu/2019/dprd-kabkota" class="flex items-center justify-between text-blue-700 hover:underline"><span>DPRD Kab/Kota 2019</span> ➔</NuxtLink></li>
          </ul>
        </div>

        <!-- Pilkada 2024 -->
        <div class="bs-card p-6">
          <div class="flex items-center justify-between">
            <h3 class="font-black text-slate-900">PILKADA 2024</h3>
            <span class="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Tersedia</span>
          </div>
          <p class="mt-1 text-xs text-slate-500">Pemilihan Gubernur, Bupati, dan Walikota Serentak 2024.</p>
          <ul class="mt-4 space-y-2 text-sm font-medium">
            <li><NuxtLink to="/pilkada/2024/pilgub" class="flex items-center justify-between text-blue-700 hover:underline"><span>Pilgub (Pemilihan Gubernur)</span> ➔</NuxtLink></li>
            <li><NuxtLink to="/pilkada/2024/pilkada" class="flex items-center justify-between text-blue-700 hover:underline"><span>Pilkada (Bupati / Walikota)</span> ➔</NuxtLink></li>
            <li class="pt-2 text-xs text-slate-400">Analisa & Strategi Kampanye <span class="rounded bg-slate-200 px-1 py-0.5 text-[9px] font-bold text-slate-600">Coming Soon</span></li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Banner Versi Berbayar & Informasi Kontak -->
    <section class="bs-card overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-[var(--bs-navy)] p-8 text-white">
      <div class="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div class="space-y-2 max-w-2xl">
          <span class="rounded bg-[var(--bs-gold)] px-2.5 py-1 text-xs font-bold text-slate-950">Akses Premium & Analisis Lengkap</span>
          <h2 class="text-2xl font-black md:text-3xl">Butuh Akses Data Detail Sampai Level Kecamatan & TPS?</h2>
          <p class="text-sm text-slate-300 leading-relaxed">
            Dapatkan akun akses berjenjang (Nasional, Provinsi, Dapil DPR RI, atau Kabupaten) untuk mengunduh data, melihat perolehan suara per TPS, dan mempersiapkan analisa kampanye Anda.
          </p>
        </div>
        <div class="shrink-0">
          <a :href="`https://wa.me/${waContact}?text=Halo%2C%20saya%20ingin%20akses%20data%20lengkap%20BedahSuara.id`" 
             target="_blank" 
             rel="noopener" 
             class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 font-bold text-white shadow-xl hover:bg-emerald-500 transition">
            Hubungi WhatsApp: {{ waContact }} ➔
          </a>
        </div>
      </div>
    </section>
  </div>
</template>
