<script setup lang="ts">
import { partyRanks } from '~/utils/partyRank'
const route = useRoute()
const year = Number(route.params.tahun)
if (year !== 2024) throw createError({ statusCode: 404, statusMessage: 'Tahun tidak tersedia', fatal: true })
const id = Number(route.params.id)
const nf = (n: number) => new Intl.NumberFormat('id-ID').format(n)
const { data } = await useFetch<any>(`/api/dprd-provinsi/${year}/provinces/${id}`)
const { data: bounds } = await useFetch<any[]>('/api/boundaries', { query: { year, parent: id, childLevel: 'regency' } })
const totalSeats = computed(() => (data.value?.dapil ?? []).reduce((sum: number, d: any) => sum + Number(d.seat_count), 0))
const parties = computed<any[]>(() => data.value?.parties ?? [])
const totals = computed<Record<number, number>>(() => Object.fromEntries(parties.value.map(p => [p.id, (data.value?.dapil ?? []).reduce((sum: number, d: any) => sum + (d.complete ? Number(d.votes[p.id] ?? 0) : 0), 0)])))
const totalPartySeats = computed<Record<number, number>>(() => Object.fromEntries(parties.value.map(p => [p.id, (data.value?.dapil ?? []).reduce((sum: number, d: any) => sum + (d.complete ? Number(d.partySeats[p.id] ?? 0) : 0), 0)])))
const maxVotes = computed(() => Math.max(0, ...Object.values(totals.value)))
const nfCompact = (n: number) => new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
const ranks = (d: any) => d.complete ? partyRanks(d.votes) : {}
const regencyById = computed<Record<number, any>>(() => Object.fromEntries((data.value?.regencyWinners ?? []).map((r: any) => [Number(r.regionId), r])))
const regencyColor = (regionId: number) => {
  const result = regencyById.value[regionId]
  return result?.complete && !result.tied ? (result.winnerPartyColor || '#64748b') : '#cbd5e1'
}
const regencyTooltip = (regionId: number, name: string) => {
  const result = regencyById.value[regionId]
  if (!result?.complete) return `${name} · pemenang belum tersedia`
  if (result.tied) return `${name} · suara tertinggi seri`
  return `${name} · ${result.winnerPartyName} · ${nf(result.votes)} suara`
}
const winningParties = computed(() => {
  const counts = new Map<number, { party: any; count: number }>()
  for (const result of Object.values(regencyById.value)) {
    if (!result.complete || result.tied || result.winnerPartyIds.length !== 1) continue
    const id = Number(result.winnerPartyIds[0])
    const party = parties.value.find(p => Number(p.id) === id)
    if (!party) continue
    const current = counts.get(id) ?? { party, count: 0 }
    current.count++
    counts.set(id, current)
  }
  return [...counts.values()].sort((a, b) => a.party.ballot_number - b.party.ballot_number)
})
const regencyRows = computed<any[]>(() => Object.values(regencyById.value).sort((a, b) => a.regionName.localeCompare(b.regionName, 'id')))
const regencyParties = computed(() => parties.value
  .filter(p => !p.is_local || data.value?.province.name === 'ACEH')
  .sort((a, b) => a.ballot_number - b.ballot_number))
const regencyRanks = (region: any) => region.complete ? partyRanks(region.partyVotes) : {}
</script>

<template>
  <div v-if="data">
    <nav class="mb-3 text-sm text-slate-500"><NuxtLink :to="`/pemilu/${year}/dprd-provinsi`" class="hover:underline">DPRD Provinsi {{ year }}</NuxtLink> › {{ data.province.name }}</nav>
    <PageHeader :title="`Dapil DPRD Provinsi — ${data.province.name}`" :subtitle="`${data.dapil.length} dapil · ${nf(totalSeats)} kursi`" />
    <div class="bs-stagger grid grid-cols-1 gap-6">
      <section class="bs-card p-4 md:p-6">
        <h2 class="mb-2 text-lg font-bold">Pemenang Partai per Kabupaten/Kota</h2>
        <p v-if="bounds?.length" class="mb-3 text-sm text-slate-600">Warna menunjukkan partai dengan suara tertinggi dari laporan langsung tingkat kabupaten/kota.</p>
        <RegionMap v-if="bounds?.length" :items="bounds" :color-of="regencyColor" :tooltip-text="regencyTooltip" large />
        <p v-else class="text-sm text-slate-500">Batas kabupaten/kota belum tersedia.</p>
        <div v-if="winningParties.length" class="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-200 pt-4">
          <div v-for="item in winningParties" :key="item.party.id" class="flex items-center gap-2 text-sm">
            <span class="h-3 w-3 rounded-sm" :style="{ backgroundColor: item.party.color || '#64748b' }" />
            <PartyLogo :name="item.party.name" :color="item.party.color" :year="year" :ballot="item.party.ballot_number" :size="24" />
            <span>{{ item.party.name }}</span><span class="text-slate-500">{{ item.count }} kab/kota</span>
          </div>
        </div>
      </section>
      <section class="bs-card p-4 md:p-6"><h2 class="mb-2 text-lg font-bold">Suara Partai di {{ data.province.name }}</h2><p class="mb-3 text-sm text-slate-600">Jumlah dari laporan dapil lengkap. Partai lokal hanya berlaku di Aceh.</p><div class="overflow-x-auto"><div class="flex min-w-max items-end gap-3 border-b px-2"><div v-for="party in parties" :key="party.id" class="flex w-20 shrink-0 flex-col items-center"><div class="flex h-72 w-full flex-col items-center justify-end"><span class="mb-1 text-xs">{{ nfCompact(totals[party.id] ?? 0) }}</span><div class="w-12 rounded-t-md" :style="{ height: `${maxVotes ? (totals[party.id] ?? 0) / maxVotes * 240 : 0}px`, backgroundColor: party.color || '#64748b' }" /></div><PartyLogo :name="party.name" :color="party.color" :year="year" :ballot="party.ballot_number" :size="40" /><span class="text-xs">{{ party.ballot_number }}</span></div></div></div></section>
    </div>
    <section class="bs-card mt-6 p-4 md:p-6">
      <h2 class="mb-2 text-lg font-bold">Suara Partai per Kabupaten/Kota</h2>
      <p class="mb-4 text-sm text-slate-600">Setiap baris memakai laporan langsung tingkat kabupaten/kota. Penanda 1–3 menunjukkan urutan suara terbanyak; nilai seri mendapat peringkat yang sama. Geser tabel ke samping untuk melihat seluruh partai.</p>
      <div class="overflow-x-auto">
        <table class="min-w-max text-sm">
          <thead class="sticky top-0 bg-slate-900 text-white">
            <tr>
              <th class="sticky left-0 z-20 w-12 min-w-12 bg-slate-900 px-3 py-2 text-right">No</th>
              <th class="sticky left-12 z-20 bg-slate-900 px-3 py-2 text-left">Kabupaten/Kota</th>
              <th class="min-w-20 px-3 py-2 text-center">Pemenang</th>
              <th v-for="party in regencyParties" :key="party.id" class="min-w-24 px-2 py-2">
                <div class="flex items-center justify-center"><PartyLogo :name="party.name" :color="party.color" :year="year" :ballot="party.ballot_number" :size="30" /></div>
              </th>
              <th class="min-w-32 px-3 py-2 text-right">Total Suara Wilayah</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(region, index) in regencyRows" :key="region.regionId" class="border-t border-slate-200">
              <td class="sticky left-0 z-10 w-12 min-w-12 bg-white px-3 py-2 text-right text-slate-500 tabular-nums">{{ index + 1 }}</td>
              <th class="sticky left-12 z-10 bg-white px-3 py-2 text-left">{{ region.regionName }}</th>
              <td class="px-3 py-2 text-center">
                <span v-if="region.complete && !region.tied" class="inline-flex justify-center"><PartyLogo :name="region.winnerPartyName" :color="region.winnerPartyColor" :year="year" :ballot="regencyParties.find(p => Number(p.id) === Number(region.winnerPartyIds[0]))?.ballot_number" :size="26" /></span>
                <span v-else class="text-slate-500">{{ region.complete ? 'Seri' : 'Tidak tersedia' }}</span>
              </td>
              <td v-for="party in regencyParties" :key="party.id" class="px-2 py-2 text-right tabular-nums">
                <template v-if="region.complete"><span v-if="regencyRanks(region)[party.id] <= 3" class="mr-1 rounded bg-amber-100 px-1 text-amber-900">{{ regencyRanks(region)[party.id] }}</span>{{ nf(region.partyVotes[party.id] ?? 0) }}</template>
                <span v-else>—</span>
              </td>
              <td class="px-3 py-2 text-right font-semibold tabular-nums">{{ region.complete ? nf(region.totalVotes) : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <section class="bs-card mt-6 overflow-x-auto"><h2 class="p-4 text-lg font-bold">Suara Partai per Dapil</h2><table class="min-w-max text-sm"><thead class="sticky top-0 bg-slate-900 text-white"><tr><th class="sticky left-0 bg-slate-900 px-3 py-2 text-left">Dapil</th><th class="px-3 py-2 text-right">Kursi</th><th v-for="p in parties" :key="p.id" class="min-w-24 px-2 py-2"><div class="flex flex-col items-center gap-1"><PartyLogo :name="p.name" :color="p.color" :year="year" :ballot="p.ballot_number" :size="30" /><span>{{ p.ballot_number }}</span></div></th></tr><tr class="bg-slate-800 font-semibold text-amber-300"><th class="sticky left-0 bg-slate-800 px-3 py-2 text-left">Total Suara</th><td /><td v-for="p in parties" :key="p.id" class="px-2 py-2 text-right">{{ nf(totals[p.id] ?? 0) }}</td></tr></thead><tbody><tr v-for="d in data.dapil" :key="d.id" class="border-t"><th class="sticky left-0 bg-white px-3 py-2 text-left"><NuxtLink :to="`/pemilu/${year}/dprd-provinsi/dapil/${d.id}`" class="font-medium text-blue-700 hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">{{ d.name }}</NuxtLink><span v-if="d.source" class="block text-xs text-blue-700">Sumber: Keputusan KPU No. 1050/2024</span><span v-if="d.conflict" class="block text-xs text-amber-700">Laporan berkonflik</span></th><td class="px-3 py-2 text-right">{{ d.seat_count }}</td><td v-for="p in parties" :key="p.id" class="px-2 py-2 text-right tabular-nums"><template v-if="p.is_local && data.province.name !== 'ACEH'">—</template><template v-else-if="d.complete"><span v-if="ranks(d)[p.id] <= 3" class="mr-1 rounded bg-amber-100 px-1">{{ ranks(d)[p.id] }}</span>{{ nf(d.votes[p.id] ?? 0) }}</template><span v-else>—</span></td></tr></tbody></table></section>
    <section class="bs-card mt-6 overflow-x-auto"><h2 class="p-4 text-lg font-bold">Kursi Partai per Dapil</h2><table class="min-w-max text-sm"><thead class="sticky top-0 bg-slate-900 text-white"><tr><th class="sticky left-0 bg-slate-900 px-3 py-2 text-left">Dapil</th><th class="px-3 py-2 text-right">Total Kursi</th><th v-for="p in parties" :key="p.id" class="min-w-24 px-2 py-2"><div class="flex flex-col items-center gap-1"><PartyLogo :name="p.name" :color="p.color" :year="year" :ballot="p.ballot_number" :size="30" /><span>{{ p.ballot_number }}</span></div></th></tr><tr class="bg-slate-800 font-semibold text-amber-300"><th class="sticky left-0 bg-slate-800 px-3 py-2 text-left">Kursi Terhitung</th><td class="px-3 py-2 text-right">{{ Object.values(totalPartySeats).reduce((a, b) => a + b, 0) }}</td><td v-for="p in parties" :key="p.id" class="px-2 py-2 text-right">{{ totalPartySeats[p.id] ?? 0 }}</td></tr></thead><tbody><tr v-for="d in data.dapil" :key="d.id" class="border-t"><th class="sticky left-0 bg-white px-3 py-2 text-left"><NuxtLink :to="`/pemilu/${year}/dprd-provinsi/dapil/${d.id}`" class="font-medium text-blue-700 hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">{{ d.name }}</NuxtLink></th><td class="px-3 py-2 text-right">{{ d.seat_count }}</td><td v-for="p in parties" :key="p.id" class="px-2 py-2 text-right">{{ p.is_local && data.province.name !== 'ACEH' ? '—' : d.complete ? (d.partySeats[p.id] ?? 0) : '—' }}</td></tr></tbody></table></section>
  </div>
</template>
