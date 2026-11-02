<script setup lang="ts">
import { partyRanks } from '~/utils/partyRank'
const route = useRoute()
const year = Number(route.params.tahun)
if (year !== 2024) throw createError({ statusCode: 404, statusMessage: 'Tahun tidak tersedia', fatal: true })
const nf = (n: number) => new Intl.NumberFormat('id-ID').format(n)
const compact = (n: number) => new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
const { data } = await useFetch<any>(`/api/dprd-provinsi/${year}/provinces`)
const { data: bounds } = await useFetch<any[]>('/api/boundaries', { query: { year, level: 'province' } })
const parties = computed<any[]>(() => data.value?.parties ?? [])
const provinces = computed<any[]>(() => data.value?.provinces ?? [])
const reviewProvinces = computed(() => provinces.value.filter(p => Number(p.conflictedDapil) > 0).map(p => p.name))
const officialSourceProvinces = computed(() => provinces.value.filter(p => Number(p.officialSourceDapil) > 0).map(p => p.name))
const totalSeats = computed(() => provinces.value.reduce((sum, p) => sum + Number(p.seats), 0))
const complete = (p: any) => p && Number(p.reportedDapil) === Number(p.dapil_count) && Number(p.dapil_count) > 0 && !Number(p.conflictedDapil)
const ranks = (p: any) => complete(p) ? partyRanks(p.votes) : {}
const rankOf = (p: any, partyId: number): number => ranks(p)[partyId] ?? 0
const winner = (p: any) => { const leaders = parties.value.filter(x => ranks(p)[x.id] === 1); return leaders.length === 1 ? leaders[0] : null }
const byId = computed(() => new Map(provinces.value.map(p => [Number(p.id), p])))
const colorOf = (id: number) => winner(byId.value.get(id))?.color || '#94a3b8'
const totals = computed<Record<number, number>>(() => Object.fromEntries(parties.value.map(x => [x.id, provinces.value.reduce((sum, p) => sum + (complete(p) ? Number(p.votes[x.id] ?? 0) : 0), 0)])))
const seatTotals = computed<Record<number, number>>(() => Object.fromEntries(parties.value.map(x => [x.id, provinces.value.reduce((sum, p) => sum + (complete(p) ? Number(p.partySeats[x.id] ?? 0) : 0), 0)])))
const countedSeats = computed(() => Object.values(seatTotals.value).reduce((sum, seats) => sum + seats, 0))
const maxVotes = computed(() => Math.max(0, ...Object.values(totals.value)))
const go = (id: number) => navigateTo(`/pemilu/${year}/dprd-provinsi/provinsi/${id}`)
const rankClass = (n: number) => n === 1 ? 'bg-amber-100 text-amber-900' : n === 2 ? 'bg-slate-200 text-slate-800' : 'bg-orange-100 text-orange-900'
</script>

<template>
  <div>
    <PageHeader :title="`DPRD Provinsi — Pemilu ${year}`" subtitle="Pilih provinsi pada peta atau tabel untuk melihat daftar Dapil DPRD Provinsi.">
      <p class="mt-3 text-sm">Total kursi: <b>{{ nf(totalSeats) }}</b> · Provinsi: <b>{{ provinces.length }}</b></p>
      <p class="mt-2 text-sm">Suara dihitung dari laporan tiap dapil DPRD Provinsi.<span v-if="officialSourceProvinces.length"> Dapil {{ officialSourceProvinces.join(', ') }} dicocokkan dengan lampiran resmi KPU karena ada perbedaan antar laporan.</span><span v-if="reviewProvinces.length"> {{ reviewProvinces.join(', ') }} masih menunggu peninjauan.</span></p>
    </PageHeader>
    <div class="bs-stagger grid grid-cols-1 gap-6">
      <section class="bs-card p-4 md:p-6">
        <h2 class="mb-2 text-lg font-bold">Peta Pemenang Suara Partai per Provinsi</h2>
        <RegionMap v-if="bounds?.length" :items="bounds" :color-of="colorOf" large @select="go">
          <template #tooltip="{ regionId, name }"><b>{{ name }}</b><p v-if="winner(byId.get(regionId))">Terbanyak: {{ winner(byId.get(regionId)).name }}</p><p v-else>Data belum lengkap atau suara seri</p></template>
        </RegionMap>
        <div v-else class="h-64 animate-pulse rounded-xl bg-slate-100" />
        <div class="mt-4 flex flex-wrap gap-3 text-sm">
          <span v-for="party in parties.filter(x => provinces.some(p => winner(p)?.id === x.id))" :key="party.id" class="flex items-center gap-2"><span class="h-4 w-4 rounded border" :style="{ backgroundColor: party.color }" />{{ party.name }}</span>
          <span class="flex items-center gap-2"><span class="h-4 w-4 rounded bg-slate-400" />Belum lengkap atau seri</span>
        </div>
      </section>
      <section class="bs-card p-4 md:p-6">
        <h2 class="mb-2 text-lg font-bold">Suara Partai dari Laporan Dapil DPRD Provinsi</h2>
        <p class="mb-3 text-sm text-slate-600">Batang vertikal menurut nomor urut partai. Grafik hanya mencakup provinsi dengan laporan lengkap dan konsisten; partai lokal Aceh ditampilkan tersendiri.</p>
        <div class="overflow-x-auto"><div class="flex min-w-max items-end gap-3 border-b border-slate-200 px-2" role="list" aria-label="Grafik suara partai menurut nomor urut">
          <div v-for="party in parties" :key="party.id" class="flex w-20 shrink-0 flex-col items-center" role="listitem" :aria-label="`${party.ballot_number}. ${party.name}: ${nf(totals[party.id] ?? 0)} suara`">
            <div class="flex h-80 w-full flex-col items-center justify-end"><span class="mb-1 text-xs font-semibold tabular-nums">{{ compact(totals[party.id] ?? 0) }}</span><div class="w-12 rounded-t-md" :style="{ height: `${maxVotes ? (totals[party.id] ?? 0) / maxVotes * 275 : 0}px`, backgroundColor: party.color || '#64748b' }" /></div>
            <div class="flex flex-col items-center gap-1 py-2"><PartyLogo :name="party.name" :color="party.color" :year="year" :ballot="party.ballot_number" :size="42" /><span class="text-xs">{{ party.ballot_number }}</span></div>
          </div>
        </div></div>
      </section>
    </div>
    <section class="bs-card mt-6 overflow-x-auto">
      <h2 class="p-4 text-lg font-bold">Suara Partai per Provinsi</h2>
      <table class="min-w-max text-sm">
        <thead class="sticky top-0 bg-slate-900 text-white">
          <tr><th class="sticky left-0 z-10 bg-slate-900 px-3 py-2 text-left">Provinsi</th><th class="px-3 py-2 text-right">Dapil</th><th v-for="party in parties" :key="party.id" class="min-w-28 px-3 py-2 text-center"><div class="flex flex-col items-center gap-1"><PartyLogo :name="party.name" :color="party.color" :year="year" :ballot="party.ballot_number" :size="34" /><span>{{ party.ballot_number }}</span></div></th></tr>
          <tr class="bg-slate-800 font-semibold text-amber-300"><th class="sticky left-0 z-10 bg-slate-800 px-3 py-2 text-left">Total Suara</th><td /><td v-for="party in parties" :key="party.id" class="px-3 py-2 text-right tabular-nums">{{ nf(totals[party.id] ?? 0) }}</td></tr>
        </thead>
        <tbody><tr v-for="p in provinces" :key="p.id" class="border-t hover:bg-slate-50">
          <th class="sticky left-0 z-10 bg-white px-3 py-2 text-left"><NuxtLink :to="`/pemilu/${year}/dprd-provinsi/provinsi/${p.id}`" class="font-medium text-blue-700 hover:underline">{{ p.name }}</NuxtLink><span v-if="p.officialSourceDapil" class="block text-xs text-blue-700">{{ p.officialSourceDapil }} dapil cocok dengan sumber resmi KPU</span><span v-if="!complete(p)" class="block text-xs text-slate-500">{{ p.reportedDapil }}/{{ p.dapil_count }} dapil<span v-if="p.conflictedDapil"> · {{ p.conflictedDapil }} konflik</span></span></th>
          <td class="px-3 py-2 text-right">{{ p.dapil_count }}</td>
          <td v-for="party in parties" :key="party.id" class="px-3 py-2 text-right tabular-nums"><template v-if="party.is_local && p.name !== 'ACEH'">—</template><template v-else-if="complete(p)"><span v-if="rankOf(p, party.id) > 0 && rankOf(p, party.id) <= 3" class="mr-1 rounded px-1 font-bold" :class="rankClass(rankOf(p, party.id))" :title="`Peringkat ${rankOf(p, party.id)} suara di ${p.name}`">{{ rankOf(p, party.id) }}</span>{{ nf(p.votes[party.id] ?? 0) }}</template><span v-else class="text-slate-500">Tidak tersedia</span></td>
        </tr></tbody>
      </table>
    </section>
    <section class="bs-card mt-6 overflow-x-auto">
      <h2 class="p-4 text-lg font-bold">Kursi Partai per Provinsi</h2>
      <table class="min-w-max text-sm">
        <thead class="sticky top-0 bg-slate-900 text-white">
          <tr><th class="sticky left-0 z-10 bg-slate-900 px-3 py-2 text-left">Provinsi</th><th class="px-3 py-2 text-right">Total Kursi</th><th v-for="party in parties" :key="party.id" class="min-w-28 px-3 py-2 text-center"><div class="flex flex-col items-center gap-1"><PartyLogo :name="party.name" :color="party.color" :year="year" :ballot="party.ballot_number" :size="34" /><span>{{ party.ballot_number }}</span></div></th></tr>
          <tr class="bg-slate-800 font-semibold text-amber-300"><th class="sticky left-0 z-10 bg-slate-800 px-3 py-2 text-left">Kursi Terhitung</th><td class="px-3 py-2 text-right">{{ nf(countedSeats) }}</td><td v-for="party in parties" :key="party.id" class="px-3 py-2 text-right tabular-nums">{{ nf(seatTotals[party.id] ?? 0) }}</td></tr>
        </thead>
        <tbody><tr v-for="p in provinces" :key="p.id" class="border-t hover:bg-slate-50">
          <th class="sticky left-0 z-10 bg-white px-3 py-2 text-left"><NuxtLink :to="`/pemilu/${year}/dprd-provinsi/provinsi/${p.id}`" class="font-medium text-blue-700 hover:underline">{{ p.name }}</NuxtLink><span v-if="p.officialSourceDapil" class="block text-xs text-blue-700">{{ p.officialSourceDapil }} dapil cocok dengan sumber resmi KPU</span><span v-if="!complete(p)" class="block text-xs text-slate-500">{{ p.reportedDapil }}/{{ p.dapil_count }} dapil<span v-if="p.conflictedDapil"> · {{ p.conflictedDapil }} konflik</span></span></th>
          <td class="px-3 py-2 text-right tabular-nums">{{ p.seats }}</td>
          <td v-for="party in parties" :key="party.id" class="px-3 py-2 text-right tabular-nums">{{ party.is_local && p.name !== 'ACEH' ? '—' : complete(p) ? nf(p.partySeats[party.id] ?? 0) : 'Tidak tersedia' }}</td>
        </tr></tbody>
      </table>
    </section>
    <p class="mt-3 text-xs text-slate-500">Suara provinsi dijumlahkan dari laporan dapil; kursi partai dihitung dengan Sainte-Laguë per dapil tanpa ambang parlemen. Peringkat 1–3 berdasarkan suara, termasuk seri.<span v-if="reviewProvinces.length"> Provinsi dengan konflik belum masuk total suara dan kursi terhitung sampai laporan ditinjau.</span></p>
  </div>
</template>
