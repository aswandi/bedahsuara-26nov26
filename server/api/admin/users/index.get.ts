import { getUserFromSession } from '../../../utils/auth'
import { query } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user || user.role !== 'super_admin') {
    throw createError({ statusCode: 403, statusMessage: 'Hanya Administrator Nasional yang dapat mengelola pengguna' })
  }

  const users = await query<any>(
    `SELECT u.id, u.name, u.email, u.role, u.scope_kind, u.status, u.created_at,
            b.region_id, b.constituency_id,
            r.name as region_name, c.name as constituency_name
       FROM users u
       LEFT JOIN user_access_bindings b ON b.user_id = u.id AND b.election_year = 2024
       LEFT JOIN regions r ON r.id = b.region_id
       LEFT JOIN constituencies c ON c.id = b.constituency_id
      ORDER BY u.id DESC`
  )

  return { users }
})
