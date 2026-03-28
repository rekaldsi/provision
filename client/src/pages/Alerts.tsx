import { useState, useEffect } from 'react'
import { Bell, Zap, RefreshCw, Tag, CheckCircle2, Star } from 'lucide-react'

const API = '/api'

interface Deal {
  id: string
  item_name: string
  item_brand?: string
  sale_price: number
  original_price?: number
  discount_pct?: number
  valid_until?: string
  category?: string
  stores?: { name: string; chain: string }
  target_circle_url?: string
}

interface Tier {
  label: string
  color: string
  bgColor: string
  emoji: string
}

interface Alert {
  type: string
  tier: Tier
  deal: Deal
  item_matched: { id: string; name: string } | null
  on_my_list: boolean
  message: string
  priority: number
}

const TIER_STYLES: Record<string, { ring: string; bg: string; text: string }> = {
  'PROFIT': { ring: 'border-yellow-500', bg: 'bg-yellow-900/20', text: 'text-yellow-400' },
  'FREE': { ring: 'border-green-400', bg: 'bg-green-900/20', text: 'text-green-400' },
  'NEAR FREE': { ring: 'border-yellow-400', bg: 'bg-yellow-900/20', text: 'text-yellow-300' },
  'HOT DEAL': { ring: 'border-red-500', bg: 'bg-red-900/20', text: 'text-red-400' },
  'GOOD DEAL': { ring: 'border-green-600', bg: 'bg-green-900/10', text: 'text-green-500' },
}

function AlertCard({ alert }: { alert: Alert }) {
  const style = TIER_STYLES[alert.tier.label] || TIER_STYLES['GOOD DEAL']
  const discountPct = alert.deal.discount_pct
    ? Math.round(alert.deal.discount_pct)
    : alert.deal.original_price
      ? Math.round((1 - alert.deal.sale_price / alert.deal.original_price) * 100)
      : null

  return (
    <div className={`rounded-xl border ${style.ring} ${style.bg} p-4 space-y-2 relative overflow-hidden`}>
      {/* Priority badge */}
      <div className={`absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${style.text} bg-black/30`}>
        <span>{alert.tier.emoji}</span>
        <span>{alert.tier.label}</span>
      </div>

      {/* On My List indicator */}
      {alert.on_my_list && (
        <div className="flex items-center gap-1 text-xs text-provision-savings mb-1">
          <Star size={10} fill="currentColor" />
          <span>On Your List</span>
        </div>
      )}

      {/* Item */}
      <div className="pr-24">
        <p className="font-semibold text-provision-text leading-tight">{alert.deal.item_name}</p>
        {alert.deal.item_brand && (
          <p className="text-xs text-provision-dim">{alert.deal.item_brand}</p>
        )}
      </div>

      {/* Pricing */}
      <div className="flex items-center gap-3">
        <span className={`text-2xl font-bold ${style.text}`}>
          {alert.deal.sale_price <= 0 ? 'FREE' : `$${alert.deal.sale_price.toFixed(2)}`}
        </span>
        {alert.deal.original_price && alert.deal.original_price !== alert.deal.sale_price && (
          <span className="text-provision-dim line-through text-sm">${alert.deal.original_price.toFixed(2)}</span>
        )}
        {discountPct && discountPct > 0 && (
          <span className={`text-sm font-semibold ${style.text}`}>−{discountPct}%</span>
        )}
      </div>

      {/* Store + valid until */}
      <div className="flex items-center justify-between text-xs text-provision-dim">
        <span className="flex items-center gap-1">
          <Tag size={10} />
          {alert.deal.stores?.name || 'Unknown Store'}
        </span>
        {alert.deal.valid_until && (
          <span>Ends {new Date(alert.deal.valid_until).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        )}
      </div>

      {/* Target Circle link */}
      {alert.deal.target_circle_url && (
        <a
          href={alert.deal.target_circle_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
        >
          <CheckCircle2 size={10} />
          Clip Target Circle offer
        </a>
      )}
    </div>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
        active
          ? 'bg-provision-savings/20 border-provision-savings text-provision-savings'
          : 'bg-provision-surface border-provision-border text-provision-dim hover:text-provision-text'
      }`}
    >
      {label}
    </button>
  )
}

export function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [topDeals, setTopDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string | null>(null)

  useEffect(() => { fetchAlerts() }, [])

  async function fetchAlerts() {
    setLoading(true)
    try {
      const [alertsRes, dealsRes] = await Promise.all([
        fetch(`${API}/alerts`).then(r => r.json()),
        fetch(`${API}/deals?quality_min=0`).then(r => r.json()),
      ])
      setAlerts(alertsRes.alerts || [])
      // Top 10 deals by discount_pct as fallback content
      const sorted = (dealsRes.deals || []).slice(0, 10)
      setTopDeals(sorted)
    } catch { /* noop */ }
    setLoading(false)
  }

  const tiers = ['PROFIT', 'FREE', 'NEAR FREE', 'HOT DEAL']
  const filtered = filter ? alerts.filter(a => a.tier.label === filter) : alerts
  const myListAlerts = alerts.filter(a => a.on_my_list)
  const allOtherAlerts = filtered.filter(a => !a.on_my_list)

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell size={18} className="text-provision-savings" />
            <h1 className="text-xl font-bold text-provision-text">Deal Alerts</h1>
            {alerts.length > 0 && (
              <span className="px-1.5 py-0.5 bg-provision-savings/20 text-provision-savings rounded-full text-xs font-bold">{alerts.length}</span>
            )}
          </div>
          <p className="text-provision-dim text-sm">Hot deals matching your preferences</p>
        </div>
        <button
          onClick={fetchAlerts}
          className="p-2 rounded-lg border border-provision-border text-provision-dim hover:text-provision-text transition-colors"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Tier filters */}
      <div className="flex gap-2 flex-wrap">
        <FilterChip label="All" active={!filter} onClick={() => setFilter(null)} />
        {tiers.map(tier => (
          <FilterChip
            key={tier}
            label={tier}
            active={filter === tier}
            onClick={() => setFilter(tier === filter ? null : tier)}
          />
        ))}
      </div>

      {loading && (
        <div className="text-center py-10 text-provision-dim text-sm">Loading alerts...</div>
      )}

      {!loading && alerts.length === 0 && topDeals.length === 0 && (
        <div className="text-center py-12">
          <Zap size={36} className="text-provision-muted mx-auto mb-3" />
          <p className="text-provision-text font-medium">No hot alerts right now</p>
          <p className="text-provision-dim text-sm mt-1">We check for Near Free, Free, and Profit-tier deals automatically</p>
        </div>
      )}

      {/* My List matches first */}
      {!filter && myListAlerts.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-provision-savings flex items-center gap-1">
            <Star size={12} fill="currentColor" />
            Matches Your List ({myListAlerts.length})
          </p>
          {myListAlerts.map((alert, i) => <AlertCard key={i} alert={alert} />)}
        </div>
      )}

      {/* All other alerts */}
      {filtered.length > 0 && (
        <div className="space-y-3">
          {(!filter && myListAlerts.length > 0) && (
            <p className="text-xs font-semibold uppercase tracking-wide text-provision-dim">Other Hot Deals</p>
          )}
          {(filter ? filtered : allOtherAlerts).map((alert, i) => <AlertCard key={i} alert={alert} />)}
        </div>
      )}

      {/* Top deals by discount when no tier-based alerts */}
      {!loading && !filter && alerts.length === 0 && topDeals.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-provision-dim">Top 10 Deals This Week</p>
          {topDeals.map((deal, i) => {
            const discountPct = deal.discount_pct ? Math.round(deal.discount_pct) : null
            return (
              <div key={deal.id} className="rounded-xl border border-provision-border bg-provision-surface p-4 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-provision-text leading-tight truncate">{deal.item_name}</p>
                    {deal.stores?.name && (
                      <p className="text-xs text-provision-dim mt-0.5 flex items-center gap-1">
                        <Tag size={10} />
                        {deal.stores.name}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-emerald-400">
                      {deal.sale_price != null ? `$${deal.sale_price.toFixed(2)}` : 'See Ad'}
                    </p>
                    {discountPct && discountPct > 0 && (
                      <p className="text-xs text-provision-savings font-semibold">−{discountPct}%</p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-provision-dim">
                  {discountPct && discountPct > 0 ? `${discountPct}% off` : 'High-value deal'} this week
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
