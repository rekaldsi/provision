import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, CalendarDays, Tag, Zap, ShoppingCart, ExternalLink,
  Store, Package, CheckCircle2, AlertTriangle
} from 'lucide-react'
import { getDeal, addToListFromDeal, type Deal, type AlertTier } from '@/lib/api'
import { cn, formatPrice, formatDiscount } from '@/lib/utils'
import { StoreBadge } from '@/components/StoreBadge'

const TIER_STYLES: Record<string, { ring: string; bg: string; text: string; label: string }> = {
  'PROFIT': { ring: 'border-yellow-500', bg: 'bg-yellow-900/20', text: 'text-yellow-400', label: '💰 PROFIT' },
  'FREE': { ring: 'border-green-400', bg: 'bg-green-900/20', text: 'text-green-400', label: '🆓 FREE' },
  'NEAR FREE': { ring: 'border-yellow-400', bg: 'bg-yellow-900/20', text: 'text-yellow-300', label: '⚡ NEAR FREE' },
  'HOT DEAL': { ring: 'border-red-500', bg: 'bg-red-900/20', text: 'text-red-400', label: '🔥 HOT DEAL' },
  'GOOD DEAL': { ring: 'border-green-600', bg: 'bg-green-900/10', text: 'text-green-500', label: '💰 GOOD DEAL' },
}

function getDaysUntil(dateStr?: string): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div className={cn(
      'fixed bottom-28 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-provision-savings text-black rounded-full text-sm font-semibold shadow-lg transition-all duration-300',
      visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
    )}>
      <CheckCircle2 size={16} />
      {message}
    </div>
  )
}

type EnrichedDeal = Deal & { tier?: AlertTier; item_size?: string }

export function DealDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [deal, setDeal] = useState<EnrichedDeal | null>(null)
  const [related, setRelated] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getDeal(id)
      .then(({ deal: d, related: r }) => {
        setDeal(d)
        setRelated(r)
      })
      .catch(() => setError('Deal not found'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleAddToList() {
    if (!deal || adding) return
    setAdding(true)
    try {
      await addToListFromDeal(deal)
      setToastVisible(true)
      setTimeout(() => setToastVisible(false), 2500)
    } catch {
      // silent — deal with error state later
    } finally {
      setAdding(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-provision-dim hover:text-provision-text transition-colors text-sm">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="h-40 bg-provision-surface rounded-xl animate-pulse" />
        <div className="h-20 bg-provision-surface rounded-xl animate-pulse" />
        <div className="h-32 bg-provision-surface rounded-xl animate-pulse" />
      </div>
    )
  }

  if (error || !deal) {
    return (
      <div className="space-y-4 animate-fade-in">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-provision-dim hover:text-provision-text transition-colors text-sm">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="text-center py-16">
          <AlertTriangle size={36} className="text-provision-muted mx-auto mb-3" />
          <p className="text-provision-text font-medium">Deal not found</p>
          <p className="text-provision-dim text-sm mt-1">It may have expired or been removed</p>
        </div>
      </div>
    )
  }

  const tier = deal.tier
  const tierStyle = tier ? TIER_STYLES[tier.label] : null
  const daysLeft = getDaysUntil(deal.valid_until)
  const isExpiringSoon = daysLeft != null && daysLeft <= 3
  const discount = deal.discount_pct ? Math.round(deal.discount_pct) : null
  const storeName = deal.stores?.name || deal.store_name || 'Unknown Store'

  // Stack breakdown layers
  const storeCoupon = (deal as any).store_coupon_value || 0
  const finalAfterCoupon = deal.sale_price != null
    ? (deal.sale_price - storeCoupon)
    : null

  return (
    <div className="space-y-4 animate-fade-in">
      <Toast message="Added to your list ✓" visible={toastVisible} />

      {/* Back nav */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-provision-dim hover:text-provision-text transition-colors text-sm"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* Main card */}
      <div className={cn(
        'rounded-xl border p-5 space-y-4',
        tierStyle ? `${tierStyle.ring} ${tierStyle.bg}` : 'border-provision-border bg-provision-surface'
      )}>
        {/* Store + tier badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {deal.stores?.name && (
              <StoreBadge name={deal.stores.name} chain={deal.stores.chain} />
            )}
            {!deal.stores?.name && deal.store_name && (
              <StoreBadge name={deal.store_name} chain={deal.store_chain} />
            )}
          </div>
          {tier && tierStyle && (
            <span className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border shrink-0', tierStyle.ring, tierStyle.text, 'bg-black/20')}>
              <Zap size={10} />
              {tier.emoji} {tier.label}
            </span>
          )}
        </div>

        {/* Product name */}
        <div>
          {deal.item_brand && (
            <p className="text-xs text-provision-dim uppercase tracking-wide font-medium mb-0.5">{deal.item_brand}</p>
          )}
          <h1 className="text-xl font-bold text-provision-text leading-tight">{deal.item_name}</h1>
          {(deal as any).item_size && (
            <p className="text-sm text-provision-dim mt-1">{(deal as any).item_size}</p>
          )}
          {deal.unit && !(deal as any).item_size && (
            <p className="text-sm text-provision-dim mt-1">{deal.unit}</p>
          )}
        </div>

        {/* Price row */}
        <div className="flex items-end gap-3">
          <span className="text-4xl font-bold text-emerald-400">
            {deal.sale_price != null ? formatPrice(deal.sale_price) : 'See Ad'}
          </span>
          {deal.original_price && (
            <div className="pb-1">
              <p className="text-sm text-provision-dim line-through">{formatPrice(deal.original_price)}</p>
              {discount != null && discount > 0 && (
                <p className="text-xs text-provision-savings font-semibold">Save {formatDiscount(discount)}</p>
              )}
            </div>
          )}
        </div>

        {/* Dates */}
        {(deal.valid_from || deal.valid_until) && (
          <div className="flex items-center gap-2">
            <CalendarDays size={14} className={isExpiringSoon ? 'text-red-400' : 'text-provision-dim'} />
            <span className={cn('text-sm', isExpiringSoon ? 'text-red-400 font-medium' : 'text-provision-dim')}>
              {deal.valid_from && deal.valid_until
                ? `${new Date(deal.valid_from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(deal.valid_until).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                : deal.valid_until
                  ? `Ends ${new Date(deal.valid_until).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                  : ''}
              {daysLeft != null && (
                <span className="ml-2">
                  {daysLeft === 0 ? '· Ends today' : daysLeft < 0 ? '· Expired' : isExpiringSoon ? `· ${daysLeft}d left!` : `· ${daysLeft} days left`}
                </span>
              )}
            </span>
          </div>
        )}

        {/* Add to List CTA */}
        <button
          onClick={handleAddToList}
          disabled={adding}
          className="w-full py-3.5 bg-provision-savings text-black font-bold rounded-xl text-base hover:bg-green-300 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <ShoppingCart size={18} />
          {adding ? 'Adding...' : 'Add to My List'}
        </button>

        {/* External links */}
        <div className="flex items-center gap-3 flex-wrap">
          {deal.target_circle_url && (
            <a
              href={deal.target_circle_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition-colors font-medium"
            >
              <CheckCircle2 size={14} />
              Clip Target Circle
            </a>
          )}
          {deal.source_url && (
            <a
              href={deal.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-provision-dim hover:text-provision-text transition-colors"
            >
              <ExternalLink size={14} />
              View Full Ad
            </a>
          )}
        </div>
      </div>

      {/* Stack Breakdown */}
      <div className="bg-provision-surface border border-provision-border rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-provision-dim">Stack Breakdown</p>
        <div className="space-y-2">
          {deal.original_price && (
            <div className="flex justify-between text-sm">
              <span className="text-provision-dim">Original Price</span>
              <span className="text-provision-dim line-through">{formatPrice(deal.original_price)}</span>
            </div>
          )}
          {deal.sale_price != null && (
            <div className="flex justify-between text-sm">
              <span className="text-provision-text font-medium">Store Sale</span>
              <span className="text-emerald-400 font-semibold">{formatPrice(deal.sale_price)}</span>
            </div>
          )}
          {storeCoupon > 0 ? (
            <div className="flex justify-between text-sm">
              <span className="text-provision-text font-medium">Store Digital Coupon</span>
              <span className="text-emerald-400 font-semibold">−{formatPrice(storeCoupon)}</span>
            </div>
          ) : (
            <div className="flex justify-between text-sm">
              <span className="text-provision-dim">Store Coupon</span>
              <span className="text-provision-dim text-xs italic">Check store app</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-provision-dim">Rebates (Ibotta, Fetch)</span>
            <span className="text-provision-dim text-xs italic">Check apps</span>
          </div>
          <div className="border-t border-provision-border pt-2 flex justify-between text-sm font-bold">
            <span className="text-provision-text">After Full Stack</span>
            <span className="text-emerald-400">
              {finalAfterCoupon != null ? formatPrice(Math.max(0, finalAfterCoupon)) : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Category + source */}
      {(deal.category || deal.source) && (
        <div className="flex items-center gap-3 text-xs text-provision-dim">
          {deal.category && (
            <span className="flex items-center gap-1">
              <Tag size={11} />
              {deal.category.replace('.', ' › ')}
            </span>
          )}
          {deal.source && (
            <span className="flex items-center gap-1">
              <Store size={11} />
              via {deal.source}
            </span>
          )}
        </div>
      )}

      {/* Related deals */}
      {related.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-provision-dim">More from {storeName}</p>
          {related.map(r => (
            <Link
              key={r.id}
              to={`/deal/${r.id}`}
              className="block bg-provision-surface border border-provision-border rounded-xl p-3 hover:border-white/10 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-provision-text leading-tight truncate">{r.item_name}</p>
                  {r.unit && <p className="text-xs text-provision-dim mt-0.5">{r.unit}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-emerald-400">{formatPrice(r.sale_price)}</p>
                  {r.discount_pct && r.discount_pct > 0 && (
                    <p className="text-xs text-provision-dim">−{Math.round(r.discount_pct)}%</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
