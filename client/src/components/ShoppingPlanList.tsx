import { MapPin, ShoppingCart } from 'lucide-react'
import { cn, formatPrice } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StoreBadge } from '@/components/StoreBadge'
import { StackBreakdown } from '@/components/StackBreakdown'
import type { ShoppingPlanTrip } from '@/lib/api'

interface ShoppingPlanListProps {
  trips: ShoppingPlanTrip[]
  className?: string
}

export function ShoppingPlanList({ trips, className }: ShoppingPlanListProps) {
  if (trips.length === 0) {
    return (
      <div className="text-center py-12 text-provision-dim">
        <ShoppingCart size={32} className="mx-auto mb-3 opacity-30" />
        <p>No trips planned. Add items to your list and PROVISION will find the best deals.</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {trips.map((trip, i) => (
        <TripCard key={trip.store_id} trip={trip} tripNumber={i + 1} />
      ))}
    </div>
  )
}

function TripCard({ trip, tripNumber }: { trip: ShoppingPlanTrip; tripNumber: number }) {
  const freeCount = trip.items.filter((i) => i.is_free).length
  const nearFreeCount = trip.items.filter((i) => i.is_near_free).length
  const profitCount = trip.items.filter((i) => i.is_profit).length

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-provision-dim font-medium">STOP {tripNumber}</span>
              <StoreBadge name={trip.store_name} size="md" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {profitCount > 0 && <Badge variant="profit">{profitCount} PROFIT</Badge>}
              {freeCount > 0 && <Badge variant="free">{freeCount} FREE</Badge>}
              {nearFreeCount > 0 && <Badge variant="near-free">{nearFreeCount} NEAR FREE</Badge>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-emerald-400">
              Save {formatPrice(trip.trip_savings)}
            </p>
            <p className="text-xs text-provision-dim">
              Total: {formatPrice(trip.trip_total)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-0 divide-y divide-provision-border/50">
          {trip.items.map((item, i) => (
            <TripItem key={item.item_id || i} item={item} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function TripItem({ item }: { item: ShoppingPlanTrip['items'][number] }) {
  const [expanded, setExpanded] = useState(false)

  const finalColor = item.is_profit
    ? 'text-amber-300'
    : item.is_free
    ? 'text-green-400'
    : item.is_near_free
    ? 'text-yellow-400'
    : 'text-emerald-400'

  return (
    <div className="py-2">
      <button
        className="w-full text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm text-provision-text">{item.item_name}</span>
              {item.is_profit && <span className="text-xs font-bold text-amber-300 bg-amber-400/10 px-1 rounded">PROFIT</span>}
              {item.is_free && <span className="text-xs font-bold text-green-400 bg-green-400/10 px-1 rounded">FREE</span>}
              {item.is_near_free && <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 px-1 rounded">NEAR FREE</span>}
            </div>
            {item.item_brand && (
              <span className="text-xs text-provision-dim">{item.item_brand}</span>
            )}
          </div>
          <div className="text-right">
            <p className={cn('text-sm font-bold', finalColor)}>
              {item.final_price == null ? '—' :
               item.is_profit ? `+$${Math.abs(item.final_price).toFixed(2)}` :
               item.final_price === 0 ? 'FREE' :
               `$${item.final_price.toFixed(2)}`}
            </p>
            {item.savings_total != null && item.savings_total > 0 && (
              <p className="text-xs text-provision-dim">save {formatPrice(item.savings_total)}</p>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="mt-2 ml-3 pl-3 border-l border-provision-border/50 space-y-1.5">
          {/* Stack summary */}
          {(item as any).stack_summary && (
            <p className="text-xs text-provision-dim font-mono">{(item as any).stack_summary}</p>
          )}
          {/* Coupon note */}
          {(item as any).coupon_needed && (
            <p className="text-xs text-yellow-400">✂️ {(item as any).coupon_needed}</p>
          )}
          {/* Rebate note */}
          {(item as any).rebate_note && (
            <p className="text-xs text-provision-savings">💰 {(item as any).rebate_note}</p>
          )}
          {/* Target Circle */}
          {(item as any).target_circle_url && (
            <a
              href={(item as any).target_circle_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
            >
              🎯 Clip Target Circle offer
            </a>
          )}
          {item.stack_breakdown && item.stack_breakdown.length > 0 && (
            <StackBreakdown
              breakdown={item.stack_breakdown}
              finalPrice={item.final_price}
              isFree={item.is_free}
              isProfit={item.is_profit}
              isNearFree={item.is_near_free}
            />
          )}
        </div>
      )}
    </div>
  )
}

// useState import needed for TripItem
import { useState } from 'react'
