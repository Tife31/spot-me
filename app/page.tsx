'use client'

import { useEffect, useState } from 'react'
import { useModuleEnabled } from '@/lib/modules/module-hooks'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, ParkingCircle } from 'lucide-react'
import { EventList } from '../components/event-list'
import { useSpotMeSettings, useUpdateSpotMeSettings } from '../hooks/use-spot-me'

export default function SpotMePage() {
  const { enabled: quotesEnabled, loading: quotesLoading } = useModuleEnabled('quotes')
  const [randomQuote, setRandomQuote] = useState<{ quote: string; author?: string } | null>(null)

  const { data: settings, isLoading: settingsLoading } = useSpotMeSettings()
  const updateSettings = useUpdateSpotMeSettings()

  useEffect(() => {
    if (!quotesEnabled || quotesLoading) return
    let cancelled = false
    fetch('/api/modules/quotes/quotes')
      .then((res) => (res.ok ? res.json() : []))
      .then((quotes) => {
        if (!cancelled && quotes.length > 0) {
          setRandomQuote(quotes[Math.floor(Math.random() * quotes.length)])
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [quotesEnabled, quotesLoading])

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Onboarding: first visit
  if (!settings?.onboarding_completed) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <ParkingCircle className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome to SpotMe</CardTitle>
            <CardDescription>
              SpotMe finds the best parking near your Toronto calendar destinations — optimized for price, proximity, or the best overall value.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>Connects to your calendar to read upcoming Toronto events</li>
              <li>Searches Green P and nearby parking lots</li>
              <li>Recommends 3 options: cheapest, closest, and best overall</li>
              <li>Estimates parking cost based on your event duration</li>
            </ul>
            <Button
              className="w-full"
              onClick={() =>
                updateSettings.mutate({ onboarding_completed: true }, {
                  onError: () => {},
                })
              }
              disabled={updateSettings.isPending}
            >
              {updateSettings.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Getting started…</>
              ) : (
                'Get Started'
              )}
            </Button>
            <Button
              variant="ghost"
              className="w-full text-sm"
              onClick={() => window.location.href = '/spot-me/settings'}
            >
              Go to Settings first
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-medium">SpotMe</h1>
        {quotesEnabled && randomQuote && (
          <p className="text-sm text-[#aa2020] mt-1">{randomQuote.quote}</p>
        )}
        <p className="text-sm text-muted-foreground mt-1">
          Upcoming Toronto events — click <strong>Find Parking</strong> on any event to get recommendations.
        </p>
      </div>

      <EventList />
    </div>
  )
}
