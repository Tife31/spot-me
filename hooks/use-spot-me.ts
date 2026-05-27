import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { SettingsResponse, CalendarEventsResponse, RecommendationsResponse, UpdateSettingsRequest } from '../types'

const SETTINGS_KEY = ['spot-me-settings']
const EVENTS_KEY = ['spot-me-events']

export function useSpotMeSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: async (): Promise<SettingsResponse> => {
      const res = await fetch('/api/modules/spot-me/settings')
      if (!res.ok) throw new Error('Failed to fetch settings')
      return res.json()
    },
  })
}

export function useUpdateSpotMeSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: UpdateSettingsRequest): Promise<void> => {
      const res = await fetch('/api/modules/spot-me/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to save settings')
      }
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: SETTINGS_KEY })
      const previous = queryClient.getQueryData<SettingsResponse>(SETTINGS_KEY)
      queryClient.setQueryData<SettingsResponse>(SETTINGS_KEY, (old) =>
        old ? { ...old, ...newData } : old
      )
      return { previous }
    },
    onError: (_err, _data, context) => {
      if (context?.previous) queryClient.setQueryData(SETTINGS_KEY, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_KEY })
    },
  })
}

export function useDisconnectCalendar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const res = await fetch('/api/modules/spot-me/settings', { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to disconnect')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_KEY })
      queryClient.invalidateQueries({ queryKey: EVENTS_KEY })
    },
  })
}

export function useCalendarEvents() {
  return useQuery({
    queryKey: EVENTS_KEY,
    queryFn: async (): Promise<CalendarEventsResponse> => {
      const res = await fetch('/api/modules/spot-me/calendar')
      if (!res.ok) throw new Error('Failed to fetch calendar events')
      return res.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useParkingRecommendations(location: string | null, durationHours: number | null) {
  return useQuery({
    queryKey: ['spot-me-recommendations', location, durationHours],
    queryFn: async (): Promise<RecommendationsResponse> => {
      const params = new URLSearchParams({
        location: location!,
        duration_hours: String(durationHours!),
      })
      const res = await fetch(`/api/modules/spot-me/recommendations?${params}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to fetch recommendations')
      }
      return res.json()
    },
    enabled: !!location && !!durationHours,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}
