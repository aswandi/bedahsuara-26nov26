import crypto from 'node:crypto'
import { query } from '../utils/db'
import { getUserFromSession } from '../utils/auth'

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  const path = url.pathname

  // Lewati static assets dan nuxt internal routes
  if (path.startsWith('/_nuxt') || path.startsWith('/__nuxt') || path.includes('.')) {
    return
  }

  try {
    const user = await getUserFromSession(event).catch(() => null)
    const eventId = crypto.randomUUID()
    const eventType = path.startsWith('/api') ? 'api_call' : 'page_view'
    const routeTemplate = path.slice(0, 120)
    const scopeJson = JSON.stringify({
      query: getQuery(event),
      ip: getRequestIP(event, { xForwardedFor: true }) || '127.0.0.1',
      userAgent: getHeader(event, 'user-agent') || ''
    })

    // Catat ke tabel user_activity_events tanpa memblokir respon
    query(
      `INSERT INTO user_activity_events (event_id, user_id, event_type, route_template, scope_json, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [eventId, user?.id || null, eventType, routeTemplate, scopeJson]
    ).catch(() => {
      // Ignore background tracking errors
    })
  } catch {
    // Non-blocking
  }
})
