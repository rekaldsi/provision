import { CalendarDays, ExternalLink, Tag } from 'lucide-react'
import { cn, formatPrice, formatDiscount } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StoreBadge } from '@/components/StoreBadge'
import type { Deal } from '@/lib/api'

interface DealCardProps {
  deal: Deal
  className?: string
}

function getDaysUntil(dateStr?: string): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function DealCard({ deal, className }: DealCardProps) {
  const daysLeft = getDaysUntil(deal.valid_until)
  const isExpiringSoon = daysLeft != null && daysLeft <= 2
  const discount = deal.discount_pct ? Math.round(deal.discount_pct) : null

  return (
    <Card className={cn('hover:border-white/10 transition-colors', className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {deal.store_name && (
                <StoreBadge name={deal.store_name} chain={deal.store_chain} />
              )}
              {deal.store_type === 'warehouse' && (
                <span className="text-xs text-teal-500 font-medium">Members</span>
              )}
              {deal.category && (
                <span className="text-xs text-provision-dim">{deal.category}</span>
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
          <div className="flex items-center gap-2 flex-wrap">
            {discount != null && discount > 0 && (
              <Badge variant="savings">
                <Tag size={10} className="mr-1" />
                {formatDiscount(discount)}
              </Badge>
            )}
            {daysLeft != null && (
              <span className={cn('flex items-center gap-1 text-xs', isExpiringSoon ? 'text-red-400' : 'text-provision-dim')}>
                <CalendarDays size={11} />
                {daysLeft === 0 ? 'Expires today' : daysLeft < 0 ? 'Expired' : `${daysLeft}d left`}
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
                Circle
                <ExternalLink size={10} />
              </a>
            )}
            {deal.source_url && (
              <a
                href={deal.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-provision-dim hover:text-provision-text transition-colors"
              >
                {deal.source}
                <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
