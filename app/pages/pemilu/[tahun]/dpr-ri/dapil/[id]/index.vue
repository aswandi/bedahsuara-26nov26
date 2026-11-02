<script setup lang="ts">
import { partyRanks } from '~/utils/partyRank'
const route = useRoute()
const year = Number(route.params.tahun)
const id = Number(route.params.id)
const nf = (n: number | undefined) => new Intl.NumberFormat('id-ID').format(n ?? 0)
const pf = (n: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n) + '%'
const { data } = await useFetch<any>(`/api/dpr-ri/${year}/dapil/${id}`)
if (!data.value) throw createError({ statusCode: 404, statusMessage: 'Dapil tidak ditemukan', fatal: true })
const { data: bounds } = await useFetch<any[]>('/api/boundaries', { query: { year, dapil: id } })

const parties = computed<any[]>(() => data.value?.parties ?? [])
const totals = computed(() => Object.fromEntries(parties.value.map((p) => [p.id, p.totalVotes])))
const cellMap = computed(() => {
  const m = new Map<string, any>()
  for (const c of data.value?.cells ?? []) m.set(`${c.partyId}:${c.divisor}`, c)
  return m
})
const names2024: Record<number, string> = { 1: 'PKB', 2: 'Gerindra', 3: 'PDI-P', 4: 'Golkar', 5: 'NasDem', 6: 'Buruh', 7: 'Gelora', 8: 'PKS', 9: 'PKN', 10: 'Hanura', 11: 'Garuda', 12: 'PAN', 13: 'PBB', 14: 'Demokrat', 15: 'PSI', 16: 'Perindo', 17: 'PPP', 24: 'Ummat' }
const shortName = (p: any) => year === 2024 ? (names2024[p.ballot_number] ?? p.name) : p.name.replace(/^Partai /i, '')
const ballotParties = computed(() => [...parties.value].sort((a, b) => (a.ballot_number ?? Infinity) - (b.ballot_number ?? Infinity)))
const maxVotes = computed(() => Math.max(0, ...parties.value.map(p => Number(p.totalVotes) || 0)))
const regRows = computed(() =>
  (data.value?.regencies ?? []).map((r: any) => ({ key: r.regionId, name: r.name, total: r.total, votes: r.votes, to: `/pemilu/${year}/dpr-ri/dapil/${id}/kabupaten/${r.regionId}` }))
)
// Baris total (kedua) memakai total suara partai tingkat Dapil apa adanya, bukan hasil penjumlahan kabupaten.
const regTotals = totals
const winners = computed(() => new Map((data.value?.regencies ?? []).map((r: any) => {
  const ranks = partyRanks(r.votes)
  const leaders = parties.value.filter(p => ranks[p.id] === 1)
  return [r.regionId, leaders.length === 1 ? leaders[0] : null]
})))
const colorOf = (rid: number) => (winners.value.get(rid) as any)?.color || '#94a3b8'
const winningParties = computed(() => parties.value.filter(p => [...winners.value.values()].some((winner: any) => winner?.id === p.id)))
const topParties = (regionId: number) => {
  const region = (data.value?.regencies ?? []).find((r: any) => r.regionId === regionId)
  if (!region) return []
  const ranks = partyRanks(region.votes)
  return parties.value.filter(p => ranks[p.id] != null && ranks[p.id]! <= 3)
    .map(p => ({ ...p, rank: ranks[p.id], votes: region.votes[p.id] }))
    .sort((a, b) => a.rank - b.rank || a.ballot_number - b.ballot_number)
}
const mapTooltip = (regionId: number, name: string) => {
  const top = topParties(regionId)
  return [name, 'Suara partai terbanyak:', ...(top.length ? top.map(p => `${p.rank}. ${shortName(p)}: ${nf(p.votes)} suara`) : ['Data suara tidak tersedia'])].join('\n')
}
</script>

<template>
  <div v-if="data">
    <nav class="mb-3 text-sm text-slate-500">
      <NuxtLink :to="`/pemilu/${year}/dpr-ri`" class="hover:underline">DPR RI {{ year }}</NuxtLink> ›
      <NuxtLink :to="`/pemilu/${year}/dpr-ri/provinsi/${data.dapil.province_id}`" class="hover:underline">{{ data.dapil.province_name }}</NuxtLink> ›
      {{ data.dapil.name }}
    </nav>
    <PageHeader :title="data.dapil.name" :subtitle="`DPR RI Pemilu ${year} · ${data.dapil.seat_count} kursi · Total suara sah partai ${nf(data.grandTotal)}`" />

    <div class="bs-stagger grid grid-cols-1 gap-6">
      <section class="bs-card p-4 md:p-6"><h2 class="mb-2 text-lg font-bold">Peta Kabupaten/Kota</h2>
        <RegionMap v-if="bounds?.length" :items="bounds" :color-of="colorOf" :tooltip-text="mapTooltip" large @select="(rid: number) => navigateTo(`/pemilu/${year}/dpr-ri/dapil/${id}/kabupaten/${rid}`)">
          <template #tooltip="{ regionId, name }">
            <p class="font-bold">{{ name }}</p>
            <p class="mb-1 text-xs text-slate-300">Suara partai terbanyak</p>
            <ol v-if="topParties(regionId).length" class="space-y-1">
              <li v-for="p in topParties(regionId)" :key="p.id" class="flex items-center gap-2 text-xs">
                <span class="w-4 font-bold">{{ p.rank }}.</span><span class="h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: p.color || '#94a3b8' }" /><span class="flex-1">{{ shortName(p) }}</span><span class="tabular-nums">{{ nf(p.votes) }}</span>
              </li>
            </ol>
            <p v-else class="text-xs text-slate-300">Data suara tidak tersedia.</p>
          </template>
        </RegionMap>
        <p v-else class="text-sm text-slate-600">Batas wilayah tidak tersedia.</p>
        <div class="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm"><span v-for="p in winningParties" :key="p.id" class="flex items-center gap-2"><span class="h-4 w-4 rounded border border-slate-300" :style="{ backgroundColor: p.color }" />{{ shortName(p) }}</span><span class="flex items-center gap-2"><span class="h-4 w-4 rounded bg-slate-400" />Tidak tersedia atau seri</span></div>
        <p class="mt-2 text-xs text-slate-500">Warna menunjukkan suara partai tertinggi pada laporan masing-masing kabupaten/kota. Klik wilayah untuk melihat rinciannya.</p>
      </section>
      <section>
        <h2 class="mb-2 text-xl font-bold">Suara Partai per Kabupaten/Kota</h2>
        <p class="mb-3 text-sm text-slate-600">Penanda pada tiap baris: <span class="rounded bg-amber-100 px-2">1. tertinggi</span> <span class="rounded bg-slate-200 px-2">2. kedua</span> <span class="rounded bg-orange-100 px-2">3. ketiga</span>. Suara seri mendapat peringkat yang sama.</p>
        <PartyTable :parties="parties" :rows="regRows" :totals="regTotals" :year="year" first-col="Kabupaten/Kota" highlight-top />
      </section>
      <section class="bs-card p-4 md:p-6"><h2 class="mb-4 text-lg font-bold">Suara Partai di Dapil</h2>
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
    </div>

    <!-- Sainte-Laguë -->
    <h2 class="mb-2 mt-8 text-xl font-bold">Perhitungan Sainte-Laguë</h2>
    <p class="mb-3 text-sm text-slate-600">
      Pembagi 1, 3, 5, 7 dst. Hanya partai yang lolos ambang parlemen {{ data.threshold }}% yang diikutkan.
      <b v-if="data.tie" class="text-red-600">Terdapat nilai seri pada batas kursi terakhir.</b>
    </p>
    <div class="bs-card overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead class="sticky top-0 bg-slate-900 text-white">
          <tr>
            <th class="px-3 py-2 text-left">Partai</th>
            <th class="px-3 py-2 text-right">Suara</th>
            <th v-for="d in data.divisors" :key="d" class="px-3 py-2 text-right">÷ {{ d }}</th>
            <th class="px-3 py-2 text-right">Kursi</th>
          </tr>
          <tr class="bg-slate-800 font-semibold text-amber-300">
            <td class="px-3 py-2">Total Suara</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ nf(data.grandTotal) }}</td>
            <td :colspan="data.divisors.length" />
            <td class="px-3 py-2 text-right">{{ data.dapil.seat_count }}</td>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in parties" :key="p.id" class="border-t" :class="p.passedThreshold ? '' : 'opacity-50'">
            <td class="px-3 py-2"><div class="flex items-center gap-2" :title="p.name"><PartyLogo :name="p.name" :color="p.color" :year="year" :ballot="p.ballot_number" :size="32" />{{ shortName(p) }}</div></td>
            <td class="px-3 py-2 text-right tabular-nums">{{ nf(p.totalVotes) }}</td>
            <td v-for="d in data.divisors" :key="d" class="px-3 py-2 text-right tabular-nums">
              <template v-if="cellMap.get(`${p.id}:${d}`)">
                <span :class="cellMap.get(`${p.id}:${d}`).seatNo ? 'rounded bg-emerald-100 px-1 font-bold text-emerald-700' : ''">
                  {{ nf(Math.round(cellMap.get(`${p.id}:${d}`).quotient)) }}
                  <sup v-if="cellMap.get(`${p.id}:${d}`).seatNo">{{ cellMap.get(`${p.id}:${d}`).seatNo }}</sup>
                </span>
              </template>
              <span v-else>–</span>
            </td>
            <td class="px-3 py-2 text-right font-bold">{{ p.passedThreshold ? p.seats : 'tidak lolos 4%' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Tabel per partai -->
    <h2 class="mb-2 mt-8 text-xl font-bold">Caleg per Partai</h2>
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div v-for="p in parties" :key="p.id" class="bs-card min-w-0 overflow-x-auto">
        <div class="flex items-center gap-3 bg-slate-900 px-4 py-3 text-white">
          <PartyLogo :name="p.name" :color="p.color" :year="year" :ballot="p.ballot_number" :size="40" />
          <div><div class="font-bold">{{ p.ballot_number }}. {{ p.name }}</div><div class="text-xs text-white/70">{{ p.seats }} kursi</div></div>
          <div class="ml-auto text-right"><div class="text-xs text-white/70">Suara gambar partai</div><div class="font-semibold tabular-nums">{{ nf(p.partyVotes) }}</div><div class="mt-1 text-xs text-white/70">Total suara partai</div><div class="text-lg font-extrabold text-amber-300">{{ nf(p.totalVotes) }}</div></div>
        </div>
        <table class="min-w-full text-sm">
          <thead class="bg-slate-100"><tr><th class="px-3 py-2 text-left">No</th><th class="px-3 py-2 text-left">Caleg</th><th class="px-3 py-2 text-right">Suara</th><th class="px-3 py-2 text-right">%</th><th class="px-3 py-2 text-center">Status</th></tr></thead>
          <tbody>
            <tr v-for="c in p.candidates" :key="c.id" class="border-t" :class="c.elected ? 'bg-emerald-50' : ''">
              <td class="px-3 py-2">{{ c.ballotNumber }}</td>
              <td class="px-3 py-2 font-medium">{{ c.name }}</td>
              <td class="px-3 py-2 text-right tabular-nums">{{ nf(c.votes) }}</td>
              <td class="px-3 py-2 text-right tabular-nums">{{ pf(c.pct) }}</td>
              <td class="px-3 py-2 text-center"><span :class="c.elected ? 'rounded bg-emerald-600 px-2 py-0.5 text-xs text-white' : 'text-xs text-slate-400'">{{ c.elected ? 'Terpilih' : 'Tidak' }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>
