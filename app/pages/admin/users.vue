<script setup lang="ts">
const { data, refresh } = await useFetch<any>('/api/admin/users')
const { data: authData } = await useFetch<any>('/api/auth/me')

if (authData.value?.user?.role !== 'super_admin') {
  await navigateTo('/login?redirect=/admin/users')
}

const showModal = ref(false)
const form = ref({
  name: '',
  email: '',
  password: '',
  role: 'viewer',
  scope_kind: 'national',
  region_id: null,
  constituency_id: null
})

const loading = ref(false)
const errorMsg = ref('')

async function createUser() {
  loading.value = true
  errorMsg.value = ''
  try {
    await $fetch('/api/admin/users', {
      method: 'POST',
      body: form.value
    })
    showModal.value = false
    form.value = { name: '', email: '', password: '', role: 'viewer', scope_kind: 'national', region_id: null, constituency_id: null }
    await refresh()
  } catch (err: any) {
    errorMsg.value = err?.data?.statusMessage || 'Gagal menambahkan user'
  } finally {
    loading.value = false
  }
}

async function deleteUser(id: number) {
  if (!confirm('Hapus pengguna ini?')) return
  try {
    await $fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    await refresh()
  } catch (err: any) {
    alert(err?.data?.statusMessage || 'Gagal menghapus pengguna')
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-black text-slate-900">Manajemen Pengguna</h1>
        <p class="text-xs text-slate-500">Kelola hak akses berjenjang (Nasional, Provinsi, Dapil DPR RI, Kabupaten)</p>
      </div>
      <button 
        @click="showModal = true"
        class="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-blue-500"
      >
        + Tambah Pengguna
      </button>
    </div>

    <!-- Tabel Pengguna -->
    <div class="bs-card overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead class="bg-slate-900 text-white">
          <tr>
            <th class="px-4 py-3 text-left">Nama</th>
            <th class="px-4 py-3 text-left">Email</th>
            <th class="px-4 py-3 text-left">Peran</th>
            <th class="px-4 py-3 text-left">Cakupan Akses</th>
            <th class="px-4 py-3 text-left">Wilayah Terkait</th>
            <th class="px-4 py-3 text-center">Status</th>
            <th class="px-4 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in data?.users" :key="u.id" class="border-t hover:bg-slate-50">
            <td class="px-4 py-3 font-bold text-slate-800">{{ u.name }}</td>
            <td class="px-4 py-3 text-slate-600">{{ u.email }}</td>
            <td class="px-4 py-3">
              <span :class="u.role === 'super_admin' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-800'" class="rounded px-2 py-0.5 text-xs font-semibold">
                {{ u.role }}
              </span>
            </td>
            <td class="px-4 py-3 text-slate-700 capitalize font-medium">{{ u.scope_kind }}</td>
            <td class="px-4 py-3 text-slate-500 text-xs">
              {{ u.constituency_name || u.region_name || 'Semua Wilayah' }}
            </td>
            <td class="px-4 py-3 text-center">
              <span :class="u.status === 'active' ? 'text-emerald-600' : 'text-slate-400'" class="text-xs font-bold capitalize">
                {{ u.status }}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <button 
                v-if="u.id !== 1"
                @click="deleteUser(u.id)" 
                class="text-xs font-bold text-red-600 hover:underline"
              >
                Hapus
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Tambah User -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div class="bs-card w-full max-w-md p-6 space-y-4">
        <h2 class="text-lg font-black text-slate-900">Tambah Pengguna Baru</h2>
        <div v-if="errorMsg" class="rounded-xl bg-red-50 p-2 text-xs font-semibold text-red-700">{{ errorMsg }}</div>

        <form @submit.prevent="createUser" class="space-y-3">
          <div>
            <label class="block text-xs font-bold text-slate-700">Nama Lengkap</label>
            <input v-model="form.name" required class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700">Email</label>
            <input v-model="form.email" type="email" required class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700">Kata Sandi</label>
            <input v-model="form.password" type="password" required class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700">Tingkat Akses (Scope Kind)</label>
            <select v-model="form.scope_kind" class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm">
              <option value="national">Nasional (Semua Data)</option>
              <option value="province">Provinsi (1 Provinsi)</option>
              <option value="dpr_ri">Dapil DPR RI (1 Dapil)</option>
              <option value="regency">Kabupaten (1 Kabupaten/Kota)</option>
            </select>
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="showModal = false" class="rounded-lg px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100">Batal</button>
            <button type="submit" :disabled="loading" class="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500">
              {{ loading ? 'Menyimpan...' : 'Simpan User' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
