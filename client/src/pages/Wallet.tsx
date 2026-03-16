import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Wallet as WalletIcon } from 'lucide-react'
import { getShoppingPlan, type ShoppingPlanTrip } from '@/lib/api'

export function Wallet() {
  const [trips, setTrips] = useState<ShoppingPlanTrip[]>([])
  const [totalSavings, setTotalSavings] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getShoppingPlan()
      .then(plan => {
        setTrips(plan.plan)
        setTotalSavings(plan.total_savings)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const couponCount = trips.reduce(
    (sum, t) => sum + t.items.filter(i => (i.savings_total ?? 0) > 0).length,
    0
  )

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-6 w-40 bg-provision-surface rounded animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-provision-surface rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  const tripsWithDeals = trips.filter(t => t.items.some(i => (i.savings_total ?? 0) > 0))

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/shopping-plan" className="text-provision-dim hover:text-provision-text">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-provision-text">Coupon Wallet</h1>
          <p className="text-xs text-provision-dim">
            {couponCount} coupon{couponCount !== 1 ? 's' : ''} · Save ${totalSavings.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Start Checkout CTA */}
      {tripsWithDeals.length > 0 && (
        <Link to="/checkout">
          <button className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl text-sm transition-colors">
            Start Checkout →
          </button>
        </Link>
      )}

      {tripsWithDeals.length === 0 ? (
        <div className="text-center py-16 border border-provision-border rounded-lg">
          <WalletIcon size={32} className="mx-auto mb-3 text-provision-muted" />
          <p className="text-sm text-provision-dim">No coupons yet</p>
          <p className="text-xs text-provision-muted mt-1">Add items to your list to find deals</p>
          <Link to="/list" className="inline-block mt-4 text-xs text-emerald-400">
            Go to My List →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {tripsWithDeals.map(trip => {
            const couponItems = trip.items.filter(i => (i.savings_total ?? 0) > 0)
            return (
              <div key={trip.store_id} className="border border-provision-border rounded-xl overflow-hidden">
                {/* Store header */}
                <div className="bg-provision-surface px-4 py-3 border-b border-provision-border flex items-center justify-between">
                  <p className="text-sm font-semibold text-provision-text">{trip.store_name}</p>
                  <p className="text-xs text-emerald-400 font-medium">
                    Save ${trip.trip_savings.toFixed(2)}
                  </p>
                </div>

                {/* Coupon items */}
                <div className="divide-y divide-provision-border/40">
                  {couponItems.map((item, i) => (
                    <div key={item.item_id || i} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {item.item_brand && (
                          <p className="text-xs text-provision-dim">{item.item_brand}</p>
                        )}
                        <p className="text-sm text-provision-text truncate">{item.item_name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-emerald-400">
                          Save ${(item.savings_total ?? 0).toFixed(2)}
                        </p>
                        {item.is_free && (
                          <span className="text-xs font-semibold text-green-400">FREE</span>
                        )}
                        {item.is_profit && (
                          <span className="text-xs font-semibold text-amber-300">PROFIT</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
