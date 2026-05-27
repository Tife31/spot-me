'use client'

import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Loader2, AlertCircle, ParkingCircle } from 'lucide-react'
import { RecommendationCard } from './recommendation-card'
import { useParkingRecommendations } from '../hooks/use-spot-me'
import type { CalendarEvent } from '../types'

interface Props {
  event: CalendarEvent | null
  onClose: () => void
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-CA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function ParkingModal({ event, onClose }: Props) {
  const { data, isLoading, error } = useParkingRecommendations(
    event?.location ?? null,
    event?.duration_hours ?? null
  )

  const hasAny = data && (data.price || data.proximity || data.best)

  return (
    <Sheet open={!!event} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <ParkingCircle className="w-5 h-5" />
            Parking Recommendations
          </SheetTitle>
          {event && (
            <SheetDescription className="text-left">
              <span className="font-medium text-foreground">{event.summary}</span>
              <br />
              <span className="text-xs">{formatDateTime(event.start_time)} · {event.location}</span>
              <br />
              <span className="text-xs text-muted-foreground">
                Estimated parking: {event.duration_hours.toFixed(1)}h
              </span>
            </SheetDescription>
          )}
        </SheetHeader>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Finding parking near {event?.location}…</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
            <p className="text-sm font-medium">Could not fetch recommendations</p>
            <p className="text-xs text-muted-foreground">{error.message}</p>
          </div>
        )}

        {!isLoading && !error && !hasAny && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <ParkingCircle className="w-8 h-8 text-muted-foreground opacity-40" />
            <p className="text-sm font-medium">No parking found nearby</p>
            <p className="text-xs text-muted-foreground">
              No lots were found within your {data?.event_duration_hours ? '' : '25-minute'} walk limit.
              Try adjusting your max walk time in Settings.
            </p>
          </div>
        )}

        {!isLoading && !error && hasAny && (
          <div className="space-y-4">
            {data.price && <RecommendationCard rec={data.price} durationHours={data.event_duration_hours} />}
            {data.proximity && <RecommendationCard rec={data.proximity} durationHours={data.event_duration_hours} />}
            {data.best && <RecommendationCard rec={data.best} durationHours={data.event_duration_hours} />}
            <p className="text-xs text-muted-foreground text-center pt-2">
              Green P pricing from City of Toronto open data. Private lot pricing not available via Google Places.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
