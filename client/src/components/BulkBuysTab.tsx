import { useEffect, useState } from 'react'
import { BulkBuyCard } from '@/components/BulkBuyCard'

interface BulkDeal {
  id?: string
  store: string
  item: string
  price: number
  original_price?: number
  category?: string
  spotted_date?: string
  pallet_value?: {
    totalCost: number
    estimatedRetailValue: number
    savings: number
  }
}

interface ApiResponse {
  deals: BulkDeal[]
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-provision-border bg-provision-surface p-4 animate-pulse space-y-3">
      <div className="flex justify-between">
        <div className="space-y-1 flex-1">
          <div className="h-3 w-16 rounded bg-white/10" />
          <div className="h-4 w-2/3 rounded bg-white/10" />
        </div>
        <div className="h-6 w-14 rounded bg-white/10" />
      </div>
      <div className="h-16 rounded-lg bg-white/5" />
      <div className="flex gap-2">
        <div className="h-8 flex-1 rounded-lg bg-white/10" />
        <div className="h-8 flex-1 rounded-lg bg-white/10" />
      </div>
    </div>
  )
}

export function BulkBuysTab() {
  const [deals, setDeals] = useState<BulkDeal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/bulk-buys')
      .then((r) => r.json())
      .then((data: ApiResponse) => {
        if (!active) return
        setDeals(Array.isArray(data.deals) ? data.deals : [])
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
        {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-provision-border bg-provision-surface p-6 text-center">
        <p className="text-sm text-provision-dim">Could not load bulk buys — try again later</p>
      </div>
    )
  }

  if (deals.length === 0) {
    return (
      <div className="rounded-xl border border-provision-border bg-provision-surface p-6 text-center space-y-1">
        <p className="text-sm font-semibold text-provision-text">No bulk buys this week</p>
        <p className="text-xs text-provision-dim">Check back when penny deals are spotted</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-provision-dim">
        {deals.length} bulk buy{deals.length === 1 ? '' : 's'} this week — buy to donate at maximum value
      </p>
      {deals.map((deal, idx) => (
        <BulkBuyCard key={deal.id ?? idx} deal={deal} />
      ))}
    </div>
  )
}
