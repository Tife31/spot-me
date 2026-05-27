import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { validateQueryParams, createErrorResponse } from '@/lib/api-helpers'
import { spotMeSettings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { geocodeAddress, getWalkTimesToDestination, findNearbyParkingPlaces } from '../../lib/google-maps'
import { getGreenPLots, getMockGreenPLots, filterLotsByRadius } from '../../lib/green-p'
import { computeRecommendations } from '../../lib/recommendations'
import type { ParkingLot } from '../../types'
import type { LotWithWalk } from '../../lib/recommendations'

const QuerySchema = z.object({
  location: z.string().min(1, 'Location is required').max(500, 'Location too long'),
  duration_hours: z.coerce.number().min(0.25, 'Duration must be at least 15 minutes').max(24, 'Duration cannot exceed 24 hours'),
})

// 2 km ≈ 25 min walk at 80 m/min
const SEARCH_RADIUS_KM = 2.2
const SEARCH_RADIUS_M = 2200

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryValidation = validateQueryParams(searchParams, QuerySchema)
    if (!queryValidation.success) return queryValidation.response

    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) return createErrorResponse('Unauthorized', 401)

    const { location, duration_hours } = queryValidation.data

    // Fetch user's max walk preference
    const rows = await withRLS((db) =>
      db.select({ maxWalkMinutes: spotMeSettings.maxWalkMinutes })
        .from(spotMeSettings)
        .where(eq(spotMeSettings.userId, user.id))
        .limit(1)
    )
    const maxWalkMinutes = rows[0]?.maxWalkMinutes ?? 25

    // Geocode destination — falls back gracefully when no API key
    const destination = await geocodeAddress(location)
    if (!destination) {
      return createErrorResponse('Could not geocode the provided location', 422)
    }

    // Fetch parking lots — getGreenPLots falls back to mock data on API failure
    // findNearbyParkingPlaces returns [] when no API key (skipped silently)
    const sourceLots = await getGreenPLots()
    const greenPLots = sourceLots.length
      ? filterLotsByRadius(sourceLots, destination.lat, destination.lng, SEARCH_RADIUS_KM)
      : filterLotsByRadius(getMockGreenPLots(), destination.lat, destination.lng, SEARCH_RADIUS_KM)

    const placesResults = await findNearbyParkingPlaces(destination, SEARCH_RADIUS_M)

    // Merge into unified ParkingLot list (deduplicate by proximity)
    const allLots: ParkingLot[] = [
      ...greenPLots.map((l) => ({ ...l, source: 'green_p' as const })),
      ...placesResults
        .filter((p) => !greenPLots.some((g) => haversineM(g.lat, g.lng, p.lat, p.lng) < 50))
        .map((p) => ({
          name: p.name,
          address: p.address,
          lat: p.lat,
          lng: p.lng,
          hourly_rate: null,
          daily_max: null,
          source: 'google_places' as const,
          place_id: p.place_id,
        })),
    ]

    if (allLots.length === 0) {
      return NextResponse.json({
        price: null,
        proximity: null,
        best: null,
        destination,
        event_duration_hours: duration_hours,
      })
    }

    // Get walk times for all lots
    const walkMap = await getWalkTimesToDestination(allLots, destination)

    const lotsWithWalk: LotWithWalk[] = allLots
      .map((lot, i) => ({ ...lot, walk_seconds: walkMap.get(i) ?? Infinity }))
      .filter((l) => l.walk_seconds !== Infinity)

    const recommendations = computeRecommendations(lotsWithWalk, duration_hours, maxWalkMinutes)

    return NextResponse.json({ ...recommendations, destination, event_duration_hours: duration_hours })
  } catch (error) {
    console.error('GET /api/modules/spot-me/recommendations error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}
