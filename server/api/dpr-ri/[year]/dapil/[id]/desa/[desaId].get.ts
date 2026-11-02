import { getVillageDetail } from '../../../../../../repositories/dprRi'

export default defineEventHandler(async (event) => {
  const year = Number(getRouterParam(event, 'year'))
  const id = Number(getRouterParam(event, 'id'))
  const desaId = Number(getRouterParam(event, 'desaId'))

  const detail = await getVillageDetail(year, id, desaId)
  if (!detail) throw createError({ statusCode: 404, statusMessage: 'Desa/Kelurahan tidak ditemukan' })

  return detail
})
