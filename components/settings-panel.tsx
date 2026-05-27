'use client'

import { Button } from '@/components/ui/button'
import { Loader2, ParkingCircle, CheckCircle2, ExternalLink } from 'lucide-react'
import { useSpotMeSettings } from '../hooks/use-spot-me'

export function SpotMeSettingsPanel() {
  const { data: settings, isLoading } = useSpotMeSettings()

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">SpotMe</h3>
        <p className="text-sm text-muted-foreground">
          Find parking near your Toronto calendar events
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm">
        {settings?.connected ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span>Calendar connected{settings.google_email ? ` as ${settings.google_email}` : ''}</span>
          </>
        ) : (
          <>
            <ParkingCircle className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Calendar not connected</span>
          </>
        )}
      </div>

      <Button variant="outline" size="sm" onClick={() => window.location.href = '/spot-me/settings'}>
        <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
        Open SpotMe Settings
      </Button>
    </div>
  )
}

export default SpotMeSettingsPanel
