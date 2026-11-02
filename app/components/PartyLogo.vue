<script setup lang="ts">
const props = defineProps<{ name: string; color?: string; year?: number; ballot?: number; size?: number }>()
const size = props.size ?? 36
const failed = ref(false)
const initials = computed(() => props.name.replace(/^partai\s+/i, '').split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase())
const src = computed(() => (props.year && props.ballot ? `/parties/${props.year}-${props.ballot}.${(props.year === 2024 && props.ballot !== 20) || (props.year === 2019 && props.ballot === 12) ? 'png' : 'jpg'}` : ''))
watch(src, () => { failed.value = false })
</script>

<template>
  <div
    class="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px] font-bold text-white ring-1 ring-slate-200"
    :style="{ width: size + 'px', height: size + 'px', background: color || '#334155' }"
    :title="name"
  >
    <img v-if="src && !failed" :src="src" :alt="name" class="h-full w-full bg-white object-contain" @error="failed = true">
    <span v-else>{{ initials }}</span>
  </div>
</template>
