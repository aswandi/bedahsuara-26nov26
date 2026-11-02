<script setup lang="ts">
const route = useRoute()
const email = ref('admin@bedahsuara.id')
const password = ref('')
const errorMsg = ref('')
const loading = ref(false)

const waContact = useRuntimeConfig().public.waContact
const redirectUrl = (route.query.redirect as string) || '/'

async function handleLogin() {
  errorMsg.value = ''
  loading.value = true
  try {
    const res = await $fetch<any>('/api/auth/login', {
      method: 'POST',
      body: { email: email.value, password: password.value }
    })
    if (res?.success) {
      await navigateTo(redirectUrl)
    }
  } catch (err: any) {
    errorMsg.value = err?.data?.statusMessage || 'Gagal masuk. Periksa email dan kata sandi.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl py-6">
    <div class="grid gap-8 lg:grid-cols-2">
      <!-- Formulir Login -->
      <div class="bs-card p-6 md:p-8">
        <div class="mb-6">
          <h1 class="text-2xl font-black text-slate-900">Masuk Akun</h1>
          <p class="mt-1 text-xs text-slate-500">
            Akses data tingkat Kecamatan, Desa, dan TPS BEDAH SUARA.
          </p>
        </div>

        <div v-if="errorMsg" class="mb-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
          ⚠️ {{ errorMsg }}
        </div>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-xs font-bold uppercase text-slate-600">Email Pengguna</label>
            <input 
              v-model="email" 
              type="email" 
              required 
              placeholder="nama@email.com" 
              class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase text-slate-600">Kata Sandi</label>
            <input 
              v-model="password" 
              type="password" 
              required 
              placeholder="••••••••" 
              class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
            <p class="mt-1 text-[11px] text-slate-400">Kata sandi akun demo administrator: <code class="bg-slate-100 px-1 py-0.5 rounded">admin123</code></p>
          </div>

          <button 
            type="submit" 
            :disabled="loading"
            class="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-50"
          >
            {{ loading ? 'Memverifikasi...' : 'Masuk Sekarang ➔' }}
          </button>
        </form>

        <div class="mt-6 border-t border-slate-100 pt-4 text-center">
          <NuxtLink to="/pemilu/2024/dpr-ri/dapil/4874" class="text-xs font-semibold text-blue-700 hover:underline">
            ★ Eksplorasi Demo Gratis: Dapil Sumatera Selatan II (Tanpa Login)
          </NuxtLink>
        </div>
      </div>

      <!-- Informasi Akses & WhatsApp -->
      <div class="bs-card flex flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-800 to-[var(--bs-navy)] p-6 md:p-8 text-white">
        <div class="space-y-4">
          <span class="inline-flex rounded-full bg-[var(--bs-gold)] px-2.5 py-0.5 text-[10px] font-black uppercase text-slate-950">
            Hak Akses & Lisensi
          </span>
          <h2 class="text-xl font-extrabold md:text-2xl">Informasi Pembukaan Akses Data</h2>
          <p class="text-xs text-slate-300 leading-relaxed">
            Data pemilu disajikan secara terbuka hingga tingkat Kabupaten/Kota. Untuk mengakses perolehan suara partai dan calon legislatif hingga level <b>Kecamatan, Desa, dan TPS</b>, silakan hubungi tim kami untuk aktivasi akun.
          </p>

          <div class="space-y-2.5 pt-2 text-xs">
            <div class="rounded-xl bg-white/10 p-3">
              <div class="font-bold text-[var(--bs-gold)]">1. User Tingkat Nasional</div>
              <div class="text-slate-300">Akses seluruh provinsi, dapil, kabupaten hingga TPS nasional + manajemen user.</div>
            </div>
            <div class="rounded-xl bg-white/10 p-3">
              <div class="font-bold text-[var(--bs-gold)]">2. User Tingkat Provinsi</div>
              <div class="text-slate-300">Akses seluruh data dalam 1 provinsi terpilih sampai level TPS.</div>
            </div>
            <div class="rounded-xl bg-white/10 p-3">
              <div class="font-bold text-[var(--bs-gold)]">3. User Tingkat Dapil DPR RI</div>
              <div class="text-slate-300">Akses suara partai dan caleg dalam 1 Dapil DPR RI hingga level TPS.</div>
            </div>
            <div class="rounded-xl bg-white/10 p-3">
              <div class="font-bold text-[var(--bs-gold)]">4. User Tingkat Kabupaten</div>
              <div class="text-slate-300">Akses khusus 1 kabupaten/kota terpilih hingga level TPS.</div>
            </div>
          </div>
        </div>

        <div class="mt-6 pt-4 border-t border-white/10">
          <div class="text-xs text-slate-300 mb-2">Untuk aktivasi akun dan pertanyaan teknis, kirim pesan ke:</div>
          <a 
            :href="`https://wa.me/${waContact}?text=Halo%20Admin%2C%20saya%20ingin%20mengajukan%20akses%20akun%20Bedah%20Suara`" 
            target="_blank" 
            rel="noopener"
            class="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-500"
          >
            <span>📱 Kirim WhatsApp ke {{ waContact }}</span>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
