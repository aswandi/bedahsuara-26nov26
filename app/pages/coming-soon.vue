<script setup lang="ts">
const route = useRoute()
const title = computed(() => (route.query.title as string) || 'Fitur Segera Hadir')
</script>

<template>
  <div class="mx-auto max-w-xl py-16 text-center">
    <div class="bs-card p-8 md:p-12 space-y-4">
      <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-3xl">
        ⏳
      </div>
      <h1 class="text-2xl font-black text-slate-900 md:text-3xl">{{ title }}</h1>
      <p class="text-sm text-slate-500">
        Modul ini sedang dalam tahap persiapan data dan kalkulasi analitik. Segera dapat diakses pada pembaruan berikutnya.
      </p>
      <div class="pt-4">
        <NuxtLink to="/" class="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800">
          Kembali ke Beranda
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
