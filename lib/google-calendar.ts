import { encrypt, decrypt } from '@/lib/crypto'
import { spotMeSettings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3'

// Toronto detection: city name or M-prefix postal code
const TORONTO_RE = /toronto|north york|scarborough|etobicoke|york|east york|\bON\b|ontario|\bM\d[A-Z]\s?\d[A-Z]\d\b/i

export interface RawCalendarEvent {
  id: string
  summary?: string
  location?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
}

export interface GoogleTokens {
  accessToken: string
  refreshToken: string
  tokenExpiry: string | null
  email: string | null
}

export function encryptToken(token: string): string {
  return encrypt(token)
}

export function decryptToken(encrypted: string): string {
  return decrypt(encrypted)
}

async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Token refresh failed: ${err.error_description || err.error || res.status}`)
  }

  const data = await res.json()
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()
  return { accessToken: data.access_token, expiresAt }
}

export async function getValidAccessToken(
  withRLS: <T>(fn: (db: any) => Promise<T>) => Promise<T>,
  userId: string,
  storedTokens: { accessToken: string; refreshToken: string; tokenExpiry: string | null }
): Promise<string> {
  const { accessToken, refreshToken, tokenExpiry } = storedTokens
  const expiresAt = tokenExpiry ? new Date(tokenExpiry).getTime() : 0
  const needsRefresh = expiresAt - Date.now() < 60_000

  if (!needsRefresh) {
    return decryptToken(accessToken)
  }

  const decryptedRefresh = decryptToken(refreshToken)
  const { accessToken: newToken, expiresAt: newExpiry } = await refreshAccessToken(decryptedRefresh)

  await withRLS((db) =>
    db.update(spotMeSettings)
      .set({
        googleAccessToken: encryptToken(newToken),
        googleTokenExpiry: newExpiry,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(spotMeSettings.userId, userId))
  )

  return newToken
}

function parseEventTime(event: RawCalendarEvent): { start: string; end: string } | null {
  const start = event.start?.dateTime || event.start?.date
  const end = event.end?.dateTime || event.end?.date
  if (!start || !end) return null
  return { start, end }
}

function isTorontoLocation(location: string): boolean {
  return TORONTO_RE.test(location)
}

function durationHours(start: string, end: string): number {
  const diff = new Date(end).getTime() - new Date(start).getTime()
  return Math.max(0.5, diff / 1000 / 3600)
}

export async function fetchUpcomingTorontoEvents(accessToken: string): Promise<RawCalendarEvent[]> {
  const now = new Date().toISOString()
  const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const params = new URLSearchParams({
    calendarId: 'primary',
    timeMin: now,
    timeMax: sevenDays,
    maxResults: '50',
    singleEvents: 'true',
    orderBy: 'startTime',
  })

  const res = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Calendar API error: ${err.error?.message || res.status}`)
  }

  const data = await res.json()
  const items: RawCalendarEvent[] = data.items || []

  return items.filter(
    (e) => e.location && isTorontoLocation(e.location) && parseEventTime(e) !== null
  )
}

export function normalizeEvent(event: RawCalendarEvent) {
  const times = parseEventTime(event)!
  return {
    id: event.id,
    summary: event.summary || 'Untitled event',
    location: event.location!,
    start_time: times.start,
    end_time: times.end,
    duration_hours: durationHours(times.start, times.end),
  }
}
