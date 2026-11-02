<script setup lang="ts">
import { partyRanks } from '~/utils/partyRank'
const route = useRoute()
const year = Number(route.params.tahun)
const dapilId = Number(route.params.id)
const kecId = Number(route.params.kecId)
const nf = (n: number | undefined) => new Intl.NumberFormat('id-ID').format(n ?? 0)
const pf = (n: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n) + '%'

const waContact = useRuntimeConfig().public.waContact

// Cek autentikasi jika bukan Sumsel II
const { data: authData } = await useFetch<any>('/api/auth/me')
const isFreeDemo = computed(() => dapilId === 4874)
const isAllowed = computed(() => {
  if (isFreeDemo.value) return true
  const user = authData.value?.user
  if (!user) return false
  if (user.role === 'super_admin' || user.scope_kind === 'national') return true
  if (user.scope_kind === 'dpr_ri') return user.bindings?.some((b: any) => b.constituency_id === dapilId)
  return false
})

const { data } = await useFetch<any>(`/api/dpr-ri/${year}/dapil/${dapilId}/kecamatan/${kecId}`)
if (!data.value && isAllowed.value) throw createError({ statusCode: 404, statusMessage: 'Kecamatan tidak ditemukan', fatal: true })

const villageIds = (data.value?.villages ?? []).map((v: any) => v.regionId).join(',')
const { data: bounds, error: boundsError } = await useFetch<any[]>('/api/boundaries', { query: { year, ids: villageIds } })

const parties = computed<any[]>(() => data.value?.parties ?? [])
const totals = computed(() => Object.fromEntries(parties.value.map((p) => [p.id, p.totalVotes])))

const villageRows = computed(() =>
  (data.value?.villages ?? []).map((v: any) => ({
    key: v.regionId,
    name: v.name,
    total: v.total,
    votes: v.votes,
    to: `/pemilu/${year}/dpr-ri/dapil/${dapilId}/desa/${v.regionId}`
  }))
)

const villageTotals = totals
const ballotParties = computed(() => [...parties.value].sort((a, b) => (a.ballot_number ?? Infinity) - (b.ballot_number ?? Infinity)))
const maxVotes = computed(() => Math.max(0, ...parties.value.map(p => Number(p.totalVotes) || 0)))
const winners = computed(() => new Map((data.value?.villages ?? []).map((v: any) => {
  const ranks = partyRanks(v.votes)
  const leaders = parties.value.filter(p => ranks[p.id] === 1)
  return [v.regionId, leaders.length === 1 ? leaders[0] : null]
})))
const colorOf = (regionId: number) => (winners.value.get(regionId) as any)?.color || '#94a3b8'
const winningParties = computed(() => parties.value.filter(p => [...winners.value.values()].some((winner: any) => winner?.id === p.id)))
const topParties = (regionId: number) => {
  const village = (data.value?.villages ?? []).find((v: any) => v.regionId === regionId)
  if (!village) return []
  const ranks = partyRanks(village.votes)
  return parties.value.filter(p => ranks[p.id] != null && ranks[p.id]! <= 3)
    .map(p => ({ ...p, rank: ranks[p.id], votes: village.votes[p.id] }))
    .sort((a, b) => a.rank - b.rank || a.ballot_number - b.ballot_number)
}
const mapTooltip = (regionId: number, name: string) => {
  const top = topParties(regionId)
  return [name, 'Suara partai terbanyak:', ...(top.length ? top.map(p => `${p.rank}. ${p.name}: ${nf(p.votes)} suara`) : ['Data suara tidak tersedia'])].join('\n')
}
const openVillage = (regionId: number) => navigateTo(`/pemilu/${year}/dpr-ri/dapil/${dapilId}/desa/${regionId}`)
</script>

<template>
  <div>
    <!-- Proteksi Hak Akses untuk Non-Demo -->
    <div v-if="!isAllowed" class="mx-auto max-w-xl py-12">
      <div class="bs-card p-8 text-center space-y-4">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl">
          🔒
        </div>
        <h1 class="text-2xl font-black text-slate-900">Akses Terproteksi</h1>
        <p class="text-xs text-slate-600 leading-relaxed">
          Data suara partai dan TPS di tingkat kecamatan ke bawah diproteksi. Silakan masuk dengan akun Anda atau hubungi admin untuk aktivasi lisensi wilayah.
        </p>
        <div class="pt-2 flex flex-col gap-2">
          <NuxtLink :to="`/login?redirect=${$route.fullPath}`" class="rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800">
            Masuk Akun ➔
          </NuxtLink>
          <a :href="`https://wa.me/${waContact}?text=Halo%2C%20saya%20ingin%20akses%20kecamatan%20${kecId}`" target="_blank" rel="noopener" class="rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
            Hubungi WhatsApp: {{ waContact }}
          </a>
        </div>
      </div>
    </div>

    <!-- Tampilan Data Kecamatan -->
    <div v-else-if="data" class="space-y-8">
      <nav class="text-sm text-slate-500">
        <NuxtLink :to="`/pemilu/${year}/dpr-ri`" class="hover:underline">DPR RI {{ year }}</NuxtLink> ›
        <NuxtLink :to="`/pemilu/${year}/dpr-ri/dapil/${dapilId}`" class="hover:underline">{{ data.district.dapil_name }}</NuxtLink> ›
        <NuxtLink :to="`/pemilu/${year}/dpr-ri/dapil/${dapilId}/kabupaten/${data.district.regency_id}`" class="hover:underline">{{ data.district.regency_name }}</NuxtLink> ›
        {{ data.district.name }}
      </nav>

      <PageHeader 
        :title="`Kecamatan ${data.district.name}`" 
        :subtitle="`DPR RI Pemilu ${year} · ${data.district.regency_name} · Total Suara Partai ${nf(data.grandTotal)}`" 
      >
        <span v-if="isFreeDemo" class="mt-2 inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
          ★ Akses Penuh Demo Gratis (Sumatera Selatan II)
        </span>
      </PageHeader>

      <!-- Peta dan Grafik -->
      <section class="bs-card p-4 md:p-6">
        <h2 class="mb-2 text-lg font-bold text-slate-900">Peta Desa / Kelurahan Kecamatan {{ data.district.name }}</h2>
        <RegionMap v-if="bounds?.length" :items="bounds" :color-of="colorOf" :tooltip-text="mapTooltip" large @select="openVillage">
          <template #tooltip="{ regionId, name }">
            <p class="font-bold">{{ name }}</p><p class="mb-1 text-xs text-slate-300">Suara partai terbanyak</p>
            <ol v-if="topParties(regionId).length" class="space-y-1"><li v-for="p in topParties(regionId)" :key="p.id" class="flex items-center gap-2 text-xs"><span class="w-4 font-bold">{{ p.rank }}.</span><span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ backgroundColor: p.color || '#94a3b8' }" /><span class="flex-1">{{ p.name }}</span><span class="tabular-nums">{{ nf(p.votes) }}</span></li></ol>
            <p v-else class="text-xs text-slate-300">Data suara tidak tersedia.</p>
          </template>
        </RegionMap>
        <p v-else class="text-sm text-slate-600">{{ boundsError ? 'Peta tidak dapat dimuat.' : 'Batas desa / kelurahan tidak tersedia.' }}</p>
        <div class="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm"><span v-for="p in winningParties" :key="p.id" class="flex items-center gap-2"><span class="h-4 w-4 rounded border border-slate-300" :style="{ backgroundColor: p.color }" />{{ p.name }}</span><span class="flex items-center gap-2"><span class="h-4 w-4 rounded bg-slate-400" />Tidak tersedia atau seri</span></div>
        <p class="mt-2 text-xs text-slate-500">Warna menunjukkan suara partai tertinggi dalam laporan masing-masing desa / kelurahan. Klik wilayah untuk melihat rinciannya.</p>
      </section>

      <!-- Tabel Suara Partai per Desa/Kelurahan -->
      <section>
        <div class="mb-3">
          <h2 class="text-xl font-bold text-slate-900">Suara Partai per Desa / Kelurahan</h2>
          <p class="text-xs text-slate-500">Baris total menggunakan data langsung tingkat kecamatan.</p>
        </div>
        <p class="mb-3 text-sm text-slate-600">Penanda pada tiap baris: <span class="rounded bg-amber-100 px-2">1. tertinggi</span> <span class="rounded bg-slate-200 px-2">2. kedua</span> <span class="rounded bg-orange-100 px-2">3. ketiga</span>. Suara seri mendapat peringkat yang sama.</p>
        <PartyTable 
          :parties="parties" 
          :rows="villageRows" 
          :totals="villageTotals" 
          :year="year" 
          first-col="Desa / Kelurahan" 
          highlight-top
        />
      </section>

      <section class="bs-card p-4 md:p-6">
        <h2 class="mb-4 text-lg font-bold">Perolehan Suara Partai di {{ data.district.name }}</h2>
        <p class="mb-3 text-xs text-slate-500">Urutan sesuai nomor urut partai. Geser ke samping pada layar kecil.</p>
        <div class="overflow-x-auto"><div class="flex min-w-max items-end gap-2 border-b border-slate-200 px-1" role="list" aria-label="Grafik suara partai menurut nomor urut">
          <div v-for="p in ballotParties" :key="p.id" class="flex w-16 shrink-0 flex-col items-center" role="listitem" :aria-label="`${p.ballot_number}. ${p.name}: ${nf(p.totalVotes)} suara`">
            <div class="flex h-72 w-full flex-col items-center justify-end"><span class="mb-1 text-xs font-semibold tabular-nums">{{ nf(p.totalVotes) }}</span><div class="w-9 rounded-t-md" :style="{ height: `${maxVotes ? p.totalVotes / maxVotes * 240 : 0}px`, backgroundColor: p.color || '#64748b' }" /></div>
            <div class="flex flex-col items-center gap-1 py-2"><PartyLogo :name="p.name" :color="p.color" :year="year" :ballot="p.ballot_number" :size="38" /><span class="text-xs text-slate-500">{{ p.ballot_number }}</span></div>
          </div>
        </div></div>
      </section>

      <!-- Caleg per Partai di Kecamatan ini -->
      <section class="space-y-4">
        <h2 class="text-xl font-bold text-slate-900">Perolehan Suara Caleg di Kecamatan {{ data.district.name }}</h2>
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div v-for="p in parties" :key="p.id" class="bs-card min-w-0 overflow-x-auto">
            <div class="flex items-center gap-3 bg-slate-900 px-4 py-3 text-white">
              <PartyLogo :name="p.name" :color="p.color" :year="year" :ballot="p.ballot_number" :size="36" />
              <div>
                <div class="font-bold">{{ p.ballot_number }}. {{ p.name }}</div>
                <div class="text-xs text-white/70">Suara gambar partai: {{ nf(p.partyVotes) }}</div>
              </div>
              <div class="ml-auto text-right">
                <div class="text-xs text-white/70">Total Suara</div>
                <div class="text-lg font-extrabold text-amber-300">{{ nf(p.totalVotes) }}</div>
              </div>
            </div>
            <table class="min-w-full text-sm">
              <thead class="bg-slate-100 text-slate-700">
                <tr>
                  <th class="px-3 py-2 text-left">No</th>
                  <th class="px-3 py-2 text-left">Nama Caleg</th>
                  <th class="px-3 py-2 text-right">Suara Caleg</th>
                  <th class="px-3 py-2 text-right">% Internal</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in p.candidates" :key="c.id" class="border-t hover:bg-slate-50">
                  <td class="px-3 py-2 text-slate-500">{{ c.ballotNumber }}</td>
                  <td class="px-3 py-2 font-medium text-slate-800">{{ c.name }}</td>
                  <td class="px-3 py-2 text-right tabular-nums font-semibold">{{ nf(c.votes) }}</td>
                  <td class="px-3 py-2 text-right tabular-nums text-slate-600">{{ pf(c.pct) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
