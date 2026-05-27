const GREEN_P_API_URL = 'https://www.toronto.ca/data/transportation/parking/parkingData.json'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

// Hardcoded seed data — real downtown Toronto Green P lots with approximate rates.
// Used when the live API is unavailable or hasn't loaded yet.
const MOCK_GREEN_P_LOTS: GreenPLot[] = [
  { id: 'gp1', name: 'Green P — 250 Front St W', address: '250 Front St W, Toronto', lat: 43.6441, lng: -79.3943, hourly_rate: 3.50, daily_max: 25.00 },
  { id: 'gp2', name: 'Green P — 20 Rees St', address: '20 Rees St, Toronto', lat: 43.6387, lng: -79.3853, hourly_rate: 2.75, daily_max: 18.00 },
  { id: 'gp3', name: 'Green P — 30 Mercer St', address: '30 Mercer St, Toronto', lat: 43.6448, lng: -79.3903, hourly_rate: 3.00, daily_max: 20.00 },
  { id: 'gp4', name: 'Green P — 10 Queen St E', address: '10 Queen St E, Toronto', lat: 43.6527, lng: -79.3794, hourly_rate: 2.50, daily_max: 15.00 },
  { id: 'gp5', name: 'Green P — 20 Dundas St W', address: '20 Dundas St W, Toronto', lat: 43.6566, lng: -79.3824, hourly_rate: 3.00, daily_max: 20.00 },
  { id: 'gp6', name: 'Green P — 45 Bay St', address: '45 Bay St, Toronto', lat: 43.6434, lng: -79.3783, hourly_rate: 4.50, daily_max: 30.00 },
  { id: 'gp7', name: 'Green P — 1 Simcoe St', address: '1 Simcoe St, Toronto', lat: 43.6478, lng: -79.3839, hourly_rate: 3.25, daily_max: 22.00 },
  { id: 'gp8', name: 'Green P — 40 University Ave', address: '40 University Ave, Toronto', lat: 43.6534, lng: -79.3868, hourly_rate: 3.75, daily_max: 28.00 },
  { id: 'gp9', name: 'Green P — 100 King St W', address: '100 King St W, Toronto', lat: 43.6485, lng: -79.3806, hourly_rate: 4.00, daily_max: 32.00 },
  { id: 'gp10', name: 'Green P — 75 Elizabeth St', address: '75 Elizabeth St, Toronto', lat: 43.6556, lng: -79.3866, hourly_rate: 2.25, daily_max: 14.00 },
]

export interface GreenPLot {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  hourly_rate: number | null
  daily_max: number | null
}

interface CacheEntry {
  lots: GreenPLot[]
  fetchedAt: number
}

let cache: CacheEntry | null = null

function parseRate(rateStr: string | undefined): number | null {
  if (!rateStr) return null
  const match = rateStr.replace(/[$,]/g, '').match(/(\d+\.?\d*)/)
  if (!match) return null
  const val = parseFloat(match[1])
  return isNaN(val) ? null : val
}

function parseLot(raw: any): GreenPLot | null {
  const lat = parseFloat(raw.lat ?? raw.latitude ?? raw.Lat)
  const lng = parseFloat(raw.lng ?? raw.lng ?? raw.long ?? raw.longitude ?? raw.Lng ?? raw.Long)
  if (isNaN(lat) || isNaN(lng)) return null

  const rates: any[] = raw.rateSet ?? raw.rates ?? raw.RateSet ?? []
  let hourlyRate: number | null = null
  let dailyMax: number | null = null

  for (const r of rates) {
    const rate = parseRate(r.rate ?? r.Rate ?? r.hourlyRate)
    const maxRate = parseRate(r.maxRate ?? r.MaxRate ?? r.dailyMax ?? r.max)
    if (rate !== null && hourlyRate === null) hourlyRate = rate
    if (maxRate !== null && dailyMax === null) dailyMax = maxRate
  }

  return {
    id: String(raw.id ?? raw.Id ?? raw.carParkId ?? Math.random()),
    name: raw.name ?? raw.Name ?? raw.carParkName ?? 'Green P Parking',
    address: raw.address ?? raw.Address ?? raw.streetAddress ?? '',
    lat,
    lng,
    hourly_rate: hourlyRate,
    daily_max: dailyMax,
  }
}

async function fetchFromApi(): Promise<GreenPLot[]> {
  const res = await fetch(GREEN_P_API_URL, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`Green P API error: ${res.status}`)

  const data = await res.json()
  const raw: any[] = data.carparks ?? data.lots ?? data.data ?? (Array.isArray(data) ? data : [])

  return raw.map(parseLot).filter((l): l is GreenPLot => l !== null)
}

export async function getGreenPLots(): Promise<GreenPLot[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.lots
  }

  try {
    const lots = await fetchFromApi()
    cache = { lots, fetchedAt: Date.now() }
    return lots
  } catch (err) {
    console.error('[SpotMe] Green P API fetch failed — using mock data:', err instanceof Error ? err.message : err)
    return cache?.lots ?? MOCK_GREEN_P_LOTS
  }
}

export function getMockGreenPLots(): GreenPLot[] {
  return MOCK_GREEN_P_LOTS
}

export function filterLotsByRadius(lots: GreenPLot[], destLat: number, destLng: number, radiusKm: number): GreenPLot[] {
  return lots.filter((lot) => haversineKm(lot.lat, lot.lng, destLat, destLng) <= radiusKm)
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
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
