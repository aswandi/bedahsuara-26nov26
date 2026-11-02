import { nationalDprdProvinsi } from '../../../../repositories/dprdProvinsi'

export default defineEventHandler(async (event) => {
  const year = Number(getRouterParam(event, 'year'))
  if (year !== 2024) throw createError({ statusCode: 400, statusMessage: 'Tahun tidak valid' })
  return nationalDprdProvinsi(year)
})
