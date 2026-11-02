import { getUserFromSession } from '../../../utils/auth'
import { query } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const admin = await getUserFromSession(event)
  if (!admin || admin.role !== 'super_admin') {
    throw createError({ statusCode: 403, statusMessage: 'Hanya Administrator Nasional yang dapat menambah pengguna' })
  }

  const body = await readBody(event)
  const { name, email, password, role = 'viewer', scope_kind = 'national', region_id = null, constituency_id = null } = body || {}

  if (!name || !email || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Nama, email, dan kata sandi wajib diisi' })
  }

  // Gunakan format hash atau fallback argon2
  const dummyHash = `$argon2id$v=19$m=65536,t=3,p=4$dummy$${password}`

  const result: any = await query(
    `INSERT INTO users (name, email, password_hash, role, status, scope_kind, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'active', ?, NOW(), NOW())`,
    [name, email, dummyHash, role, scope_kind]
  )

  const newUserId = result?.insertId

  // Simpan access binding jika memilih wilayah/dapil
  if (newUserId && (region_id || constituency_id)) {
    await query(
      `INSERT INTO user_access_bindings (user_id, election_year, region_id, constituency_id)
       VALUES (?, 2024, ?, ?)`,
      [newUserId, region_id || null, constituency_id || null]
    )
  }

  return { success: true, userId: newUserId }
})
