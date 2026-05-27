import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { createErrorResponse } from '@/lib/api-helpers'
import { spotMeSettings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getValidAccessToken, fetchUpcomingTorontoEvents, normalizeEvent } from '../../lib/google-calendar'

function mockEvents() {
  const day = (offset: number, hour: number) => {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    d.setHours(hour, 0, 0, 0)
    return d.toISOString()
  }

  return [
    {
      id: 'mock-1',
      summary: 'Team Offsite',
      location: 'Rogers Centre, 1 Blue Jays Way, Toronto, ON',
      start_time: day(2, 9),
      end_time: day(2, 17),
      duration_hours: 8,
    },
    {
      id: 'mock-2',
      summary: 'Client Dinner',
      location: 'TIFF Bell Lightbox, 350 King St W, Toronto, ON',
      start_time: day(3, 18),
      end_time: day(3, 21),
      duration_hours: 3,
    },
    {
      id: 'mock-3',
      summary: 'Gallery Opening',
      location: 'Art Gallery of Ontario, 317 Dundas St W, Toronto, ON',
      start_time: day(5, 19),
      end_time: day(5, 21),
      duration_hours: 2,
    },
  ]
}

export async function GET(_request: NextRequest) {
  try {
    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) return createErrorResponse('Unauthorized', 401)

    const rows = await withRLS((db) =>
      db.select()
        .from(spotMeSettings)
        .where(eq(spotMeSettings.userId, user.id))
        .limit(1)
    )

    // Not connected — return mock events so the UI is usable without a calendar
    if (!rows.length || !rows[0].googleAccessToken || !rows[0].googleRefreshToken) {
      return NextResponse.json({ events: mockEvents(), mock: true })
    }

    const settings = rows[0]

    try {
      const accessToken = await getValidAccessToken(withRLS, user.id, {
        accessToken: settings.googleAccessToken!,
        refreshToken: settings.googleRefreshToken!,
        tokenExpiry: settings.googleTokenExpiry,
      })
      const rawEvents = await fetchUpcomingTorontoEvents(accessToken)
      const events = rawEvents.slice(0, 20).map(normalizeEvent)
      return NextResponse.json({ events })
    } catch (calendarErr) {
      console.error('[SpotMe] Calendar fetch failed, falling back to mock:', calendarErr instanceof Error ? calendarErr.message : calendarErr)
      return NextResponse.json({ events: mockEvents(), mock: true })
    }
  } catch (error) {
    console.error('GET /api/modules/spot-me/calendar error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}
