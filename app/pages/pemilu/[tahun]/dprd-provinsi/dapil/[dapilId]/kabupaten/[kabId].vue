<script setup lang="ts">
const route = useRoute()
const year = Number(route.params.tahun)
const dapilId = Number(route.params.dapilId)
const kabId = Number(route.params.kabId)
if (year !== 2024) throw createError({ statusCode: 404, statusMessage: 'Tahun tidak tersedia', fatal: true })

const { data } = await useFetch<any>(`/api/dprd-provinsi/${year}/dapil/${dapilId}/kabupaten/${kabId}`)
if (!data.value) throw createError({ statusCode: 404, statusMessage: 'Kabupaten/Kota tidak ditemukan', fatal: true })

const nf = (value: number | null | undefined) => value == null ? 'Tidak tersedia' : new Intl.NumberFormat('id-ID').format(Number(value))
const parties = computed<any[]>(() => data.value?.parties ?? [])
const districts = computed<any[]>(() => data.value?.districts ?? [])
const candidatesByParty = (district: any, partyId: number) => district.candidates
  .filter((candidate: any) => Number(candidate.partyId) === Number(partyId))
  .sort((a: any, b: any) => (b.votes ?? -1) - (a.votes ?? -1) || (a.ballotNumber ?? Infinity) - (b.ballotNumber ?? Infinity))
const regencyCandidatesByParty = (partyId: number) => (data.value?.regencyCandidates ?? [])
  .filter((candidate: any) => Number(candidate.partyId) === Number(partyId))
  .sort((a: any, b: any) => (b.votes ?? -1) - (a.votes ?? -1) || (a.ballotNumber ?? Infinity) - (b.ballotNumber ?? Infinity))
</script>

<template>
  <div v-if="data" class="space-y-8">
    <nav class="text-sm text-slate-500">
      <NuxtLink :to="`/pemilu/${year}/dprd-provinsi`" class="hover:underline">DPRD Provinsi {{ year }}</NuxtLink> ›
      <NuxtLink :to="`/pemilu/${year}/dprd-provinsi/provinsi/${data.regency.province_id}`" class="hover:underline">{{ data.regency.province_name }}</NuxtLink> ›
      <NuxtLink :to="`/pemilu/${year}/dprd-provinsi/dapil/${dapilId}`" class="hover:underline">{{ data.regency.dapil_name }}</NuxtLink> ›
      {{ data.regency.name }}
    </nav>

    <PageHeader :title="data.regency.name" :subtitle="`DPRD Provinsi ${year} · ${data.regency.dapil_name}`" />

    <section class="bs-card overflow-x-auto">
      <div class="p-4 pb-2">
        <h2 class="text-lg font-bold">Suara Partai per Kecamatan</h2>
        <p class="mt-1 text-sm text-slate-600">Angka berasal dari laporan langsung tingkat kecamatan. Nilai dari desa atau TPS tidak dijumlahkan.</p>
      </div>
      <table v-if="districts.length" class="min-w-max text-sm">
        <thead class="bg-slate-900 text-white">
          <tr>
            <th scope="col" class="px-3 py-2 text-left">Nomor</th>
            <th class="sticky left-0 z-10 bg-slate-900 px-3 py-2 text-left">Kecamatan</th>
            <th v-for="party in parties" :key="party.id" class="min-w-24 px-2 py-2">
              <div class="flex flex-col items-center gap-1"><PartyLogo :name="party.name" :color="party.color" :year="year" :ballot="party.ballot_number" :size="30" /><span>{{ party.ballot_number }}</span></div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(district, index) in districts" :key="district.regionId" class="border-t border-slate-200">
            <td class="px-3 py-2 tabular-nums">{{ index + 1 }}</td>
            <th class="sticky left-0 bg-white px-3 py-2 text-left font-medium">{{ district.name }}<span v-if="!district.partyReportAvailable" class="mt-0.5 block text-xs font-normal text-slate-500">Laporan suara partai tidak tersedia</span></th>
            <td v-for="party in parties" :key="party.id" class="px-2 py-2 text-right tabular-nums">{{ district.partyVotes?.[party.id] == null ? 'Tidak tersedia' : nf(district.partyVotes[party.id]) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="px-4 pb-4 text-sm text-slate-500">Daftar kecamatan untuk dapil ini di kabupaten/kota ini tidak tersedia.</p>
    </section>

    <section class="space-y-4">
      <div>
        <h2 class="text-xl font-bold">Suara Caleg di {{ data.regency.name }}</h2>
        <p class="mt-1 text-sm text-slate-600">Menggunakan laporan langsung tingkat Kabupaten/Kota untuk dapil ini.</p>
      </div>
      <p v-if="!data.regencyCandidateReportAvailable" class="bs-card p-4 text-sm text-slate-600">Laporan suara caleg tingkat Kabupaten/Kota tidak tersedia.</p>
      <div v-else class="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article v-for="party in parties" :key="party.id" class="bs-card min-w-0 overflow-x-auto">
          <header class="flex items-center gap-3 bg-slate-900 px-4 py-3 text-white">
            <PartyLogo :name="party.name" :color="party.color" :year="year" :ballot="party.ballot_number" :size="36" />
            <h3 class="font-bold">{{ party.ballot_number }}. {{ party.name }}</h3>
          </header>
          <table class="min-w-full text-sm">
            <thead class="bg-slate-100 text-slate-700"><tr><th class="px-3 py-2 text-left">No. Urut</th><th class="px-3 py-2 text-left">Nama Caleg</th><th class="px-3 py-2 text-right">Suara</th></tr></thead>
            <tbody>
              <tr v-for="candidate in regencyCandidatesByParty(party.id)" :key="candidate.id" class="border-t border-slate-100">
                <td class="px-3 py-2 tabular-nums">{{ candidate.ballotNumber ?? '—' }}</td>
                <td class="px-3 py-2 font-medium">{{ candidate.name }}</td>
                <td class="px-3 py-2 text-right tabular-nums">{{ nf(candidate.votes) }}</td>
              </tr>
              <tr v-if="!regencyCandidatesByParty(party.id).length"><td colspan="3" class="px-3 py-3 text-sm text-slate-500">Data caleg partai ini tidak tersedia pada laporan Kabupaten/Kota.</td></tr>
            </tbody>
          </table>
        </article>
      </div>
    </section>

    <section class="space-y-4">
      <div>
        <h2 class="text-xl font-bold">Suara Caleg per Kecamatan</h2>
        <p class="mt-1 text-sm text-slate-600">Setiap tabel menampilkan calon menurut partai pada laporan kecamatan masing-masing. Nilai tidak dijumlahkan lintas kecamatan.</p>
      </div>
      <div v-for="district in districts" :key="district.regionId" class="bs-card overflow-hidden">
        <header class="border-b bg-slate-50 px-4 py-3">
          <h3 class="font-bold">{{ district.name }}</h3>
          <p v-if="!district.candidateReportAvailable" class="mt-1 text-sm text-slate-600">Laporan suara caleg tingkat kecamatan tidak tersedia.</p>
        </header>
        <div v-if="district.candidateReportAvailable" class="grid grid-cols-1 gap-4 p-4 xl:grid-cols-2">
          <article v-for="party in parties" :key="party.id" class="min-w-0 overflow-x-auto rounded-lg border border-slate-200">
            <header class="flex items-center gap-3 bg-slate-900 px-4 py-3 text-white">
              <PartyLogo :name="party.name" :color="party.color" :year="year" :ballot="party.ballot_number" :size="34" />
              <h4 class="font-semibold">{{ party.ballot_number }}. {{ party.name }}</h4>
            </header>
            <table class="min-w-full text-sm">
              <thead class="bg-slate-100 text-slate-700"><tr><th class="px-3 py-2 text-left">No. Urut</th><th class="px-3 py-2 text-left">Nama Caleg</th><th class="px-3 py-2 text-right">Suara</th></tr></thead>
              <tbody>
                <tr v-for="candidate in candidatesByParty(district, party.id)" :key="candidate.id" class="border-t border-slate-100">
                  <td class="px-3 py-2 tabular-nums">{{ candidate.ballotNumber ?? '—' }}</td>
                  <td class="px-3 py-2 font-medium">{{ candidate.name }}</td>
                  <td class="px-3 py-2 text-right tabular-nums">{{ nf(candidate.votes) }}</td>
                </tr>
                <tr v-if="!candidatesByParty(district, party.id).length"><td colspan="3" class="px-3 py-3 text-sm text-slate-500">Data caleg partai ini tidak tersedia pada laporan kecamatan.</td></tr>
              </tbody>
            </table>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>
