import crypto from 'node:crypto'
import type { H3Event } from 'h3'
import { query, queryOne } from './db'

export interface AuthUser {
  id: number
  name: string
  email: string
  role: 'super_admin' | 'viewer'
  scope_kind: string
  status: string
  bindings?: any[]
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function createSession(userId: number): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashToken(token)
  const csrfToken = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 hari

  // Simpan ke user_sessions yang sudah ada di database
  await query(
    `INSERT INTO user_sessions (token_hash, user_id, csrf_token, auth_revision, expires_at, created_at)
     VALUES (?, ?, ?, 1, ?, NOW())
     ON DUPLICATE KEY UPDATE expires_at = VALUES(expires_at)`,
    [tokenHash, userId, csrfToken, expiresAt]
  )

  return { token, expiresAt }
}

export async function getUserFromSession(event: H3Event): Promise<AuthUser | null> {
  const cookie = getCookie(event, 'bs_session')
  if (!cookie) return null

  const tokenHash = hashToken(cookie)
  const session = await queryOne<any>(
    `SELECT s.user_id, s.expires_at, u.id, u.name, u.email, u.role, u.scope_kind, u.status
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > NOW() AND u.status = 'active'`,
    [tokenHash]
  )

  if (!session) return null

  // Ambil binding wilayah jika ada
  const bindings = await query<any>(
    `SELECT election_year, region_id, constituency_id FROM user_access_bindings WHERE user_id = ?`,
    [session.id]
  )

  return {
    id: session.id,
    name: session.name,
    email: session.email,
    role: session.role,
    scope_kind: session.scope_kind,
    status: session.status,
    bindings
  }
}

export function checkAccess(
  user: AuthUser | null,
  context: {
    constituencyId?: number
    regionId?: number
    provinceId?: number
    level: 'national' | 'province' | 'dapil' | 'regency' | 'district' | 'village' | 'tps'
  }
): { allowed: boolean; reason?: string } {
  // Aturan Khusus PRD: Dapil Sumatera Selatan II (ID 4874) adalah data free demo sampai level TPS!
  if (context.constituencyId === 4874) {
    return { allowed: true }
  }

  // Level publik gratis: sampai kabupaten / dapil
  if (['national', 'province', 'dapil', 'regency'].includes(context.level)) {
    return { allowed: true }
  }

  // Tingkat Kecamatan, Desa, dan TPS diproteksi password / login
  if (!user) {
    return {
      allowed: false,
      reason: 'Akses tingkat kecamatan ke bawah memerlukan login. Hubungi WhatsApp 62811945222 untuk mendapatkan akses.'
    }
  }

  // Super admin / Nasional memiliki akses penuh
  if (user.role === 'super_admin' || user.scope_kind === 'national') {
    return { allowed: true }
  }

  // User tingkat Dapil DPR RI
  if (user.scope_kind === 'dpr_ri' && context.constituencyId) {
    const hasDapil = user.bindings?.some(b => b.constituency_id === context.constituencyId)
    if (hasDapil) return { allowed: true }
    return { allowed: false, reason: 'Akun Anda tidak memiliki hak akses untuk Dapil ini.' }
  }

  // User tingkat Kabupaten
  if (user.scope_kind === 'regency' && context.regionId) {
    const hasRegency = user.bindings?.some(b => b.region_id === context.regionId)
    if (hasRegency) return { allowed: true }
    return { allowed: false, reason: 'Akun Anda tidak memiliki hak akses untuk Kabupaten ini.' }
  }

  return { allowed: false, reason: 'Hak akses tidak mencukupi untuk wilayah ini.' }
}
