import type { ParkingLot, ParkingRecommendation } from '../types'

export interface LotWithWalk extends ParkingLot {
  walk_seconds: number
}

function totalCost(lot: LotWithWalk, durationHours: number): number | null {
  if (lot.hourly_rate === null) return null
  const raw = lot.hourly_rate * durationHours
  if (lot.daily_max !== null) return Math.min(raw, lot.daily_max)
  return raw
}

function toRecommendation(lot: LotWithWalk, type: ParkingRecommendation['type'], label: string, durationHours: number): ParkingRecommendation {
  return {
    type,
    label,
    name: lot.name,
    address: lot.address,
    walk_minutes: Math.round(lot.walk_seconds / 60),
    hourly_rate: lot.hourly_rate,
    total_cost: totalCost(lot, durationHours),
    daily_max: lot.daily_max,
    source: lot.source,
    lat: lot.lat,
    lng: lot.lng,
  }
}

export function computeRecommendations(
  lots: LotWithWalk[],
  durationHours: number,
  maxWalkMinutes: number
): { price: ParkingRecommendation | null; proximity: ParkingRecommendation | null; best: ParkingRecommendation | null } {
  const maxWalkSeconds = maxWalkMinutes * 60
  const eligible = lots.filter((l) => l.walk_seconds <= maxWalkSeconds)

  if (eligible.length === 0) {
    return { price: null, proximity: null, best: null }
  }

  // Compute costs for scoring
  const costs = eligible.map((l) => totalCost(l, durationHours))
  const knownCosts = costs.filter((c): c is number => c !== null)
  const minCost = knownCosts.length ? Math.min(...knownCosts) : 0
  const maxCost = knownCosts.length ? Math.max(...knownCosts) : 0
  const costRange = maxCost - minCost || 1

  const walks = eligible.map((l) => l.walk_seconds)
  const minWalk = Math.min(...walks)
  const maxWalk = Math.max(...walks)
  const walkRange = maxWalk - minWalk || 1

  // Option 1: cheapest lot with a known price
  const withPrice = eligible.filter((_, i) => costs[i] !== null)
  const priceWinner = withPrice.length
    ? withPrice.reduce((a, b) => (totalCost(a, durationHours)! <= totalCost(b, durationHours)! ? a : b))
    : eligible[0]

  // Option 2: closest lot
  const proximityWinner = eligible.reduce((a, b) => (a.walk_seconds <= b.walk_seconds ? a : b))

  // Option 3: composite score
  const scored = eligible.map((lot, i) => {
    const cost = costs[i]
    const priceScore = cost !== null ? 1 - (cost - minCost) / costRange : 0.3
    const walkScore = 1 - (lot.walk_seconds - minWalk) / walkRange
    const reliabilityBonus = lot.source === 'green_p' ? 0.1 : 0
    const composite = 0.5 * priceScore + 0.4 * walkScore + reliabilityBonus
    return { lot, composite }
  })
  scored.sort((a, b) => b.composite - a.composite)

  let bestWinner = scored[0].lot
  // Deduplicate: if best == price, pick next best
  if (bestWinner === priceWinner && scored.length > 1) {
    bestWinner = scored[1].lot
  }
  // If best still == proximity, pick next distinct
  if (bestWinner === proximityWinner && scored.length > 2) {
    const next = scored.find((s) => s.lot !== priceWinner && s.lot !== proximityWinner)
    if (next) bestWinner = next.lot
  }

  return {
    price: toRecommendation(priceWinner, 'price', 'Best Price', durationHours),
    proximity: toRecommendation(proximityWinner, 'proximity', 'Closest', durationHours),
    best: toRecommendation(bestWinner, 'best', 'Best Overall', durationHours),
  }
}
