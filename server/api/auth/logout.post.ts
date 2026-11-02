import { hashToken } from '../../utils/auth'
import { query } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const cookie = getCookie(event, 'bs_session')
  if (cookie) {
    const tokenHash = hashToken(cookie)
    await query(`DELETE FROM user_sessions WHERE token_hash = ?`, [tokenHash])
  }

  deleteCookie(event, 'bs_session', { path: '/' })
  return { success: true }
})
