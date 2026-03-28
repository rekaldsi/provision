import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Tag, ShoppingCart, CheckCircle2 } from 'lucide-react'
import { getDeal, addToListFromDeal, type Deal } from '@/lib/api'
import { formatPrice, cn } from '@/lib/utils'
import { StoreBadge } from '@/components/StoreBadge'

export function DealDetail() {
  const { id } = useParams<{ id: string }>()
  const [deal, setDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [added, setAdded] = useState(false)
  const [adding, setAdding] = useState(false)

  async function handleAddToList() {
    if (!deal || adding || added) return
    setAdding(true)
    try {
      await addToListFromDeal(deal)
      setAdded(true)
      setTimeout(() => setAdded(false), 3000)
    } catch { /* noop */ }
    setAdding(false)
  }

  useEffect(() => {
    if (!id) return
    getDeal(id)
      .then(data => setDeal(data.deal))
      .catch(() => setError('Failed to load deal'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-5 w-24 bg-provision-surface rounded animate-pulse" />
        <div className="h-56 bg-provision-surface rounded-xl animate-pulse" />
      </div>
    )
  }

  if (error || !deal) {
    return (
      <div className="text-center py-16">
        <Tag size={32} className="mx-auto mb-3 text-provision-muted" />
        <p className="text-sm text-provision-dim">{error || 'Deal not found'}</p>
        <Link to="/deals" className="mt-4 inline-block text-sm text-emerald-400">
          Back to Deals
        </Link>
      </div>
    )
  }

  const storeName = deal.store_name || deal.stores?.name || 'Unknown Store'
  const discount = deal.discount_pct ? `${Math.round(deal.discount_pct)}% off` : null

  return (
    <div className="space-y-4 animate-fade-in">
      <Link
        to="/deals"
        className="inline-flex items-center gap-1.5 text-xs text-provision-dim hover:text-provision-text transition-colors"
      >
        <ArrowLeft size={12} />
        Deals
      </Link>

      <div className="border border-provision-border rounded-xl p-5 space-y-5">
        {/* Store + name */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <StoreBadge name={storeName} size="md" />
            <h1 className="text-lg font-bold text-provision-text mt-2 leading-snug">{deal.item_name}</h1>
            {deal.item_brand && !deal.item_name?.toLowerCase().startsWith(deal.item_brand.toLowerCase()) && (
              <p className="text-sm text-provision-dim mt-0.5">{deal.item_brand}</p>
            )}
          </div>
          {discount && (
            <span className="shrink-0 px-2 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm font-bold rounded-lg">
              {discount}
            </span>
          )}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-3">
          {deal.sale_price != null && (
            <span className="text-3xl font-bold text-emerald-400">{formatPrice(deal.sale_price)}</span>
          )}
          {deal.original_price != null && (
            <span className="text-lg text-provision-muted line-through">{formatPrice(deal.original_price)}</span>
          )}
        </div>

        {/* Validity */}
        {deal.valid_until && (
          <p className="text-xs text-provision-dim">
            Valid until {new Date(deal.valid_until).toLocaleDateString()}
          </p>
        )}

        {/* Coupon type */}
        {deal.coupon_type && (
          <span className="inline-block px-3 py-1 bg-provision-muted border border-provision-border rounded-full text-xs text-provision-dim">
            {deal.coupon_type === 'loyalty_card' ? 'Loyalty Card Price' : 'Store Sale'}
          </span>
        )}

        {/* Target Circle */}
        {deal.target_circle_url && (
          <a
            href={deal.target_circle_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300"
          >
            🎯 Clip Target Circle offer
          </a>
        )}

        {/* Deep link CTA */}
        {deal.coupon_deep_link && (
          <a
            href={deal.coupon_deep_link}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full block py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl text-center text-sm transition-colors"
          >
            Open {storeName} App →
          </a>
        )}

        {/* Add to List */}
        <button
          onClick={handleAddToList}
          disabled={adding}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border transition-colors',
            added
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
              : 'bg-provision-surface border-provision-border text-provision-dim hover:text-provision-text hover:border-provision-savings/50'
          )}
        >
          {added ? (
            <><CheckCircle2 size={15} /> Added to List</>
          ) : (
            <><ShoppingCart size={15} /> {adding ? 'Adding...' : 'Add to My List'}</>
          )}
        </button>
      </div>
    </div>
  )
}
