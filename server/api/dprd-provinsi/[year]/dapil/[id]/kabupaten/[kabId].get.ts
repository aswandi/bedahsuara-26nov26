import { dprdProvinsiRegencyDetail } from '../../../../../../repositories/dprdProvinsi'

export default defineEventHandler(async (event) => {
  const year = Number(getRouterParam(event, 'year'))
  const id = Number(getRouterParam(event, 'id'))
  const kabId = Number(getRouterParam(event, 'kabId'))
  if (year !== 2024 || !Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(kabId) || kabId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Parameter tidak valid' })
  }

  const detail = await dprdProvinsiRegencyDetail(year, id, kabId)
  if (!detail) throw createError({ statusCode: 404, statusMessage: 'Kabupaten/Kota tidak ditemukan pada dapil ini' })
  return detail
})
