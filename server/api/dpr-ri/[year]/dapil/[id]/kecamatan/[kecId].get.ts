import { getDistrictDetail } from '../../../../../../repositories/dprRi'

export default defineEventHandler(async (event) => {
  const year = Number(getRouterParam(event, 'year'))
  const id = Number(getRouterParam(event, 'id'))
  const kecId = Number(getRouterParam(event, 'kecId'))

  const detail = await getDistrictDetail(year, id, kecId)
  if (!detail) throw createError({ statusCode: 404, statusMessage: 'Kecamatan tidak ditemukan' })

  return detail
})
