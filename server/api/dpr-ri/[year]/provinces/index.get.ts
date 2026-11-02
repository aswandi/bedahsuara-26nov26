import { nationalProvinceParties } from '../../../../repositories/dprRi'

export default defineEventHandler(async (event) => {
  const year = Number(getRouterParam(event, 'year'))
  if (![2019, 2024].includes(year)) throw createError({ statusCode: 400, statusMessage: 'Tahun tidak valid' })
  return nationalProvinceParties(year)
})
