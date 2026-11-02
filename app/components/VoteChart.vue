<script setup lang="ts">
import { use } from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'

use([BarChart, GridComponent, TooltipComponent, CanvasRenderer])

const props = defineProps<{ labels: string[]; values: number[]; colors?: string[]; horizontal?: boolean; height?: number }>()
const option = computed(() => {
  const cat = { type: 'category', data: props.labels, axisLabel: { interval: 0, rotate: props.horizontal ? 0 : 35, fontSize: 10 } }
  const val = { type: 'value', axisLabel: { formatter: (v: number) => new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(v) } }
  return {
    grid: { left: props.horizontal ? 24 : 10, right: 28, top: 20, bottom: 10, containLabel: true },
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => new Intl.NumberFormat('id-ID').format(v) },
    xAxis: props.horizontal ? val : cat,
    yAxis: props.horizontal ? { ...cat, inverse: true } : val,
    animationDuration: 900,
    series: [{
      type: 'bar',
      data: props.values.map((v, i) => ({ value: v, itemStyle: { color: props.colors?.[i] ?? '#2563eb', borderRadius: 4 } }))
    }]
  }
})
</script>

<template>
  <ClientOnly>
    <VChart :option="option" autoresize class="w-full" :style="{ height: `${height ?? 320}px` }" />
    <template #fallback><div class="animate-pulse rounded-xl bg-slate-100" :style="{ height: `${height ?? 320}px` }" /></template>
  </ClientOnly>
</template>
