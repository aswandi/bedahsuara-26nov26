<script setup lang="ts">
const open = ref<string | null>(null)
const mobile = ref(false)
const route = useRoute()
watch(() => route.fullPath, () => { mobile.value = false; open.value = null })

const { data: authData, refresh: refreshAuth } = await useFetch<any>('/api/auth/me')

async function handleLogout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await refreshAuth()
  await navigateTo('/')
}
</script>

<template>
  <header class="sticky top-0 z-50 bg-[var(--bs-navy)] text-white shadow-lg">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
      <NuxtLink to="/" class="text-xl font-extrabold tracking-wide">
        BEDAH <span class="text-[var(--bs-gold)]">SUARA</span>
      </NuxtLink>

      <nav class="hidden items-center gap-1 lg:flex">
        <div
          v-for="item in navItems"
          :key="item.label"
          class="relative"
          @mouseenter="open = item.label"
          @mouseleave="open = null"
        >
          <NuxtLink
            v-if="item.to && !item.children"
            :to="item.to"
            class="block rounded-lg px-3 py-2 text-sm hover:bg-white/10"
          >{{ item.label }}</NuxtLink>
          <span
            v-else
            class="flex cursor-default items-center gap-1 rounded-lg px-3 py-2 text-sm hover:bg-white/10"
          >
            {{ item.label }}
            <small v-if="item.soon" class="rounded bg-[var(--bs-gold)] px-1 text-[10px] font-bold text-slate-900">SOON</small>
            <span v-else-if="item.children">▾</span>
          </span>

          <Transition name="dd">
            <ul
              v-if="item.children && open === item.label"
              class="absolute left-0 top-full min-w-56 overflow-hidden rounded-xl bg-white py-2 text-slate-800 shadow-2xl ring-1 ring-slate-200"
            >
              <li v-for="c in item.children" :key="c.label">
                <NuxtLink v-if="c.to" :to="c.to" class="block px-4 py-2 text-sm hover:bg-slate-100">{{ c.label }}</NuxtLink>
                <span v-else class="flex items-center justify-between px-4 py-2 text-sm text-slate-400">
                  {{ c.label }}
                  <small class="rounded bg-slate-200 px-1 text-[10px] font-bold">Coming Soon</small>
                </span>
              </li>
            </ul>
          </Transition>
        </div>
      </nav>

      <div class="flex items-center gap-2">
        <template v-if="authData?.user">
          <NuxtLink 
            v-if="authData.user.role === 'super_admin'" 
            to="/admin/users" 
            class="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold hover:bg-blue-500 hidden sm:inline-block"
          >
            Admin User
          </NuxtLink>
          <span class="text-xs text-white/80 hidden md:inline-block">{{ authData.user.name }}</span>
          <button @click="handleLogout" class="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold hover:bg-slate-600">
            Keluar
          </button>
        </template>
        <template v-else>
          <NuxtLink to="/login" class="rounded-lg bg-[var(--bs-red)] px-3 py-1.5 text-sm font-semibold hover:brightness-110">Masuk</NuxtLink>
        </template>
        <button class="rounded-lg p-2 hover:bg-white/10 lg:hidden" aria-label="Menu" @click="mobile = !mobile">☰</button>
      </div>
    </div>

    <Transition name="dd">
      <div v-if="mobile" class="border-t border-white/10 px-4 pb-4 lg:hidden">
        <div v-for="item in navItems" :key="item.label" class="py-1">
          <NuxtLink v-if="item.to && !item.children" :to="item.to" class="block py-2">{{ item.label }}</NuxtLink>
          <details v-else>
            <summary class="cursor-pointer py-2">
              {{ item.label }} <small v-if="item.soon" class="text-[var(--bs-gold)]">(Coming Soon)</small>
            </summary>
            <ul class="pl-4">
              <li v-for="c in item.children" :key="c.label" class="py-1 text-sm">
                <NuxtLink v-if="c.to" :to="c.to">{{ c.label }}</NuxtLink>
                <span v-else class="text-white/50">{{ c.label }} (Coming Soon)</span>
              </li>
            </ul>
          </details>
        </div>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
.dd-enter-active, .dd-leave-active { transition: all .2s ease; }
.dd-enter-from, .dd-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
