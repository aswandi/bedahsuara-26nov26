<script setup lang="ts">
const wa = useRuntimeConfig().public.waContact
</script>

<template>
  <footer class="mt-12 bg-[var(--bs-navy)] text-sm text-white/80">
    <div class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 md:flex-row">
      <p>
        WA: <a :href="`https://wa.me/${wa}`" class="font-semibold text-[var(--bs-gold)]" target="_blank" rel="noopener">{{ wa }}</a>
      </p>
      <p>
        Bagian dari <a href="https://software-pilkada.com" target="_blank" rel="noopener" class="underline">software-pilkada.com</a>
        · dibuat oleh <a href="https://aswandi.or.id" target="_blank" rel="noopener" class="underline">aswandi.or.id</a>
      </p>
    </div>
  </footer>
</template>
