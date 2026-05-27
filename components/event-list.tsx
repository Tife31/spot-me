'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, Clock, Loader2, AlertCircle, ParkingCircle, CalendarDays } from 'lucide-react'
import { ParkingModal } from './parking-modal'
import { useCalendarEvents } from '../hooks/use-spot-me'
import type { CalendarEvent } from '../types'

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-CA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function isToday(iso: string): boolean {
  const today = new Date()
  const d = new Date(iso)
  return d.toDateString() === today.toDateString()
}

function isTomorrow(iso: string): boolean {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const d = new Date(iso)
  return d.toDateString() === tomorrow.toDateString()
}

function dayLabel(iso: string): string {
  if (isToday(iso)) return 'Today'
  if (isTomorrow(iso)) return 'Tomorrow'
  return ''
}

export function EventList() {
  const { data, isLoading, error } = useCalendarEvents()
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading calendar events…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <AlertCircle className="w-8 h-8 text-destructive" />
        <p className="text-sm font-medium">Could not load calendar events</p>
        <p className="text-xs text-muted-foreground">{error.message}</p>
      </div>
    )
  }

  if (data?.error === 'calendar_not_connected') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <CalendarDays className="w-12 h-12 text-muted-foreground opacity-40" />
        <div>
          <p className="font-medium">Calendar not connected</p>
          <p className="text-sm text-muted-foreground mt-1">Connect your calendar in Settings to see upcoming events.</p>
        </div>
        <Button variant="outline" onClick={() => window.location.href = '/spot-me/settings'}>
          Go to Settings
        </Button>
      </div>
    )
  }

  const events = data?.events ?? []

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <CalendarDays className="w-12 h-12 text-muted-foreground opacity-40" />
        <div>
          <p className="font-medium">No Toronto events in the next 7 days</p>
          <p className="text-sm text-muted-foreground mt-1">Events with a Toronto location will appear here.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {events.map((event) => {
          const day = dayLabel(event.start_time)
          return (
            <Card key={event.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate">{event.summary}</p>
                      {day && (
                        <Badge variant="secondary" className="text-xs shrink-0">{day}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                      <p className="text-sm text-muted-foreground">{formatDateTime(event.start_time)}</p>
                      <span className="text-muted-foreground">·</span>
                      <p className="text-sm text-muted-foreground">{event.duration_hours.toFixed(1)}h</p>
                    </div>
                    <div className="flex items-start gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                      <p className="text-sm text-muted-foreground line-clamp-1">{event.location}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <ParkingCircle className="w-3.5 h-3.5 mr-1.5" />
                    Find Parking
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <ParkingModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </>
  )
}
