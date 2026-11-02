<script setup lang="ts">
/**
 * Tabel suara partai: logo partai di header, BARIS KEDUA = total suara tiap partai.
 * rows: satu baris per wilayah, votes[partyId] = suara (data apa adanya dari tingkat tsb).
 */
interface Party { id: number; name: string; color?: string; ballot_number?: number }
import { partyRanks } from '~/utils/partyRank'
interface Row { key: string | number; name: string; total?: number; votes: Record<number, number>; to?: string }
const props = defineProps<{ parties: Party[]; rows: Row[]; year: number; totals: Record<number, number>; firstCol?: string; highlightTop?: boolean }>()
const nf = (n: number | undefined) => n == null ? '–' : new Intl.NumberFormat('id-ID').format(n)
const grand = computed(() => Object.values(props.totals).reduce((a, b) => a + b, 0))
const ranks = computed(() => new Map(props.rows.map(r => [r.key, partyRanks(r.votes)])))
const rankClass = (rank?: number) => ({ 1: 'bg-amber-100 text-amber-950 ring-1 ring-amber-400', 2: 'bg-slate-200 text-slate-900 ring-1 ring-slate-400', 3: 'bg-orange-100 text-orange-950 ring-1 ring-orange-400' }[rank ?? 0] ?? '')
</script>

<template>
  <div class="bs-card overflow-x-auto">
    <table class="min-w-full text-sm">
      <thead class="sticky top-0 bg-slate-900 text-white">
        <tr>
          <th class="px-3 py-2 text-left">{{ firstCol ?? 'Wilayah' }}</th>
          <th v-for="p in parties" :key="p.id" class="px-2 py-2 text-center">
            <div class="flex flex-col items-center gap-1">
              <PartyLogo :name="p.name" :color="p.color" :year="year" :ballot="p.ballot_number" :size="32" />
              <span class="text-[10px] font-normal opacity-80">{{ p.ballot_number }}</span>
            </div>
          </th>
          <th class="px-3 py-2 text-right">Total</th>
        </tr>
        <tr class="bg-slate-800 font-semibold text-amber-300">
          <td class="px-3 py-2">Total Suara</td>
          <td v-for="p in parties" :key="p.id" class="px-2 py-2 text-right tabular-nums">{{ nf(totals[p.id]) }}</td>
          <td class="px-3 py-2 text-right tabular-nums">{{ nf(grand) }}</td>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.key" class="border-t border-slate-100 hover:bg-slate-50">
          <td class="whitespace-nowrap px-3 py-2 font-medium">
            <NuxtLink v-if="r.to" :to="r.to" class="text-blue-700 hover:underline">{{ r.name }}</NuxtLink>
            <span v-else>{{ r.name }}</span>
          </td>
          <td v-for="p in parties" :key="p.id" class="px-2 py-2 text-right tabular-nums"><span class="inline-block rounded px-1.5 py-0.5" :class="highlightTop ? rankClass(ranks.get(r.key)?.[p.id]) : ''"><span v-if="highlightTop && (ranks.get(r.key)?.[p.id] ?? 4) <= 3" class="mr-1 text-xs font-bold">{{ ranks.get(r.key)?.[p.id] }}.</span>{{ nf(r.votes[p.id]) }}</span></td>
          <td class="px-3 py-2 text-right font-semibold tabular-nums">{{ nf(r.total) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
