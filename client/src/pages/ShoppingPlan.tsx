import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, TrendingDown, Zap, Gift, ShoppingCart } from 'lucide-react'
import { getShoppingPlan, type ShoppingPlanResponse } from '@/lib/api'
import { ShoppingPlanList } from '@/components/ShoppingPlanList'
import { formatSavings } from '@/lib/utils'
import { DashboardCard } from '@/components/DashboardCard'

export function ShoppingPlan() {
  const [plan, setPlan] = useState<ShoppingPlanResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getShoppingPlan()
      .then(setPlan)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-lg font-bold text-provision-text">Shopping Plan</h1>
        <p className="text-xs text-provision-dim">This week's optimized run</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-32 rounded-lg bg-provision-surface animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      ) : plan ? (
        <>
          {/* Summary stats */}
          {plan.plan.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <DashboardCard
                label="Total Savings"
                value={formatSavings(plan.total_savings)}
                icon={TrendingDown}
                variant="savings"
              />
              <DashboardCard
                label="Store Stops"
                value={String(plan.plan.length)}
                icon={CalendarCheck}
              />
              {plan.near_free_count > 0 && (
                <DashboardCard
                  label="Near Free"
                  value={String(plan.near_free_count)}
                  icon={Zap}
                  variant="near-free"
                />
              )}
              {plan.free_count > 0 && (
                <DashboardCard
                  label="FREE Items"
                  value={String(plan.free_count)}
                  icon={Gift}
                  variant="free"
                />
              )}
            </div>
          )}

          <ShoppingPlanList trips={plan.plan} />

          {/* Unmatched items */}
          {plan.unmatched_items.length > 0 && (
            <div className="border border-provision-border rounded-lg p-4">
              <h3 className="text-xs font-semibold text-provision-dim uppercase tracking-wider mb-3">
                No Current Deals Found
              </h3>
              <div className="space-y-1">
                {plan.unmatched_items.map((item) => (
                  <div key={item.item_id} className="flex items-center gap-2 py-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-provision-muted shrink-0" />
                    <span className="text-sm text-provision-dim">{item.item_name}</span>
                    {item.item_brand && (
                      <span className="text-xs text-provision-muted">— {item.item_brand}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Check Out CTA */}
          {plan.plan.length > 0 && (
            <Link to="/checkout">
              <button className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl text-base transition-colors">
                <ShoppingCart size={18} />
                Check Out
              </button>
            </Link>
          )}
        </>
      ) : null}
    </div>
  )
}
