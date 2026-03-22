import { useEffect, useState } from 'react'
import { StoreBadge } from '@/components/StoreBadge'

interface ClearanceItem {
  store: string
  item: string
  price: number
  original_price: number
  savings_pct: number
  url: string
  bulk_worthy: boolean
}

interface ApiResponse {
  items: ClearanceItem[]
  cached_at: string
  from_cache: boolean
}

function fmt(n: number) {
  return `$${n.toFixed(2)}`
}

function minutesAgo(isoDate: string) {
  const ms = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(ms / 60_000)
  if (mins < 1) return 'just now'
  if (mins === 1) return '1 min ago'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs} hr ago`
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-provision-border bg-provision-surface p-4 animate-pulse space-y-2">
      <div className="h-4 w-24 rounded bg-white/10" />
      <div className="h-3 w-3/4 rounded bg-white/10" />
      <div className="h-3 w-1/2 rounded bg-white/10" />
    </div>
  )
}

export function OnlineClearanceTab() {
  const [items, setItems] = useState<ClearanceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [cachedAt, setCachedAt] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/online-clearance')
      .then((r) => r.json())
      .then((data: ApiResponse) => {
        if (!active) return
        setItems(Array.isArray(data.items) ? data.items : [])
        setCachedAt(data.cached_at || null)
      })
      .catch(() => {
        if (!active) return
        setError(true)
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })
    return () => { active = false }
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  if (error || items.length === 0) {
    return (
      <div className="rounded-xl border border-provision-border bg-provision-surface p-6 text-center">
        <p className="text-sm text-provision-dim">
          {error ? 'Could not load clearance data — try again later' : 'No clearance items found right now'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {cachedAt && (
        <p className="text-xs text-provision-dim text-right">Updated {minutesAgo(cachedAt)}</p>
      )}
      {items.map((item, idx) => (
        <article
          key={idx}
          className="rounded-xl border border-provision-border bg-provision-surface p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <StoreBadge name={item.store} />
              <p className="text-sm font-semibold text-provision-text leading-snug">{item.item}</p>
              {item.original_price > item.price && (
                <p className="text-xs text-provision-dim line-through">{fmt(item.original_price)}</p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                {item.savings_pct > 0 && (
                  <span className="inline-flex items-center rounded-full bg-provision-savings/10 border border-provision-savings/30 px-2 py-0.5 text-xs font-semibold text-provision-savings">
                    {item.savings_pct}% off
                  </span>
                )}
                {item.bulk_worthy && (
                  <span className="inline-flex items-center rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-xs font-semibold text-amber-400">
                    🏗️ Bulk Worthy
                  </span>
                )}
              </div>
            </div>
            <p className="text-lg font-bold text-yellow-300 shrink-0">{fmt(item.price)}</p>
          </div>
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex text-sm text-provision-savings hover:text-green-300 transition-colors"
            >
              View Item →
            </a>
          )}
        </article>
      ))}
    </div>
  )
}
