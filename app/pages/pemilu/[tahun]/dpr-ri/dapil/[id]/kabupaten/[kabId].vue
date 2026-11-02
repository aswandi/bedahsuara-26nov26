<script setup lang="ts">
import { partyRanks } from '~/utils/partyRank'
const route = useRoute()
const year = Number(route.params.tahun)
const dapilId = Number(route.params.id)
const kabId = Number(route.params.kabId)
const nf = (n: number | undefined) => new Intl.NumberFormat('id-ID').format(n ?? 0)
const pf = (n: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n) + '%'

const { data } = await useFetch<any>(`/api/dpr-ri/${year}/dapil/${dapilId}/kabupaten/${kabId}`)
if (!data.value) throw createError({ statusCode: 404, statusMessage: 'Kabupaten tidak ditemukan', fatal: true })

const districtIds = (data.value?.districts ?? []).map((d: any) => d.regionId).join(',')
const { data: bounds, error: boundsError } = await useFetch<any[]>('/api/boundaries', { query: { year, ids: districtIds } })

const parties = computed<any[]>(() => data.value?.parties ?? [])
const totals = computed(() => Object.fromEntries(parties.value.map((p) => [p.id, p.totalVotes])))

const districtRows = computed(() =>
  (data.value?.districts ?? []).map((d: any) => ({
    key: d.regionId,
    name: d.name,
    total: d.total,
    votes: d.votes,
    to: `/pemilu/${year}/dpr-ri/dapil/${dapilId}/kecamatan/${d.regionId}`
  }))
)

const districtTotals = totals
const ballotParties = computed(() => [...parties.value].sort((a, b) => (a.ballot_number ?? Infinity) - (b.ballot_number ?? Infinity)))
const maxVotes = computed(() => Math.max(0, ...parties.value.map(p => Number(p.totalVotes) || 0)))
const winners = computed(() => new Map((data.value?.districts ?? []).map((district: any) => {
  const ranks = partyRanks(district.votes)
  const leaders = parties.value.filter(p => ranks[p.id] === 1)
  return [district.regionId, leaders.length === 1 ? leaders[0] : null]
})))
const colorOf = (regionId: number) => (winners.value.get(regionId) as any)?.color || '#94a3b8'
const winningParties = computed(() => parties.value.filter(p => [...winners.value.values()].some((winner: any) => winner?.id === p.id)))
const openDistrict = (regionId: number) => navigateTo(`/pemilu/${year}/dpr-ri/dapil/${dapilId}/kecamatan/${regionId}`)
const topParties = (regionId: number) => {
  const district = (data.value?.districts ?? []).find((d: any) => d.regionId === regionId)
  if (!district) return []
  const ranks = partyRanks(district.votes)
  return parties.value.filter(p => ranks[p.id] != null && ranks[p.id]! <= 3)
    .map(p => ({ ...p, rank: ranks[p.id], votes: district.votes[p.id] }))
    .sort((a, b) => a.rank - b.rank || a.ballot_number - b.ballot_number)
}
const mapTooltip = (regionId: number, name: string) => {
  const top = topParties(regionId)
  return [name, 'Suara partai terbanyak:', ...(top.length ? top.map(p => `${p.rank}. ${p.name}: ${nf(p.votes)} suara`) : ['Data suara tidak tersedia'])].join('\n')
}
</script>

<template>
  <div v-if="data" class="space-y-8">
    <nav class="text-sm text-slate-500">
      <NuxtLink :to="`/pemilu/${year}/dpr-ri`" class="hover:underline">DPR RI {{ year }}</NuxtLink> ›
      <NuxtLink :to="`/pemilu/${year}/dpr-ri/dapil/${dapilId}`" class="hover:underline">{{ data.regency.dapil_name }}</NuxtLink> ›
      {{ data.regency.name }}
    </nav>

    <PageHeader 
      :title="data.regency.name" 
      :subtitle="`DPR RI Pemilu ${year} · ${data.regency.dapil_name} · Total Suara Partai ${nf(data.grandTotal)}`" 
    />

    <!-- Peta dan Grafik -->
    <div class="bs-stagger grid grid-cols-1 gap-6">
      <section class="bs-card p-4 md:p-6">
        <h2 class="mb-2 text-lg font-bold text-slate-900">Peta Kecamatan {{ data.regency.name }}</h2>
        <RegionMap v-if="bounds?.length" :items="bounds" :color-of="colorOf" :tooltip-text="mapTooltip" large @select="openDistrict">
          <template #tooltip="{ regionId, name }">
            <p class="font-bold">{{ name }}</p>
            <p class="mb-1 text-xs text-slate-300">Suara partai terbanyak</p>
            <ol v-if="topParties(regionId).length" class="space-y-1">
              <li v-for="p in topParties(regionId)" :key="p.id" class="flex items-center gap-2 text-xs">
                <span class="w-4 font-bold">{{ p.rank }}.</span><span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ backgroundColor: p.color || '#94a3b8' }" /><span class="flex-1">{{ p.name }}</span><span class="tabular-nums">{{ nf(p.votes) }}</span>
              </li>
            </ol>
            <p v-else class="text-xs text-slate-300">Data suara tidak tersedia.</p>
          </template>
        </RegionMap>
        <p v-else class="text-sm text-slate-600">{{ boundsError ? 'Peta tidak dapat dimuat.' : 'Batas kecamatan tidak tersedia.' }}</p>
        <div class="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <span v-for="p in winningParties" :key="p.id" class="flex items-center gap-2"><span class="h-4 w-4 rounded border border-slate-300" :style="{ backgroundColor: p.color }" />{{ p.name }}</span>
          <span class="flex items-center gap-2"><span class="h-4 w-4 rounded bg-slate-400" />Tidak tersedia atau seri</span>
        </div>
        <p class="mt-2 text-xs text-slate-500">Warna menunjukkan suara partai tertinggi pada laporan masing-masing kecamatan. Klik wilayah untuk melihat rinciannya.</p>
      </section>
    </div>

    <!-- Tabel Suara Partai per Kecamatan -->
    <section>
      <div class="mb-3 flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-slate-900">Suara Partai per Kecamatan</h2>
          <p class="text-xs text-slate-500">Klik nama kecamatan untuk melihat rincian TPS (Kecamatan terproteksi login kecuali Sumsel II)</p>
        </div>
      </div>
      <p class="mb-3 text-sm text-slate-600">Penanda pada tiap baris: <span class="rounded bg-amber-100 px-2">1. tertinggi</span> <span class="rounded bg-slate-200 px-2">2. kedua</span> <span class="rounded bg-orange-100 px-2">3. ketiga</span>. Suara seri mendapat peringkat yang sama.</p>
      <PartyTable 
        :parties="parties" 
        :rows="districtRows" 
        :totals="districtTotals" 
        :year="year" 
        first-col="Kecamatan" 
        highlight-top
      />
    </section>

    <section class="bs-card p-4 md:p-6">
      <h2 class="mb-4 text-lg font-bold text-slate-900">Perolehan Suara Partai di {{ data.regency.name }}</h2>
      <p class="mb-3 text-xs text-slate-500">Urutan sesuai nomor urut partai. Geser ke samping pada layar kecil.</p>
      <div class="overflow-x-auto">
        <div class="flex min-w-max items-end gap-2 border-b border-slate-200 px-1" role="list" aria-label="Grafik suara partai menurut nomor urut">
          <div v-for="p in ballotParties" :key="p.id" class="flex w-16 shrink-0 flex-col items-center" role="listitem" :aria-label="`${p.ballot_number}. ${p.name}: ${nf(p.totalVotes)} suara`">
            <div class="flex h-72 w-full flex-col items-center justify-end">
              <span class="mb-1 text-xs font-semibold tabular-nums">{{ nf(p.totalVotes) }}</span>
              <div class="w-9 rounded-t-md" :style="{ height: `${maxVotes ? p.totalVotes / maxVotes * 240 : 0}px`, backgroundColor: p.color || '#64748b' }" />
            </div>
            <div class="flex flex-col items-center gap-1 py-2"><PartyLogo :name="p.name" :color="p.color" :year="year" :ballot="p.ballot_number" :size="38" /><span class="text-xs text-slate-500">{{ p.ballot_number }}</span></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Caleg per Partai di Kabupaten ini -->
    <section class="space-y-4">
      <h2 class="text-xl font-bold text-slate-900">Perolehan Suara Caleg di {{ data.regency.name }}</h2>
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
                <th class="px-3 py-2 text-left">Nama Calon Legislatif</th>
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
</template>
