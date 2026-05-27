'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Clock, DollarSign, Star, TrendingDown, Navigation } from 'lucide-react'
import type { ParkingRecommendation } from '../types'

interface Props {
  rec: ParkingRecommendation
  durationHours: number
}

const BADGE_CONFIG = {
  price: { label: 'Best Price', icon: TrendingDown, className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  proximity: { label: 'Closest', icon: Navigation, className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  best: { label: 'Best Overall', icon: Star, className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
}

function formatCost(cost: number | null): string {
  if (cost === null) return 'Price not listed'
  return `$${cost.toFixed(2)}`
}

function formatRate(rate: number | null): string {
  if (rate === null) return '—'
  return `$${rate.toFixed(2)}/hr`
}

export function RecommendationCard({ rec }: Props) {
  const config = BADGE_CONFIG[rec.type]
  const BadgeIcon = config.icon

  return (
    <Card className="w-full">
      <CardContent className="pt-4 space-y-3">
        {/* Type badge */}
        <div className="flex items-center justify-between">
          <Badge className={config.className}>
            <BadgeIcon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
          {rec.source === 'green_p' && (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Green P</span>
          )}
        </div>

        {/* Lot name */}
        <div>
          <p className="font-semibold text-base">{rec.name}</p>
          <div className="flex items-start gap-1 mt-1">
            <MapPin className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">{rec.address || 'Address not available'}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium">{rec.walk_minutes} min walk</p>
              <p className="text-xs text-muted-foreground">to destination</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium">{formatCost(rec.total_cost)}</p>
              <p className="text-xs text-muted-foreground">{rec.hourly_rate !== null ? formatRate(rec.hourly_rate) : 'est. total'}</p>
            </div>
          </div>
        </div>

        {rec.daily_max !== null && (
          <p className="text-xs text-muted-foreground">
            Daily max: ${rec.daily_max.toFixed(2)}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
