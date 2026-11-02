import { getProvince } from '../../../../repositories/dprRi'

export default defineEventHandler(async (event) => {
  const year = Number(getRouterParam(event, 'year'))
  const id = Number(getRouterParam(event, 'id'))
  const res = await getProvince(year, id)
  if (!res) throw createError({ statusCode: 404, statusMessage: 'Provinsi tidak ditemukan' })
  return res
})
