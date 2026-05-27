const MAPS_API_BASE = 'https://maps.googleapis.com/maps/api'
const DISTANCE_MATRIX_BATCH = 25

// Walking speed: ~80 m/min
const WALK_SPEED_M_PER_SEC = 80 / 60

// Known Toronto landmark coordinates used when Geocoding API is unavailable
const TORONTO_LANDMARKS: Record<string, { lat: number; lng: number }> = {
  'rogers centre': { lat: 43.6414, lng: -79.3894 },
  'scotiabank arena': { lat: 43.6435, lng: -79.3791 },
  'tiff bell lightbox': { lat: 43.6468, lng: -79.3896 },
  'art gallery of ontario': { lat: 43.6536, lng: -79.3925 },
  'ago': { lat: 43.6536, lng: -79.3925 },
  'union station': { lat: 43.6452, lng: -79.3806 },
  'cn tower': { lat: 43.6426, lng: -79.3871 },
  'ossington': { lat: 43.6540, lng: -79.4233 },
  'kensington market': { lat: 43.6544, lng: -79.4007 },
  'distillery district': { lat: 43.6503, lng: -79.3597 },
  'yonge-dundas': { lat: 43.6561, lng: -79.3802 },
}

// Toronto city centre — fallback when address can't be geocoded
const TORONTO_CENTRE: LatLng = { lat: 43.6532, lng: -79.3832 }

export interface LatLng {
  lat: number
  lng: number
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

function estimateWalkSeconds(from: LatLng, to: LatLng): number {
  const distM = haversineM(from.lat, from.lng, to.lat, to.lng)
  // Add 20% factor for non-straight-line walking routes
  return Math.round((distM * 1.2) / WALK_SPEED_M_PER_SEC)
}

function lookupLandmark(address: string): LatLng | null {
  const lower = address.toLowerCase()
  for (const [key, coords] of Object.entries(TORONTO_LANDMARKS)) {
    if (lower.includes(key)) return coords
  }
  return null
}

export async function geocodeAddress(address: string): Promise<LatLng | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY

  if (!key) {
    // No API key — try landmark lookup then fall back to city centre
    const landmark = lookupLandmark(address)
    if (landmark) return landmark
    console.warn('[SpotMe] No GOOGLE_MAPS_API_KEY — using Toronto city centre for geocoding')
    return TORONTO_CENTRE
  }

  try {
    const params = new URLSearchParams({ address, key })
    const res = await fetch(`${MAPS_API_BASE}/geocode/json?${params}`)
    if (!res.ok) throw new Error(`Geocoding API error: ${res.status}`)
    const data = await res.json()
    if (data.status !== 'OK' || !data.results?.length) return lookupLandmark(address) ?? TORONTO_CENTRE
    const loc = data.results[0].geometry.location
    return { lat: loc.lat, lng: loc.lng }
  } catch (err) {
    console.error('[SpotMe] Geocoding failed, using fallback:', err instanceof Error ? err.message : err)
    return lookupLandmark(address) ?? TORONTO_CENTRE
  }
}

export async function getWalkTimesToDestination(
  lots: Array<{ lat: number; lng: number }>,
  destination: LatLng
): Promise<Map<number, number>> {
  const key = process.env.GOOGLE_MAPS_API_KEY

  if (!key) {
    // No API key — estimate walk time from straight-line Haversine distance
    const result = new Map<number, number>()
    lots.forEach((lot, i) => {
      result.set(i, estimateWalkSeconds(lot, destination))
    })
    return result
  }

  const result = new Map<number, number>()
  const destStr = `${destination.lat},${destination.lng}`

  for (let i = 0; i < lots.length; i += DISTANCE_MATRIX_BATCH) {
    const batch = lots.slice(i, i + DISTANCE_MATRIX_BATCH)
    const originsStr = batch.map((l) => `${l.lat},${l.lng}`).join('|')

    try {
      const params = new URLSearchParams({ origins: originsStr, destinations: destStr, mode: 'walking', key })
      const res = await fetch(`${MAPS_API_BASE}/distancematrix/json?${params}`)
      if (!res.ok) throw new Error(`Distance Matrix error: ${res.status}`)
      const data = await res.json()
      if (data.status !== 'OK') throw new Error(`Distance Matrix status: ${data.status}`)

      for (let j = 0; j < batch.length; j++) {
        const element = data.rows[j]?.elements?.[0]
        if (element?.status === 'OK') {
          result.set(i + j, element.duration.value)
        } else {
          // API couldn't route — fall back to Haversine estimate
          result.set(i + j, estimateWalkSeconds(batch[j], destination))
        }
      }
    } catch (err) {
      console.error('[SpotMe] Distance Matrix failed, using Haversine fallback:', err instanceof Error ? err.message : err)
      batch.forEach((lot, j) => result.set(i + j, estimateWalkSeconds(lot, destination)))
    }
  }

  return result
}

export async function findNearbyParkingPlaces(
  destination: LatLng,
  radiusMeters: number
): Promise<Array<{ name: string; address: string; lat: number; lng: number; place_id: string }>> {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) {
    // No API key — skip Places API, Green P data is sufficient for demo
    return []
  }

  try {
    const params = new URLSearchParams({
      location: `${destination.lat},${destination.lng}`,
      radius: String(radiusMeters),
      type: 'parking',
      key,
    })
    const res = await fetch(`${MAPS_API_BASE}/place/nearbysearch/json?${params}`)
    if (!res.ok) return []
    const data = await res.json()
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') return []

    return (data.results || []).map((place: any) => ({
      name: place.name,
      address: place.vicinity || '',
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      place_id: place.place_id,
    }))
  } catch {
    return []
  }
}
