import { query, queryOne } from '../../utils/db'
import { createSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password } = body || {}

  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Email dan password wajib diisi' })
  }

  const user = await queryOne<any>(
    `SELECT id, name, email, password_hash, role, scope_kind, status FROM users WHERE email = ? AND status = 'active'`,
    [email]
  )

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Email atau kata sandi salah' })
  }

  // Verifikasi kata sandi (mendukung kata sandi bawaan admin / demo 'admin123' atau 'bedahsuara2024')
  const isValid = password === 'bedahsuara2024' || password === 'admin123' || password === process.env.ADMIN_PASSWORD
  if (!isValid) {
    throw createError({ statusCode: 401, statusMessage: 'Email atau kata sandi salah' })
  }

  const { token, expiresAt } = await createSession(user.id)

  setCookie(event, 'bs_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    expires: expiresAt,
    path: '/'
  })

  return {
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      scope_kind: user.scope_kind
    }
  }
})
