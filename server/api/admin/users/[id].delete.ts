import { getUserFromSession } from '../../../utils/auth'
import { query } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const admin = await getUserFromSession(event)
  if (!admin || admin.role !== 'super_admin') {
    throw createError({ statusCode: 403, statusMessage: 'Hanya Administrator Nasional yang dapat menghapus pengguna' })
  }

  const id = Number(getRouterParam(event, 'id'))
  if (id === 1) {
    throw createError({ statusCode: 400, statusMessage: 'Akun Administrator Utama tidak boleh dihapus' })
  }

  await query(`DELETE FROM user_access_bindings WHERE user_id = ?`, [id])
  await query(`DELETE FROM user_sessions WHERE user_id = ?`, [id])
  await query(`UPDATE users SET status = 'deleted' WHERE id = ?`, [id])

  return { success: true }
})
