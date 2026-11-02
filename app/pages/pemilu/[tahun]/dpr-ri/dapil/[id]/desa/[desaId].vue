<script setup lang="ts">
import { partyRanks } from '~/utils/partyRank'
const route = useRoute()
const year = Number(route.params.tahun)
const dapilId = Number(route.params.id)
const desaId = Number(route.params.desaId)
const nf = (n: number | undefined) => new Intl.NumberFormat('id-ID').format(n ?? 0)

const waContact = useRuntimeConfig().public.waContact

const { data: authData } = await useFetch<any>('/api/auth/me')
const isFreeDemo = computed(() => dapilId === 4874)
const isAllowed = computed(() => {
  if (isFreeDemo.value) return true
  const user = authData.value?.user
  if (!user) return false
  if (user.role === 'super_admin' || user.scope_kind === 'national') return true
  if (user.scope_kind === 'dpr_ri') return user.bindings?.some((b: any) => b.constituency_id === dapilId)
  return false
})

const { data } = await useFetch<any>(`/api/dpr-ri/${year}/dapil/${dapilId}/desa/${desaId}`)
const { data: tpsData, error: tpsError } = await useFetch<any>(`/api/dpr-ri/${year}/dapil/${dapilId}/desa/${desaId}/tps`, { immediate: isAllowed.value })
const { data: bounds } = await useFetch<any[]>('/api/boundaries', { query: { year, parent: data.value?.village?.district_id }, immediate: isAllowed.value && !!data.value?.village?.district_id })
const parties = computed<any[]>(() => data.value?.parties ?? [])
const ballotParties = computed(() => [...parties.value].sort((a, b) => (a.ballot_number ?? Infinity) - (b.ballot_number ?? Infinity)))
const maxVotes = computed(() => Math.max(0, ...parties.value.map(p => Number(p.totalVotes) || 0)))
const ranks = computed(() => partyRanks(Object.fromEntries(parties.value.map(p => [p.id, p.totalVotes]))))
const topParties = computed(() => parties.value.filter(p => ranks.value[p.id] != null && ranks.value[p.id]! <= 3).map(p => ({ ...p, rank: ranks.value[p.id] })).sort((a, b) => a.rank - b.rank || a.ballot_number - b.ballot_number))
const leaders = computed(() => topParties.value.filter(p => p.rank === 1))
const colorOf = (regionId: number) => regionId !== desaId ? '#ffffff' : leaders.value.length === 1 ? leaders.value[0].color || '#94a3b8' : '#94a3b8'
const mapTooltip = (regionId: number, name: string) => regionId !== desaId ? name : [name, 'Suara partai terbanyak:', ...(topParties.value.length ? topParties.value.map(p => `${p.rank}. ${p.name}: ${nf(p.totalVotes)} suara`) : ['Data suara tidak tersedia'])].join('\n')
const candidateKey = (c: any) => `${c.election_party_id ?? 'unknown'}:${c.source_candidate_key}`
const candidateGroups = computed(() => {
  const all = new Map<string, any>()
  for (const t of tpsData.value?.tps ?? []) for (const c of t.candidates) {
    const key = candidateKey(c)
    if (!all.has(key)) all.set(key, { ...c, key })
  }
  const rows = [...all.values()]
  const groups = (tpsData.value?.parties ?? []).map((p: any) => ({ party: p, rows: rows.filter(c => c.election_party_id === p.id).sort((a, b) => (a.ballot_number ?? Infinity) - (b.ballot_number ?? Infinity) || String(a.source_candidate_key).localeCompare(String(b.source_candidate_key))) }))
  const unknown = rows.filter(c => !(tpsData.value?.parties ?? []).some((p: any) => p.id === c.election_party_id))
  if (unknown.length) groups.push({ party: null, rows: unknown })
  return groups
})
const candidateVote = (t: any, key: string) => {
  if (t.candidateReports.length !== 1) return null
  const matches = t.candidates.filter((c: any) => candidateKey(c) === key)
  return matches.length === 1 ? matches[0].votes : null
}
const partyVote = (t: any, partyId: number, field: 'total_votes' | 'party_votes') => {
  if (t.partyReports.length !== 1) return null
  const matches = t.partyVotes.filter((v: any) => v.election_party_id === partyId)
  return matches.length === 1 ? matches[0][field] : null
}
if (!data.value && isAllowed.value) throw createError({ statusCode: 404, statusMessage: 'Desa tidak ditemukan', fatal: true })
</script>

<template>
  <div>
    <!-- Proteksi Hak Akses untuk Non-Demo -->
    <div v-if="!isAllowed" class="mx-auto max-w-xl py-12">
      <div class="bs-card p-8 text-center space-y-4">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl">
          🔒
        </div>
        <h1 class="text-2xl font-black text-slate-900">Akses Terproteksi</h1>
        <p class="text-xs text-slate-600 leading-relaxed">
          Data suara partai dan TPS di tingkat desa/kelurahan diproteksi. Silakan masuk atau hubungi WhatsApp {{ waContact }} untuk lisensi wilayah.
        </p>
        <div class="pt-2 flex flex-col gap-2">
          <NuxtLink :to="`/login?redirect=${$route.fullPath}`" class="rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800">
            Masuk Akun ➔
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Tampilan Data Desa -->
    <div v-else-if="data" class="space-y-8">
      <nav class="text-sm text-slate-500">
        <NuxtLink :to="`/pemilu/${year}/dpr-ri`" class="hover:underline">DPR RI {{ year }}</NuxtLink> ›
        <NuxtLink :to="`/pemilu/${year}/dpr-ri/dapil/${dapilId}`" class="hover:underline">{{ data.village.dapil_name }}</NuxtLink> ›
        <NuxtLink :to="`/pemilu/${year}/dpr-ri/dapil/${dapilId}/kabupaten/${data.village.regency_id}`" class="hover:underline">{{ data.village.regency_name }}</NuxtLink> ›
        <NuxtLink :to="`/pemilu/${year}/dpr-ri/dapil/${dapilId}/kecamatan/${data.village.district_id}`" class="hover:underline">Kec. {{ data.village.district_name }}</NuxtLink> ›
        {{ data.village.name }}
      </nav>

      <PageHeader 
        :title="`Desa / Kelurahan ${data.village.name}`" 
        :subtitle="`DPR RI Pemilu ${year} · Kec. ${data.village.district_name} · Total Suara ${nf(data.grandTotal)}`" 
      >
        <span v-if="isFreeDemo" class="mt-2 inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
          ★ Akses Penuh Demo Gratis (Sumatera Selatan II)
        </span>
      </PageHeader>

      <section class="bs-card p-4 md:p-6">
        <h2 class="mb-2 text-lg font-bold">Peta Desa / Kelurahan {{ data.village.name }}</h2>
        <RegionMap v-if="bounds?.length" :items="bounds" :color-of="colorOf" :tooltip-text="mapTooltip" stroke-color="#94a3b8" large>
          <template #tooltip="{ regionId, name }">
            <p class="font-bold">{{ name }}</p>
            <template v-if="regionId === desaId"><p class="mb-1 text-xs text-slate-300">Suara partai terbanyak</p>
            <ol v-if="topParties.length" class="space-y-1"><li v-for="p in topParties" :key="p.id" class="flex items-center gap-2 text-xs"><span class="w-4 font-bold">{{ p.rank }}.</span><span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ backgroundColor: p.color || '#94a3b8' }" /><span class="flex-1">{{ p.name }}</span><span class="tabular-nums">{{ nf(p.totalVotes) }}</span></li></ol>
            <p v-else class="text-xs text-slate-300">Data suara tidak tersedia.</p></template>
          </template>
        </RegionMap>
        <p v-else class="text-sm text-slate-600">Batas desa / kelurahan tidak tersedia.</p>
        <p class="mt-2 text-xs text-slate-500">Desa yang dipilih berwarna sesuai partai dengan suara tertinggi; desa lain dalam kecamatan ditampilkan putih. Abu-abu menandakan data tidak tersedia atau seri.</p>
      </section>

      <section class="bs-card p-4 md:p-6">
        <h2 class="mb-4 text-lg font-bold">Perolehan Suara Partai di {{ data.village.name }}</h2>
        <p class="mb-3 text-xs text-slate-500">Urutan sesuai nomor urut partai. Geser ke samping pada layar kecil.</p>
        <div class="overflow-x-auto"><div class="flex min-w-max items-end gap-2 border-b border-slate-200 px-1" role="list" aria-label="Grafik suara partai menurut nomor urut">
          <div v-for="p in ballotParties" :key="p.id" class="flex w-16 shrink-0 flex-col items-center" role="listitem" :aria-label="`${p.ballot_number}. ${p.name}: ${nf(p.totalVotes)} suara`">
            <div class="flex h-72 w-full flex-col items-center justify-end"><span class="mb-1 text-xs font-semibold tabular-nums">{{ nf(p.totalVotes) }}</span><div class="w-9 rounded-t-md" :style="{ height: `${maxVotes ? p.totalVotes / maxVotes * 240 : 0}px`, backgroundColor: p.color || '#64748b' }" /></div>
            <div class="flex flex-col items-center gap-1 py-2"><PartyLogo :name="p.name" :color="p.color" :year="year" :ballot="p.ballot_number" :size="38" /><span class="text-xs text-slate-500">{{ p.ballot_number }}</span></div>
          </div>
        </div></div>
      </section>

      <section class="space-y-4">
        <h2 class="text-xl font-bold">Suara Caleg per TPS</h2>
        <p class="text-sm text-slate-600">Kolom menunjukkan TPS dan baris menunjukkan caleg. Angka berasal dari laporan langsung setiap TPS; tanda — berarti data tidak tersedia atau laporan memiliki beberapa versi.</p>
        <p v-if="tpsError" class="text-sm text-red-700">Data TPS tidak dapat dimuat. Periksa hak akses dan coba kembali.</p>
        <p v-else-if="!tpsData?.tps?.length" class="text-sm text-slate-600">Data TPS tidak tersedia.</p>
        <template v-else>
          <p v-if="tpsData.tps.some((t: any) => [...t.candidateReports, ...t.partyReports].some((r: any) => r.quality_status !== 'usable'))" class="text-sm text-amber-700">Sebagian laporan TPS perlu ditinjau; periksa kualitas sumber sebelum digunakan.</p>
          <p v-if="tpsData.tps.length >= 200" class="text-sm text-amber-700">Daftar dibatasi hingga 200 TPS.</p>
          <div class="bs-card overflow-x-auto">
            <table class="min-w-full border-collapse text-sm">
              <thead class="bg-slate-900 text-white"><tr><th class="sticky left-0 z-10 min-w-56 bg-slate-900 px-3 py-3 text-left">Partai / Caleg</th><th v-for="t in tpsData.tps" :key="t.id" class="whitespace-nowrap px-3 py-3 text-right">{{ t.name }}</th></tr></thead>
              <tbody v-for="g in candidateGroups" :key="g.party?.id ?? 'unknown'">
                <tr class="bg-slate-100"><th :colspan="tpsData.tps.length + 1" class="px-3 py-2 text-left"><span v-if="g.party" class="flex items-center gap-2"><PartyLogo :name="g.party.name" :color="g.party.color" :year="year" :ballot="g.party.ballot_number" :size="28" />{{ g.party.name }}</span><span v-else>Partai belum terpetakan</span></th></tr>
                <tr v-if="g.party" class="border-t bg-amber-50 font-bold"><th class="sticky left-0 bg-amber-50 px-3 py-2 text-left">Total suara partai dan caleg</th><td v-for="t in tpsData.tps" :key="t.id" class="px-3 py-2 text-right tabular-nums">{{ partyVote(t, g.party.id, 'total_votes') == null ? '—' : nf(partyVote(t, g.party.id, 'total_votes')) }}</td></tr>
                <tr v-if="g.party" class="border-t bg-slate-50"><th class="sticky left-0 bg-slate-50 px-3 py-2 text-left font-medium">Suara gambar partai</th><td v-for="t in tpsData.tps" :key="t.id" class="px-3 py-2 text-right tabular-nums">{{ partyVote(t, g.party.id, 'party_votes') == null ? '—' : nf(partyVote(t, g.party.id, 'party_votes')) }}</td></tr>
                <tr v-for="c in g.rows" :key="c.key" class="border-t border-slate-100"><th class="sticky left-0 bg-white px-3 py-2 text-left font-medium"><span v-if="c.ballot_number">{{ c.ballot_number }}. </span>{{ c.name || `Caleg belum terpetakan (${c.source_candidate_key})` }}</th><td v-for="t in tpsData.tps" :key="t.id" class="px-3 py-2 text-right tabular-nums">{{ candidateVote(t, c.key) == null ? '—' : nf(candidateVote(t, c.key)) }}</td></tr>
              </tbody>
            </table>
            <p v-if="!candidateGroups.length" class="p-4 text-sm text-slate-600">Data caleg tidak tersedia atau laporan memiliki beberapa versi.</p>
          </div>
        </template>
      </section>


    </div>
  </div>
</template>
