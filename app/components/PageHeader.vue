<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <section class="bs-hero mb-6 rounded-2xl bg-gradient-to-r from-[var(--bs-navy)] to-blue-800 p-6 text-white shadow-lg">
    <h1 class="text-2xl font-extrabold md:text-3xl">{{ title }}</h1>
    <p v-if="subtitle" class="mt-1 text-sm text-white/80">{{ subtitle }}</p>
    <slot />
  </section>
</template>
