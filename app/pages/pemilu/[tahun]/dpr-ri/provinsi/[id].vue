<script setup lang="ts">
const route = useRoute()
const year = Number(route.params.tahun)
const id = Number(route.params.id)
const { data } = await useFetch<any>(`/api/dpr-ri/${year}/provinces/${id}`)
const { data: bounds } = await useFetch<any[]>('/api/boundaries', { query: { year, ids: String(id) } })
if (!data.value) throw createError({ statusCode: 404, statusMessage: 'Provinsi tidak ditemukan', fatal: true })
</script>

<template>
  <div v-if="data">
    <nav class="mb-3 text-sm text-slate-500">
      <NuxtLink :to="`/pemilu/${year}/dpr-ri`" class="hover:underline">DPR RI {{ year }}</NuxtLink> › {{ data.province.name }}
    </nav>
    <PageHeader :title="`Dapil DPR RI — ${data.province.name}`" :subtitle="`Pemilu ${year}`" />
    <div class="bs-stagger grid gap-6 lg:grid-cols-2">
      <div class="bs-card p-4"><h2 class="mb-2 font-bold">Peta Provinsi</h2><RegionMap v-if="bounds?.length" :items="bounds" /></div>
      <div class="bs-card p-4"><h2 class="mb-2 font-bold">Kursi per Dapil</h2>
        <VoteChart :labels="data.dapil.map((d: any) => d.name)" :values="data.dapil.map((d: any) => Number(d.seat_count))" />
      </div>
    </div>
    <div class="bs-card mt-6 overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead class="sticky top-0 bg-slate-900 text-white"><tr><th class="px-3 py-2 text-left">Dapil</th><th class="px-3 py-2 text-right">Kursi</th></tr></thead>
        <tbody>
          <tr v-for="d in data.dapil" :key="d.id" class="border-t hover:bg-slate-50">
            <td class="px-3 py-2"><NuxtLink :to="`/pemilu/${year}/dpr-ri/dapil/${d.id}`" class="font-medium text-blue-700 hover:underline">{{ d.name }}</NuxtLink></td>
            <td class="px-3 py-2 text-right">{{ d.seat_count }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
