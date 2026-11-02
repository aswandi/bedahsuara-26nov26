import { getPilpresNational } from '../../../repositories/pilpres'

export default defineEventHandler(async (event) => {
  const year = getRouterParam(event, 'year')
  if (year !== '2024') throw createError({ statusCode: 404, statusMessage: 'Pilpres tahun ini belum tersedia' })
  return getPilpresNational(Number(year))
})
