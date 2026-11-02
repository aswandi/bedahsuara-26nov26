import mysql from 'mysql2/promise'
import type { Pool } from 'mysql2/promise'

let pool: Pool | null = null

/** Pool koneksi read-only untuk data pemilu. Kredensial dari runtimeConfig (.env). */
export function getPool(): Pool {
  if (!pool) {
    const c = useRuntimeConfig()
    pool = mysql.createPool({
      host: c.dbHost,
      port: Number(c.dbPort),
      database: c.dbName,
      user: c.dbUser,
      password: c.dbPassword,
      connectionLimit: 10,
      decimalNumbers: true,
      charset: 'utf8mb4'
    })
  }
  return pool
}

/** Query parameterized. Selalu gunakan prefix indeks (election_id, contest_type, ...). */
export async function query<T = Record<string, any>>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await getPool().query(sql, params)
  return rows as T[]
}

export async function queryOne<T = Record<string, any>>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] ?? null
}
