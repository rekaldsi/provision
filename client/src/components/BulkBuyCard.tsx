import { useState } from 'react'

interface PalletValue {
  totalCost: number
  estimatedRetailValue: number
  savings: number
}

interface BulkDeal {
  id?: string
  store: string
  item: string
  price: number
  original_price?: number
  category?: string
  spotted_date?: string
  pallet_value?: PalletValue
}

interface BulkBuyCardProps {
  deal: BulkDeal
}

function fmt(n: number) {
  return `$${n.toFixed(2)}`
}

export function BulkBuyCard({ deal }: BulkBuyCardProps) {
  const [qty, setQty] = useState(24)
  const price = deal.price ?? 0
  const originalPrice = deal.original_price ?? 0

  const totalCost = parseFloat((price * qty).toFixed(2))
  const estimatedRetailValue = parseFloat((price * qty * 10).toFixed(2))
  const savings = parseFloat((estimatedRetailValue - totalCost).toFixed(2))

  const handleAddToShoppingList = async () => {
    try {
      await fetch('/api/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_name: `${deal.item} ×${qty}` }),
      })
    } catch (_) {
      // graceful
    }
  }

  const handleAddToDonateList = async () => {
    try {
      await fetch('/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_name: deal.item,
          quantity: qty,
          value: estimatedRetailValue,
        }),
      })
    } catch (_) {
      // graceful
    }
  }

  return (
    <article className="rounded-xl border border-provision-border bg-provision-surface p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-provision-dim">{deal.store}</p>
          <p className="text-sm font-semibold text-provision-text leading-snug mt-0.5">{deal.item}</p>
          {originalPrice > price && (
            <p className="text-xs text-provision-dim line-through mt-0.5">{fmt(originalPrice)}</p>
          )}
        </div>
        <p className="text-lg font-bold text-yellow-300 shrink-0">{fmt(price)}</p>
      </div>

      {/* Pallet calculator */}
      <div className="rounded-lg bg-provision-bg border border-provision-border p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs text-provision-dim font-medium">Qty to buy</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 12))}
              className="w-7 h-7 rounded-md bg-white/5 border border-provision-border text-provision-text text-sm hover:bg-white/10 transition-colors"
            >
              −
            </button>
            <span className="text-sm font-semibold text-provision-text w-8 text-center">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => q + 12)}
              className="w-7 h-7 rounded-md bg-white/5 border border-provision-border text-provision-text text-sm hover:bg-white/10 transition-colors"
            >
              +
            </button>
          </div>
        </div>
        <p className="text-xs text-provision-text">
          🎯 Buy {qty} → spend{' '}
          <span className="font-bold text-yellow-300">{fmt(totalCost)}</span>, donate{' '}
          <span className="font-bold text-provision-savings">{fmt(estimatedRetailValue)}</span> value
          <span className="text-provision-dim"> (save {fmt(savings)})</span>
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void handleAddToShoppingList()}
          className="flex-1 rounded-lg bg-provision-savings/10 border border-provision-savings/30 py-2 text-xs font-semibold text-provision-savings hover:bg-provision-savings/20 transition-colors"
        >
          + Shopping List
        </button>
        <button
          type="button"
          onClick={() => void handleAddToDonateList()}
          className="flex-1 rounded-lg bg-red-500/10 border border-red-500/30 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
        >
          + Donate List
        </button>
      </div>
    </article>
  )
}
