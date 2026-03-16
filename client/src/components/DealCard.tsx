import { CalendarDays, ExternalLink, Tag, Zap } from 'lucide-react'
import { cn, formatPrice, formatDiscount } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StoreBadge } from '@/components/StoreBadge'
import type { Deal } from '@/lib/api'

interface DealCardProps {
  deal: Deal & { tier?: { label: string; color: string; bgColor: string; emoji: string } }
  className?: string
}

function getDaysUntil(dateStr?: string): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

const TIER_BADGE_STYLES: Record<string, string> = {
  'PROFIT': 'bg-yellow-900/40 border-yellow-500/60 text-yellow-400',
  'FREE': 'bg-green-900/40 border-green-400/60 text-green-400',
  'NEAR FREE': 'bg-yellow-900/30 border-yellow-400/50 text-yellow-300',
  'HOT DEAL': 'bg-red-900/30 border-red-500/50 text-red-400',
  'GOOD DEAL': 'bg-green-900/20 border-green-600/40 text-green-500',
}

export function DealCard({ deal, className }: DealCardProps) {
  const daysLeft = getDaysUntil(deal.valid_until)
  const isExpiringSoon = daysLeft != null && daysLeft <= 2
  const discount = deal.discount_pct ? Math.round(deal.discount_pct) : null
  const tier = (deal as any).tier

  return (
    <Card className={cn('hover:border-white/10 transition-colors', className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {deal.stores?.name && (
                <StoreBadge name={deal.stores.name} chain={deal.stores.chain} />
              )}
              {/* Legacy store_name support */}
              {!deal.stores?.name && deal.store_name && (
                <StoreBadge name={deal.store_name} chain={deal.store_chain} />
              )}
              {deal.category && (
                <span className="text-xs text-provision-dim">{deal.category.replace('.', ' › ')}</span>
              )}
            </div>
            <p className="text-sm font-medium text-provision-text leading-tight">
              {deal.item_brand && (
                <span className="text-provision-dim mr-1">{deal.item_brand}</span>
              )}
              {deal.item_name}
            </p>
            {deal.unit && (
              <p className="text-xs text-provision-dim mt-0.5">{deal.unit}</p>
            )}
          </div>

          <div className="text-right shrink-0">
            <p className="text-lg font-bold text-emerald-400">
              {formatPrice(deal.sale_price)}
            </p>
            {deal.original_price && (
              <p className="text-xs text-provision-dim line-through">
                {formatPrice(deal.original_price)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Tier badge — highest priority */}
            {tier && (
              <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border', TIER_BADGE_STYLES[tier.label] || 'bg-provision-muted text-provision-dim')}>
                <Zap size={9} />
                {tier.emoji} {tier.label}
              </span>
            )}
            {!tier && discount != null && discount > 0 && (
              <Badge variant="savings">
                <Tag size={10} className="mr-1" />
                {formatDiscount(discount)}
              </Badge>
            )}
            {tier && discount != null && discount > 0 && (
              <span className="text-xs text-provision-dim">−{discount}%</span>
            )}
            {daysLeft != null && (
              <span className={cn('flex items-center gap-1 text-xs', isExpiringSoon ? 'text-red-400' : 'text-provision-dim')}>
                <CalendarDays size={11} />
                {daysLeft === 0 ? 'Ends today' : daysLeft < 0 ? 'Expired' : `${daysLeft}d left`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {deal.target_circle_url && (
              <a
                href={deal.target_circle_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors font-medium"
              >
                Circle <ExternalLink size={10} />
              </a>
            )}
            {deal.source_url && (
              <a
                href={deal.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-provision-dim hover:text-provision-text transition-colors"
              >
                {deal.source} <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
