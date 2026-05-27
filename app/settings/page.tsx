'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Loader2, CheckCircle2, AlertCircle, ParkingCircle,
  CalendarDays, Unlink, ExternalLink, Save,
} from 'lucide-react'
import { useSpotMeSettings, useUpdateSpotMeSettings, useDisconnectCalendar } from '../../hooks/use-spot-me'

export default function SpotMeSettingsPage() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const { data: settings, isLoading } = useSpotMeSettings()
  const updateSettings = useUpdateSpotMeSettings()
  const disconnect = useDisconnectCalendar()

  const [maxWalk, setMaxWalk] = useState(25)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings?.max_walk_minutes !== undefined) {
      setMaxWalk(settings.max_walk_minutes)
    }
  }, [settings?.max_walk_minutes])

  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')
    if (connected === 'true') {
      toast({ title: 'Calendar connected', description: 'SpotMe can now read your calendar events.' })
    } else if (error) {
      const messages: Record<string, string> = {
        unauthorized: 'Please sign in and try again.',
        invalid_state: 'Authorization expired. Please try again.',
        token_exchange_failed: 'Could not complete authorization. Please try again.',
        server_error: 'An unexpected error occurred. Please try again.',
      }
      toast({
        variant: 'destructive',
        title: 'Calendar connection failed',
        description: messages[error] || error,
      })
    }
  }, [])

  const handleSaveWalkTime = () => {
    setSaved(false)
    updateSettings.mutate({ max_walk_minutes: maxWalk }, {
      onSuccess: () => {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      },
      onError: (err) => {
        toast({ variant: 'destructive', title: 'Failed to save', description: err.message })
      },
    })
  }

  const handleDisconnect = () => {
    disconnect.mutate(undefined, {
      onSuccess: () => toast({ title: 'Calendar disconnected' }),
      onError: (err) => toast({ variant: 'destructive', title: 'Failed to disconnect', description: err.message }),
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-medium">SpotMe Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your calendar connection and parking preferences</p>
      </div>

      {/* Calendar connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Calendar Connection
          </CardTitle>
          <CardDescription>
            SpotMe reads your upcoming events to find parking near Toronto destinations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings?.connected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Connected</p>
                  {settings.google_email && (
                    <p className="text-xs text-muted-foreground">{settings.google_email}</p>
                  )}
                </div>
                <Badge variant="secondary" className="ml-auto">Active</Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnect.isPending}
                className="text-destructive hover:text-destructive"
              >
                {disconnect.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Unlink className="w-4 h-4 mr-2" />
                )}
                Disconnect Calendar
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="w-4 h-4" />
                No calendar connected
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Before connecting, ensure you have added the following to <code>.env.local</code>:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li><code>GOOGLE_CLIENT_ID</code></li>
                  <li><code>GOOGLE_CLIENT_SECRET</code></li>
                  <li><code>GOOGLE_MAPS_API_KEY</code></li>
                </ul>
                <p>
                  Add <code>{typeof window !== 'undefined' ? window.location.origin : ''}/api/modules/spot-me/oauth/callback</code> as an authorized redirect URI in your Google Cloud project.
                </p>
              </div>
              <Button
                onClick={() => { window.location.href = '/api/modules/spot-me/oauth/start' }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Connect Calendar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Walk time preference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ParkingCircle className="w-5 h-5" />
            Walk Time Preference
          </CardTitle>
          <CardDescription>
            Maximum distance you're willing to walk from parking to your destination.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Maximum walk time</Label>
              <span className="text-sm font-medium">{maxWalk} min</span>
            </div>
            <Slider
              min={5}
              max={30}
              step={5}
              value={[maxWalk]}
              onValueChange={([v]) => setMaxWalk(v)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5 min (very close)</span>
              <span>30 min (far)</span>
            </div>
          </div>
          <Button onClick={handleSaveWalkTime} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</>
            ) : saved ? (
              <><CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />Saved!</>
            ) : (
              <><Save className="w-4 h-4 mr-2" />Save Preference</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
