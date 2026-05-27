export interface SpotMeSettings {
  id: string
  user_id: string
  google_email: string | null
  max_walk_minutes: number
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface CalendarEvent {
  id: string
  summary: string
  location: string
  start_time: string
  end_time: string
  duration_hours: number
  dest_lat?: number
  dest_lng?: number
}

export interface ParkingLot {
  name: string
  address: string
  lat: number
  lng: number
  hourly_rate: number | null
  daily_max: number | null
  source: 'green_p' | 'google_places'
  place_id?: string
  walk_seconds?: number
}

export interface ParkingRecommendation {
  type: 'price' | 'proximity' | 'best'
  label: string
  name: string
  address: string
  walk_minutes: number
  hourly_rate: number | null
  total_cost: number | null
  daily_max: number | null
  source: 'green_p' | 'google_places'
  lat: number
  lng: number
}

export interface RecommendationsResponse {
  price: ParkingRecommendation | null
  proximity: ParkingRecommendation | null
  best: ParkingRecommendation | null
  destination: { lat: number; lng: number }
  event_duration_hours: number
}

export interface CalendarEventsResponse {
  events: CalendarEvent[]
  error?: string
}

export interface SettingsResponse {
  connected: boolean
  google_email: string | null
  max_walk_minutes: number
  onboarding_completed: boolean
}

export interface UpdateSettingsRequest {
  max_walk_minutes?: number
  onboarding_completed?: boolean
}
