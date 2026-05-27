'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ParkingCircle, Loader2, CalendarDays } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import type { CalendarEventsResponse } from '../types'

export default function SpotMeStatCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['spot-me-dashboard-events'],
    queryFn: async (): Promise<CalendarEventsResponse> => {
      const res = await fetch('/api/modules/spot-me/calendar')
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
  })

  const events = data?.events ?? []
  const next = events[0] ?? null

  function formatShort(iso: string): string {
    return new Date(iso).toLocaleString('en-CA', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    })
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">SpotMe</CardTitle>
        <ParkingCircle className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : data?.error === 'calendar_not_connected' ? (
          <>
            <div className="text-sm text-muted-foreground">Calendar not connected</div>
            <p className="text-xs text-muted-foreground mt-1">Connect in SpotMe settings</p>
          </>
        ) : next ? (
          <>
            <div className="text-sm font-medium line-clamp-1">{next.summary}</div>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {formatShort(next.start_time)}
            </p>
          </>
        ) : (
          <>
            <div className="text-sm text-muted-foreground">No Toronto events</div>
            <p className="text-xs text-muted-foreground mt-0.5">Next 7 days are clear</p>
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 text-xs"
          onClick={() => (window.location.href = '/spot-me')}
        >
          Open SpotMe
        </Button>
      </CardContent>
    </Card>
  )
}
