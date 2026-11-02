import { getRegencyDetail } from '../../../../../../repositories/dprRi'

export default defineEventHandler(async (event) => {
  const year = Number(getRouterParam(event, 'year'))
  const id = Number(getRouterParam(event, 'id'))
  const kabId = Number(getRouterParam(event, 'kabId'))

  const detail = await getRegencyDetail(year, id, kabId)
  if (!detail) throw createError({ statusCode: 404, statusMessage: 'Kabupaten tidak ditemukan' })

  return detail
})
