<script setup lang="ts">
const route = useRoute()
const year = Number(route.params.tahun)
const dapilId = Number(route.params.dapilId)
if (year !== 2024) throw createError({ statusCode: 404, statusMessage: 'Tahun tidak tersedia', fatal: true })

const { data } = await useFetch<any>(`/api/dprd-provinsi/${year}/dapil/${dapilId}`)
if (!data.value) throw createError({ statusCode: 404, statusMessage: 'Dapil tidak ditemukan', fatal: true })

const nf = (value: number | null | undefined) => new Intl.NumberFormat('id-ID').format(Number(value ?? 0))
const parties = computed<any[]>(() => data.value?.parties ?? [])
const cellMap = computed(() => {
  const map = new Map<string, any>()
  for (const cell of data.value?.cells ?? []) map.set(`${cell.partyId}:${cell.divisor}`, cell)
  return map
})
const maxVotes = computed(() => Math.max(0, ...parties.value.map(party => Number(party.totalVotes) || 0)))
const regencyPartyVotes = computed<any[]>(() => data.value?.regencyPartyVotes ?? [])
const regencyTotals = computed<Record<number, number | null>>(() => Object.fromEntries(
  parties.value.map((party) => [
    Number(party.id),
    regencyPartyVotes.value.length && regencyPartyVotes.value.every(region => region.partyVotes?.[party.id] != null)
      ? regencyPartyVotes.value.reduce((sum, region) => sum + Number(region.partyVotes[party.id]), 0)
      : null
  ])
))
</script>

<template>
  <div>
    <NuxtPage v-if="route.params.kabId" />
    <div v-else-if="data">
    <nav class="mb-3 text-sm text-slate-500">
      <NuxtLink :to="`/pemilu/${year}/dprd-provinsi`" class="hover:underline">DPRD Provinsi {{ year }}</NuxtLink> ›
      <NuxtLink :to="`/pemilu/${year}/dprd-provinsi/provinsi/${data.province?.id}`" class="hover:underline">{{ data.province?.name }}</NuxtLink> ›
      {{ data.dapil.name }}
    </nav>
    <PageHeader :title="data.dapil.name" :subtitle="`DPRD Provinsi ${year} · ${nf(data.dapil.seat_count)} kursi${data.available ? ` · ${nf(data.grandTotal)} suara partai` : ''}`" />

    <div v-if="!data.available" class="bs-card mt-6 border-l-4 border-amber-500 p-4 text-sm text-amber-900">
      <h2 class="font-bold">Perhitungan belum tersedia</h2>
      <p v-if="data.dapil.conflict" class="mt-1">Laporan suara dapil ini berkonflik dan perlu ditinjau. Kursi belum dihitung.</p>
      <p v-else class="mt-1">Laporan suara partai yang lengkap belum tersedia untuk dapil ini.</p>
    </div>

    <template v-else>
      <section class="bs-card mt-6 p-4 md:p-6">
        <h2 class="mb-2 text-lg font-bold">Suara Partai di Dapil</h2>
        <p class="mb-4 text-sm text-slate-600">Diagram mengikuti nomor urut partai. Hasil suara adalah laporan langsung pada tingkat dapil.</p>
        <div class="overflow-x-auto">
          <div class="flex min-w-max items-end gap-3 border-b border-slate-200 px-2" role="list" aria-label="Diagram suara partai per dapil">
            <div v-for="party in parties" :key="party.id" class="flex w-20 shrink-0 flex-col items-center" role="listitem" :aria-label="`${party.ballot_number}. ${party.name}: ${nf(party.totalVotes)} suara`">
              <div class="flex h-72 w-full flex-col items-center justify-end">
                <span class="mb-1 text-xs font-semibold tabular-nums">{{ nf(party.totalVotes) }}</span>
                <div class="w-12 rounded-t-md" :style="{ height: `${maxVotes ? party.totalVotes / maxVotes * 240 : 0}px`, backgroundColor: party.color || '#64748b' }" />
              </div>
              <div class="flex flex-col items-center gap-1 py-2"><PartyLogo :name="party.name" :color="party.color" :year="year" :ballot="party.ballot_number" :size="38" /><span class="text-xs text-slate-500">{{ party.ballot_number }}</span></div>
            </div>
          </div>
        </div>
      </section>

      <section class="bs-card mt-6 overflow-x-auto">
        <div class="p-4 pb-2">
          <h2 class="text-lg font-bold">Suara Partai per Kabupaten/Kota</h2>
          <p class="mt-1 text-sm text-slate-600">Menggunakan laporan langsung tingkat Kabupaten/Kota untuk dapil ini. Wilayah tanpa laporan atau nilai yang tidak tercatat ditampilkan sebagai tidak tersedia.</p>
        </div>
        <table v-if="regencyPartyVotes.length" class="min-w-max text-sm">
          <thead class="sticky top-0 bg-slate-900 text-white">
            <tr>
              <th class="sticky left-0 z-20 bg-slate-900 px-3 py-2 text-left">Kabupaten/Kota</th>
              <th v-for="party in parties" :key="party.id" class="min-w-24 px-2 py-2">
                <div class="flex flex-col items-center gap-1"><PartyLogo :name="party.name" :color="party.color" :year="year" :ballot="party.ballot_number" :size="30" /><span>{{ party.ballot_number }}</span></div>
              </th>
            </tr>
            <tr class="bg-slate-800 font-semibold text-amber-300">
              <th class="sticky left-0 bg-slate-800 px-3 py-2 text-left">Total Suara</th>
              <th v-for="party in parties" :key="party.id" class="px-2 py-2 text-right tabular-nums">{{ regencyTotals[party.id] == null ? 'Tidak tersedia' : nf(regencyTotals[party.id]) }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="region in regencyPartyVotes" :key="region.regionId" class="border-t border-slate-200">
              <th class="sticky left-0 bg-white px-3 py-2 text-left font-medium"><NuxtLink :to="`/pemilu/${year}/dprd-provinsi/dapil/${dapilId}/kabupaten/${region.regionId}`" class="text-blue-700 hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">{{ region.regionName }}</NuxtLink><span v-if="!region.complete" class="mt-0.5 block text-xs font-normal text-amber-700">Laporan partai belum lengkap</span></th>
              <td v-for="party in parties" :key="party.id" class="px-2 py-2 text-right tabular-nums">{{ region.partyVotes?.[party.id] == null ? 'Tidak tersedia' : nf(region.partyVotes[party.id]) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="px-4 pb-4 text-sm text-slate-500">Laporan suara partai tingkat Kabupaten/Kota untuk dapil ini tidak tersedia.</p>
      </section>

      <section class="mt-6">
        <h2 class="mb-2 text-xl font-bold">Perhitungan Sainte-Laguë</h2>
        <p class="mb-3 text-sm text-slate-600">Kursi dialokasikan dari suara partai dapil dengan pembagi 1, 3, 5, 7, dan seterusnya. Untuk DPRD tidak digunakan ambang parlemen.<b v-if="data.tie" class="ml-1 text-amber-700">Nilai pembagi seri pada batas kursi terakhir.</b></p>
        <div v-if="data.dapil.source" class="mb-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">Suara dicocokkan dengan sumber resmi KPU: <a :href="data.dapil.source" target="_blank" rel="noreferrer" class="underline">lihat dokumen sumber</a>.</div>
        <div class="bs-card overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead class="sticky top-0 bg-slate-900 text-white">
              <tr>
                <th class="px-3 py-2 text-left">Partai</th>
                <th class="px-3 py-2 text-right">Suara</th>
                <th v-for="divisor in data.divisors" :key="divisor" class="px-3 py-2 text-right">÷ {{ divisor }}</th>
                <th class="px-3 py-2 text-right">Kursi</th>
              </tr>
              <tr class="bg-slate-800 font-semibold text-amber-300">
                <td class="px-3 py-2">Total Suara</td>
                <td class="px-3 py-2 text-right tabular-nums">{{ nf(data.grandTotal) }}</td>
                <td :colspan="data.divisors.length" />
                <td class="px-3 py-2 text-right">{{ nf(data.dapil.seat_count) }}</td>
              </tr>
            </thead>
            <tbody>
              <tr v-for="party in parties" :key="party.id" class="border-t border-slate-200">
                <td class="px-3 py-2"><div class="flex min-w-max items-center gap-2" :title="party.name"><PartyLogo :name="party.name" :color="party.color" :year="year" :ballot="party.ballot_number" :size="30" /><span>{{ party.ballot_number }}. {{ party.name }}</span></div></td>
                <td class="px-3 py-2 text-right tabular-nums">{{ nf(party.totalVotes) }}</td>
                <td v-for="divisor in data.divisors" :key="divisor" class="px-3 py-2 text-right tabular-nums">
                  <span v-if="cellMap.get(`${party.id}:${divisor}`)" :class="cellMap.get(`${party.id}:${divisor}`).seatNo ? 'rounded bg-emerald-100 px-1 font-bold text-emerald-700' : ''">
                    {{ nf(Math.round(cellMap.get(`${party.id}:${divisor}`).quotient)) }}<sup v-if="cellMap.get(`${party.id}:${divisor}`).seatNo">{{ cellMap.get(`${party.id}:${divisor}`).seatNo }}</sup>
                  </span>
                  <span v-else>—</span>
                </td>
                <td class="px-3 py-2 text-right font-bold tabular-nums">{{ nf(party.seats) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="mt-2 text-xs text-slate-500">Angka kecil hijau pada nilai bagi menandai urutan kursi yang diperoleh partai.</p>
      </section>

      <section class="mt-8">
        <h2 class="mb-2 text-xl font-bold">Caleg per Partai</h2>
        <p class="mb-4 text-sm text-slate-600">Setiap kartu memuat suara gambar partai dan daftar caleg. Status KPU ditampilkan bila tersedia; jika tidak, status dihitung dari suara caleg hanya jika datanya lengkap. Data suara tidak diambil dari tingkat wilayah lain.</p>
        <div v-if="data.officialDecision" class="mb-4 rounded-lg border-l-4 border-emerald-600 bg-emerald-50 p-4 text-sm text-emerald-950">
          <p class="font-semibold">Status terpilih sesuai penetapan Pemilu {{ year }}</p>
          <p class="mt-1"><a :href="data.officialDecision.url" target="_blank" rel="noopener noreferrer" class="underline">{{ data.officialDecision.title }}</a>, tanggal {{ new Date(`${data.officialDecision.date}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) }}.</p>
          <p class="mt-1">Kursi ke- menunjukkan urutan alokasi Sainte-Laguë di dapil. Nomor ini berbeda dari nomor urut caleg dan nomor daftar pada lampiran keputusan.</p>
        </div>
        <div v-if="!data.candidateReportAvailable" class="mb-4 rounded-lg border-l-4 border-amber-500 bg-amber-50 p-4 text-sm text-amber-900">
          <template v-if="data.candidateRegionalReports?.length">Suara caleg tersedia pada laporan Kabupaten/Kota dan ditampilkan pada kolom wilayah masing-masing. <template v-if="data.officialDecision">Status kursi merujuk keputusan KPU di atas.</template><template v-else>Laporan suara caleg tingkat dapil belum tersedia, sehingga status kursi caleg belum dihitung dari suara Kabupaten/Kota.</template></template>
          <template v-else>Laporan suara caleg langsung tingkat dapil belum tersedia. Nama caleg tetap ditampilkan dari daftar dapil; suara dan status kursi yang tidak tercatat ditandai tidak tersedia.</template>
        </div>
        <div v-if="!data.candidateRosterAvailable" class="bs-card p-4 text-sm text-slate-600">Daftar nama caleg tidak tersedia untuk dapil ini.</div>
        <div v-else class="grid grid-cols-1 gap-5 md:grid-cols-2">
          <article v-for="party in parties" :key="party.id" class="bs-card min-w-0 overflow-hidden">
            <header class="flex items-center gap-3 bg-slate-900 px-4 py-3 text-white">
              <PartyLogo :name="party.name" :color="party.color" :year="year" :ballot="party.ballot_number" :size="40" />
              <div class="min-w-0 flex-1">
                <h3 class="font-bold">{{ party.ballot_number }}. {{ party.name }}</h3>
                <p class="text-xs text-white/70">{{ nf(party.seats) }} kursi hasil Sainte-Laguë</p>
              </div>
              <div class="text-right">
                <p class="text-xs text-white/70">Suara gambar partai</p>
                <p class="font-bold tabular-nums text-amber-300">{{ party.partyImageVotes == null ? 'Tidak tersedia' : nf(party.partyImageVotes) }}</p>
              </div>
            </header>
            <div class="flex flex-wrap justify-between gap-x-4 gap-y-1 border-b bg-slate-50 px-4 py-2 text-xs text-slate-600">
              <span>Total suara partai: <b class="tabular-nums text-slate-800">{{ nf(party.totalVotes) }}</b></span>
              <span>{{ party.candidates.length }} caleg terdaftar</span>
            </div>
            <div v-if="!party.candidates.length" class="p-4 text-sm text-slate-500">Daftar caleg untuk partai ini tidak tersedia pada laporan dapil.</div>
            <div v-else class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead class="bg-slate-100 text-slate-700"><tr><th class="px-3 py-2 text-left">No</th><th class="px-3 py-2 text-left">Nama Caleg</th><th v-if="!data.candidateRegionalReports?.length" class="px-3 py-2 text-right">Suara Dapil</th><th v-for="report in data.candidateRegionalReports" :key="report.reportId" class="px-3 py-2 text-right"><span class="block">{{ report.regionName }}</span><span class="text-xs font-normal">Suara Kabupaten/Kota</span></th><th class="px-3 py-2 text-left">Status Kursi</th><th class="px-3 py-2 text-center">Kursi ke-</th></tr></thead>
                <tbody>
                  <tr v-for="(candidate, index) in party.candidates" :key="candidate.id" class="border-t border-slate-100" :class="candidate.elected ? 'bg-emerald-50' : ''">
                    <td class="px-3 py-2 tabular-nums">{{ candidate.ballotNumber ?? index + 1 }}</td>
                    <td class="min-w-40 px-3 py-2 font-medium">{{ candidate.name }}</td>
                    <td v-if="!data.candidateRegionalReports?.length" class="px-3 py-2 text-right tabular-nums">{{ candidate.votes == null ? '—' : nf(candidate.votes) }}</td>
                    <td v-for="report in data.candidateRegionalReports" :key="report.reportId" class="px-3 py-2 text-right tabular-nums">{{ candidate.regionalVotes?.[report.regionId] == null ? '—' : nf(candidate.regionalVotes[report.regionId]) }}</td>
                    <td class="px-3 py-2">
                      <span v-if="candidate.elected === true" class="rounded bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">{{ candidate.statusSource === 'official' ? 'KPU: dapat kursi' : 'Hasil hitung: dapat kursi' }}</span>
                      <span v-else-if="candidate.elected === false" class="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-700">{{ candidate.statusSource === 'official' ? 'KPU: tidak mendapat kursi' : 'Hasil hitung: tidak mendapat kursi' }}</span>
                      <span v-else class="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">Belum dapat ditentukan</span>
                      <span v-if="candidate.statusConflict" class="mt-1 block text-xs font-medium text-amber-800">Berbeda dengan hasil hitung suara caleg</span>
                    </td>
                    <td class="px-3 py-2 text-center tabular-nums">
                      <template v-if="candidate.elected === true && candidate.seatNumber != null"><span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-900" :title="`Kursi dapil ke-${candidate.seatNumber}`">{{ candidate.seatNumber }}</span><span class="mt-1 block whitespace-nowrap text-xs text-slate-500">Partai ke-{{ candidate.partySeatNumber }}</span></template>
                      <span v-else class="text-slate-400">—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>
          <article v-if="data.unmappedCandidates?.length" class="bs-card min-w-0 overflow-hidden md:col-span-2">
            <header class="bg-amber-50 px-4 py-3"><h3 class="font-bold text-amber-950">Caleg belum terpetakan ke partai</h3><p class="text-xs text-amber-900">Nama tetap ditampilkan; penentuan kursi belum dapat dilakukan tanpa partai yang cocok.</p></header>
            <div class="overflow-x-auto"><table class="min-w-full text-sm"><thead class="bg-slate-100"><tr><th class="px-3 py-2 text-left">No</th><th class="px-3 py-2 text-left">Nama Caleg</th><th class="px-3 py-2 text-right">Suara</th><th class="px-3 py-2 text-left">Status Kursi</th></tr></thead><tbody><tr v-for="(candidate, index) in data.unmappedCandidates" :key="candidate.id" class="border-t"><td class="px-3 py-2">{{ candidate.ballotNumber ?? index + 1 }}</td><td class="px-3 py-2">{{ candidate.name }}</td><td class="px-3 py-2 text-right tabular-nums">{{ candidate.votes == null ? '—' : nf(candidate.votes) }}</td><td class="px-3 py-2 text-amber-800">Belum dapat ditentukan</td></tr></tbody></table></div>
          </article>
        </div>
      </section>
    </template>
    </div>
  </div>
</template>
