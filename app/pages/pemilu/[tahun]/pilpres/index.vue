<script setup lang="ts">
const route = useRoute()
const year = String(route.params.tahun)
if (year !== '2024') throw createError({ statusCode: 404, statusMessage: 'Halaman Pilpres tahun ini belum tersedia' })
const { data, error } = await useFetch(`/api/pilpres/${year}/national`)
const { data: boundaries, error: mapError } = await useFetch('/api/boundaries', { query: { year, level: 'province' } })
const nf = (n: number) => new Intl.NumberFormat('id-ID').format(n)
const chartTickets = computed(() => (data.value?.tickets ?? []).filter(t => t.votes !== null))
</script>

<template>
  <div>
    <PageHeader title="Pilpres 2024 — Nasional" subtitle="Suara pasangan calon dari laporan tingkat nasional." />
    <div v-if="error" class="bs-card p-5" role="alert">Data Pilpres tidak dapat dimuat. Silakan coba lagi.</div>
    <div v-else-if="data?.status !== 'available'" class="bs-card p-5">
      {{ data?.status === 'ambiguous' ? 'Terdapat beberapa laporan nasional; pemilihan sumber memerlukan peninjauan.' : 'Laporan nasional tidak tersedia.' }}
    </div>
    <template v-else>
      <p class="mb-4 text-sm text-slate-600">Status data pemilu: {{ data.electionStatus }} · Kualitas laporan: {{ data.report?.qualityStatus }} · Laporan #{{ data.report?.id }} · Sumber #{{ data.report?.sourceId }}</p>
      <div class="grid gap-6 lg:grid-cols-2">
        <section class="bs-card p-4">
          <h2 class="mb-2 font-bold">Peta provinsi</h2>
          <RegionMap v-if="boundaries?.length" :items="boundaries" />
          <p v-else class="text-sm text-slate-600">{{ mapError ? 'Peta tidak dapat dimuat.' : 'Batas wilayah tidak tersedia.' }}</p>
          <p class="mt-2 text-xs text-slate-500">Peta menunjukkan batas wilayah; hasil per provinsi masih dalam peninjauan sumber.</p>
        </section>
        <section class="bs-card p-4">
          <h2 class="mb-2 font-bold">Suara pasangan calon</h2>
          <VoteChart v-if="chartTickets.length" :labels="chartTickets.map(t => `Paslon ${t.ballotNumber}`)" :values="chartTickets.map(t => t.votes!)" />
          <p v-else class="text-sm text-slate-600">Suara pasangan calon tidak tersedia.</p>
        </section>
      </div>
      <section class="bs-card mt-6 overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-900 text-white"><tr><th class="px-3 py-2 text-left">Pasangan calon</th><th class="px-3 py-2 text-right">Suara</th><th class="px-3 py-2 text-right">Persentase suara sah</th></tr></thead>
          <tbody>
            <tr class="border-t font-bold"><td class="px-3 py-2">Suara sah dalam laporan</td><td class="px-3 py-2 text-right">{{ data.report?.validVotes == null ? 'Tidak tersedia' : nf(data.report.validVotes) }}</td><td /></tr>
            <tr v-for="t in data.tickets" :key="t.key" class="border-t"><td class="px-3 py-2">{{ t.ballotNumber }} · {{ t.name }}</td><td class="px-3 py-2 text-right">{{ t.votes == null ? 'Tidak tersedia' : nf(t.votes) }}</td><td class="px-3 py-2 text-right">{{ t.votes != null && data.report?.validVotes ? `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(t.votes / data.report.validVotes * 100)}%` : 'Tidak tersedia' }}</td></tr>
          </tbody>
        </table>
      </section>
    </template>
  </div>
</template>
