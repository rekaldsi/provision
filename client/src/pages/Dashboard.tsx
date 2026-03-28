import { useEffect, useState } from 'react'
import { TrendingDown, Zap, Gift, ShoppingCart, ArrowRight, Bell, Pill, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getStats, getDeals, matchDeals, type Stats, type DealMatch } from '@/lib/api'
import { DashboardCard } from '@/components/DashboardCard'
import { DealCard } from '@/components/DealCard'
import { Button } from '@/components/ui/button'

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [matches, setMatches] = useState<DealMatch[]>([])
  const [alerts, setAlerts] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getStats(),
      matchDeals(),
      fetch('/api/alerts').then(r => r.json()).catch(() => ({ alerts: [] })),
    ])
      .then(([s, m, a]) => {
        setStats(s)
        setMatches(m.matches)
        setAlerts(a.alerts?.length || 0)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const nearFreeMatches = matches.filter(
    (m) => m.best_deal?.sale_price != null && m.best_deal.sale_price < 0.25
  )
  const topDealsCount = matches.filter((m) => (m.best_deal?.discount_pct || 0) >= 30).length

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-provision-text tracking-tight">PROVISION</h1>
          <p className="text-sm text-provision-dim mt-0.5">Stack deep. Buy smart. Give back.</p>
        </div>
        {alerts > 0 && (
          <Link to="/alerts">
            <div className="relative p-2">
              <Bell size={20} className="text-provision-savings" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">{alerts}</span>
            </div>
          </Link>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <DashboardCard
          label="Active Deals"
          value={loading ? '—' : String(stats?.active_deals ?? 0)}
          icon={TrendingDown}
          sublabel="across all stores"
        />
        <DashboardCard
          label="On My List"
          value={loading ? '—' : String(stats?.list_items ?? 0)}
          icon={ShoppingCart}
          sublabel="items tracked"
        />
        <DashboardCard
          label="Near Free"
          value={loading ? '—' : String(nearFreeMatches.length > 0 ? nearFreeMatches.length : (stats?.near_free_deals ?? 0))}
          icon={Zap}
          variant="near-free"
          sublabel="< $0.25 final"
        />
        <DashboardCard
          label="Hot Alerts"
          value={loading ? '—' : String(alerts > 0 ? alerts : (stats?.hot_deals ?? 0))}
          icon={Bell}
          variant="savings"
          sublabel="≥40% off"
        />
      </div>

      {/* Matched deals (items on My List with current deals) */}
      {matches.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-provision-text uppercase tracking-wider">
              Your List — Active Deals
            </h2>
            <Link to="/list">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                View list <ArrowRight size={12} />
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {matches.slice(0, 5).map((match) => (
              <DealCard key={match.item.id} deal={match.best_deal} />
            ))}
          </div>
          {matches.length > 5 && (
            <Link to="/deals">
              <Button variant="ghost" size="sm" className="w-full mt-2 text-xs text-provision-dim">
                +{matches.length - 5} more deals
              </Button>
            </Link>
          )}
        </section>
      )}

      {/* Near free alerts */}
      {nearFreeMatches.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} className="text-yellow-400" />
            <h2 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider">
              Near Free Alerts
            </h2>
          </div>
          <div className="space-y-2">
            {nearFreeMatches.map((match) => (
              <DealCard key={match.item.id} deal={match.best_deal} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!loading && matches.length === 0 && (
        <div className="text-center py-12 border border-provision-border rounded-lg">
          <ShoppingCart size={32} className="mx-auto mb-3 text-provision-muted" />
          <p className="text-sm text-provision-dim mb-3">Add items to your list to see matched deals</p>
          <Link to="/list">
            <Button size="sm">Go to My List</Button>
          </Link>
        </div>
      )}

      {/* Quick nav */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/alerts">
          <div className="rounded-lg border border-provision-border bg-provision-surface p-4 hover:border-provision-savings/40 transition-colors">
            <p className="text-xs text-provision-dim mb-1">🔥 Hot</p>
            <p className="text-sm font-medium text-provision-text">Near Free · Free · Profit</p>
          </div>
        </Link>
        <Link to="/pharmacy">
          <div className="rounded-lg border border-provision-border bg-provision-surface p-4 hover:border-provision-savings/40 transition-colors">
            <p className="text-xs text-provision-dim mb-1">💊 Rx</p>
            <p className="text-sm font-medium text-provision-text">Compare Rx Prices</p>
          </div>
        </Link>
        <Link to="/deals">
          <div className="rounded-lg border border-provision-border bg-provision-surface p-4 hover:border-white/10 transition-colors">
            <p className="text-xs text-provision-dim mb-1">Browse</p>
            <p className="text-sm font-medium text-provision-text">All Deals</p>
          </div>
        </Link>
        <Link to="/shopping-plan">
          <div className="rounded-lg border border-provision-border bg-provision-surface p-4 hover:border-white/10 transition-colors">
            <p className="text-xs text-provision-dim mb-1">This Week's</p>
            <p className="text-sm font-medium text-provision-text">Shopping Plan</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
