export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  vite: { server: { allowedHosts: ['aswandi.tail2661c9.ts.net', '100.102.175.102'] } },
  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    dbHost: process.env.DB_HOST,
    dbPort: process.env.DB_PORT,
    dbName: process.env.DB_NAME,
    dbUser: process.env.DB_USER,
    dbPassword: process.env.DB_PASSWORD,
    authSecret: process.env.AUTH_SECRET,
    public: { waContact: process.env.WA_CONTACT || '62811945222' }
  },
  app: {
    head: {
      htmlAttrs: { lang: 'id' },
      title: 'BEDAH SUARA — Data Pemilu Indonesia',
      meta: [{ name: 'description', content: 'Bedah data Pemilu 2019, 2024 dan Pilkada 2024 dari nasional hingga TPS.' }]
    }
  }
})
