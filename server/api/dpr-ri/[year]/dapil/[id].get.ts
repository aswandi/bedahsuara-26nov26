import { getDapilDetail, getDapilRegencies } from '../../../../repositories/dprRi'

export default defineEventHandler(async (event) => {
  const year = Number(getRouterParam(event, 'year'))
  const id = Number(getRouterParam(event, 'id'))
  const detail = await getDapilDetail(year, id)
  if (!detail) throw createError({ statusCode: 404, statusMessage: 'Dapil tidak ditemukan' })
  const regencies = await getDapilRegencies(year, id)
  return { ...detail, regencies }
})
