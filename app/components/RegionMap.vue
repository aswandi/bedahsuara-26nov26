<script setup lang="ts">
/** Peta SVG sederhana dari batas wilayah (format [lat,lng]); klik poligon -> emit select. */
interface Item { regionId: number; name: string; rings: [number, number][][] }
const props = defineProps<{ items: Item[]; selected?: number | null; colorOf?: (id: number) => string; tooltipText?: (id: number, name: string) => string; strokeColor?: string; large?: boolean }>()
const emit = defineEmits<{ (e: 'select', id: number): void }>()
const hover = ref<number | null>(null)

const view = computed(() => {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const it of props.items) for (const r of it.rings) for (const [lat, lng] of r) {
    if (lng < minX) minX = lng; if (lng > maxX) maxX = lng
    if (lat < minY) minY = lat; if (lat > maxY) maxY = lat
  }
  if (!isFinite(minX)) return { box: '0 0 100 60', paths: [] as any[] }
  const w = maxX - minX || 1, h = maxY - minY || 1
  const scale = 100 / w
  const H = h * scale
  const paths = props.items.map((it) => ({
    id: it.regionId,
    name: it.name,
    d: it.rings.map((r) => 'M' + r.map(([lat, lng]) => `${((lng - minX) * scale).toFixed(2)},${((maxY - lat) * scale).toFixed(2)}`).join('L') + 'Z').join(' ')
  }))
  return { box: `0 0 100 ${H.toFixed(2)}`, paths }
})
const activeRegion = computed(() => view.value.paths.find((p) => p.id === hover.value))
</script>

<template>
  <div class="relative">
    <svg :viewBox="view.box" class="h-auto w-full" :class="large ? 'max-h-[720px]' : 'max-h-[420px]'" role="img" aria-label="Peta wilayah">
      <path
        v-for="p in view.paths"
        :key="p.id"
        :d="p.d"
        :fill="colorOf ? colorOf(p.id) : (p.id === selected ? '#d7263d' : '#2563eb')"
        :fill-opacity="hover === p.id ? 1 : 0.75"
        :stroke="strokeColor || '#fff'"
        stroke-width="0.15"
        class="cursor-pointer transition-all duration-200"
        tabindex="0"
        role="button"
        :aria-label="p.name"
        @mouseenter="hover = p.id"
        @mouseleave="hover = null"
        @focus="hover = p.id"
        @blur="hover = null"
        @click="emit('select', p.id)"
        @keydown.enter.prevent="emit('select', p.id)"
        @keydown.space.prevent="emit('select', p.id)"
      ><title>{{ tooltipText ? tooltipText(p.id, p.name) : p.name }}</title></path>
    </svg>
    <div v-if="activeRegion" class="pointer-events-none absolute left-2 top-2 z-10 max-w-[min(22rem,90%)] rounded-lg bg-slate-900/95 px-4 py-3 text-sm text-white shadow-lg" role="tooltip">
      <slot name="tooltip" :region-id="activeRegion.id" :name="activeRegion.name">{{ activeRegion.name }}</slot>
    </div>
  </div>
</template>
