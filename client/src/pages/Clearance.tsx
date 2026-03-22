import { useState } from 'react'
import { PriceDecoder } from '@/components/PriceDecoder'
import { StoreBadge } from '@/components/StoreBadge'
import { OnlineClearanceTab } from '@/components/OnlineClearanceTab'
import { BulkBuysTab } from '@/components/BulkBuysTab'
import { useEffect } from 'react'
import { getChicagolandDeals, type ChicagolandDeal } from '@/lib/api'

interface PennyDeal {
  id: string
  store: string
  item: string
  price: number
  source_name?: string
  source_url?: string
  spotted_date: string
}

type Tab = 'decoder' | 'calendar' | 'online' | 'bulk' | 'bigbox'

const TABS: { id: Tab; label: string }[] = [
  { id: 'decoder', label: 'Decoder' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'online', label: 'Online' },
  { id: 'bulk', label: 'Bulk Buys' },
  { id: 'bigbox', label: 'Big Box' },
]

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`
}

function CalendarTab() {
  const [deals, setDeals] = useState<PennyDeal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetch('/api/penny-deals/this-week')
      .then((r) => r.json())
      .then((payload: { deals?: PennyDeal[] }) => {
        if (!active) return
        setDeals(Array.isArray(payload.deals) ? payload.deals : [])
      })
      .catch(() => { if (!active) return; setDeals([]) })
      .finally(() => { if (!active) return; setLoading(false) })
    return () => { active = false }
  }, [])

  if (loading) {
    return (
      <div className="rounded-xl border border-provision-border bg-provision-surface p-4">
        <p className="text-sm text-provision-dim">Loading penny deals...</p>
      </div>
    )
  }

  if (deals.length === 0) {
    return (
      <div className="rounded-xl border border-provision-border bg-provision-surface p-4">
        <p className="text-sm text-provision-dim">No penny deals found this week — check back soon</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {deals.map((deal) => (
        <article key={deal.id} className="rounded-xl border border-provision-border bg-provision-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-2">
                <StoreBadge name={deal.store || 'Unknown'} />
              </div>
              <p className="text-sm font-semibold text-provision-text leading-tight">{deal.item}</p>
              <p className="mt-1 text-xs text-provision-dim">
                {deal.source_name || 'Community source'} •{' '}
                {new Date(deal.spotted_date).toLocaleDateString()}
              </p>
            </div>
            <p className="text-lg font-bold text-yellow-300 shrink-0">
              {deal.price === 0.01 ? '$0.01' : formatCurrency(deal.price)}
            </p>
          </div>
          {deal.source_url && (
            <a
              href={deal.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex text-sm text-provision-savings hover:text-green-300 transition-colors"
            >
              View Deal →
            </a>
          )}
        </article>
      ))}
    </div>
  )
}

const TIER_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  PENNY: { bg: 'bg-red-500', text: 'text-white', label: 'Penny Deal' },
  DEEP: { bg: 'bg-orange-500', text: 'text-white', label: 'Deep Clearance' },
  CLEARANCE: { bg: 'bg-yellow-500', text: 'text-black', label: 'Clearance' },
}

function BigBoxTab() {
  const [deals, setDeals] = useState<ChicagolandDeal[]>([])
  const [loading, setLoading] = useState(true)
  const [tierFilter, setTierFilter] = useState<string>('')
  const [storeFilter, setStoreFilter] = useState<string>('')

  useEffect(() => {
    let active = true
    setLoading(true)
    getChicagolandDeals(tierFilter || undefined, storeFilter || undefined)
      .then((payload) => {
        if (!active) return
        setDeals(Array.isArray(payload.deals) ? payload.deals : [])
      })
      .catch(() => { if (!active) return; setDeals([]) })
      .finally(() => { if (!active) return; setLoading(false) })
    return () => { active = false }
  }, [tierFilter, storeFilter])

  const STORES = ['', 'Target', 'Home Depot', "Lowe's", 'Best Buy', 'Menards', 'Meijer']
  const TIERS = [
    { value: '', label: 'All Tiers' },
    { value: 'PENNY', label: 'Penny' },
    { value: 'DEEP', label: 'Deep Clearance' },
    { value: 'CLEARANCE', label: 'Clearance' },
  ]

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-provision-dim mb-2">Chicagoland big box stores — live clearance feeds</p>
        <div className="flex gap-2">
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="flex-1 rounded-lg border border-provision-border bg-provision-surface text-provision-text text-xs px-2 py-1.5"
          >
            {TIERS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="flex-1 rounded-lg border border-provision-border bg-provision-surface text-provision-text text-xs px-2 py-1.5"
          >
            {STORES.map((s) => (
              <option key={s} value={s}>{s || 'All Stores'}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="rounded-xl border border-provision-border bg-provision-surface p-4">
          <p className="text-sm text-provision-dim">Loading Chicagoland deals...</p>
        </div>
      )}

      {!loading && deals.length === 0 && (
        <div className="rounded-xl border border-provision-border bg-provision-surface p-4">
          <p className="text-sm text-provision-dim">No deals found — run the sweep job to populate</p>
        </div>
      )}

      {!loading && deals.length > 0 && (
        <div className="space-y-2">
          {deals.map((deal, i) => {
            const tierStyle = deal.tier ? TIER_STYLES[deal.tier] : null
            return (
              <article key={deal.id || i} className="rounded-xl border border-provision-border bg-provision-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      <StoreBadge name={deal.store} />
                      {tierStyle && (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${tierStyle.bg} ${tierStyle.text}`}>
                          {tierStyle.label}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-provision-text leading-tight">{deal.item}</p>
                    <p className="mt-1 text-xs text-provision-dim">
                      {deal.source_name || deal.store} • {new Date(deal.spotted_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-yellow-300">{formatCurrency(deal.price)}</p>
                    {deal.original_price && deal.original_price > deal.price && (
                      <p className="text-xs text-provision-dim">
                        <span className="line-through">{formatCurrency(deal.original_price)}</span>
                        {deal.savings_pct ? ` −${deal.savings_pct}%` : ''}
                      </p>
                    )}
                  </div>
                </div>
                {deal.source_url && (
                  <a
                    href={deal.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex text-sm text-provision-savings hover:text-green-300 transition-colors"
                  >
                    View Deal →
                  </a>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function Clearance() {
  const [activeTab, setActiveTab] = useState<Tab>('decoder')

  return (
    <div className="space-y-4 animate-fade-in">
      <header>
        <h1 className="text-xl font-bold text-provision-text">Clearance Intel</h1>
        <p className="text-sm text-provision-dim">
          Decode endings, track markdowns, scan online clearance, and plan bulk buys.
        </p>
      </header>

      {/* Tab bar */}
      <div className="flex rounded-xl border border-provision-border bg-provision-surface overflow-hidden">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={[
              'flex-1 py-2.5 text-xs font-semibold transition-colors',
              activeTab === tab.id
                ? 'bg-white/10 text-provision-text'
                : 'text-provision-dim hover:text-provision-text',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'decoder' && <PriceDecoder />}
      {activeTab === 'calendar' && <CalendarTab />}
      {activeTab === 'online' && <OnlineClearanceTab />}
      {activeTab === 'bulk' && <BulkBuysTab />}
      {activeTab === 'bigbox' && <BigBoxTab />}
    </div>
  )
}
