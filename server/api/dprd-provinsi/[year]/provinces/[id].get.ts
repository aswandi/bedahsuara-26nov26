import { nationalDprdProvinsi, regencyPartyWinners } from '../../../../repositories/dprdProvinsi'
import { queryOne } from '../../../../utils/db'

export default defineEventHandler(async (event) => {
  const year = Number(getRouterParam(event, 'year'))
  const id = Number(getRouterParam(event, 'id'))
  if (year !== 2024 || !Number.isSafeInteger(id) || id <= 0) throw createError({ statusCode: 400, statusMessage: 'Parameter tidak valid' })
  const province = await queryOne<any>(
    `SELECT id, name, code FROM regions WHERE election_year = ? AND level = 'province' AND id = ?`, [year, id]
  )
  if (!province) throw createError({ statusCode: 404, statusMessage: 'Provinsi tidak ditemukan' })
  const data = await nationalDprdProvinsi(year)
  const dapil = data.dapil.filter((d: any) => Number(d.province_id) === id)
  const regencyWinners = await regencyPartyWinners(year, id, province.name, data.parties)
  return { province, parties: data.parties, dapil, regencyWinners }
})
