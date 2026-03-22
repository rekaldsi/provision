import { useEffect, useState } from 'react'
import { PriceDecoder } from '@/components/PriceDecoder'
import { StoreBadge } from '@/components/StoreBadge'

interface PennyDeal {
  id: string
  store: string
  item: string
  price: number
  source_name?: string
  source_url?: string
  spotted_date: string
}

const COMING_SOON_SECTIONS = ['Online Clearance', 'Bulk Buys']

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`
}

export function Clearance() {
  const [deals, setDeals] = useState<PennyDeal[]>([])
  const [loadingDeals, setLoadingDeals] = useState(true)

  useEffect(() => {
    let active = true

    fetch('/api/penny-deals/this-week')
      .then((r) => r.json())
      .then((payload: { deals?: PennyDeal[] }) => {
        if (!active) return
        setDeals(Array.isArray(payload.deals) ? payload.deals : [])
      })
      .catch(() => {
        if (!active) return
        setDeals([])
      })
      .finally(() => {
        if (!active) return
        setLoadingDeals(false)
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="space-y-4 animate-fade-in">
      <header>
        <h1 className="text-xl font-bold text-provision-text">Clearance Intel</h1>
        <p className="text-sm text-provision-dim">Decode endings, track markdown cycles, and prepare buy windows.</p>
      </header>

      <PriceDecoder />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-provision-dim">Penny Deals This Week</h2>
        {loadingDeals && (
          <div className="rounded-xl border border-provision-border bg-provision-surface p-4">
            <p className="text-sm text-provision-dim">Loading penny deals...</p>
          </div>
        )}
        {!loadingDeals && deals.length === 0 && (
          <div className="rounded-xl border border-provision-border bg-provision-surface p-4">
            <p className="text-sm text-provision-dim">No penny deals found this week — check back soon</p>
          </div>
        )}
        {!loadingDeals && deals.length > 0 && (
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
        )}
      </section>

      {COMING_SOON_SECTIONS.map((section) => (
        <section key={section} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-provision-dim">{section}</h2>
          <div className="rounded-xl border border-provision-border bg-provision-surface p-4">
            <p className="text-sm text-provision-dim">Coming soon</p>
          </div>
        </section>
      ))}
    </div>
  )
}
