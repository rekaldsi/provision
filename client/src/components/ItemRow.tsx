import { useState } from 'react'
import { ChevronRight, Trash2, Edit2, CheckCircle, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn, formatPrice, getStatusLabel, getStatusClass } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { StoreBadge } from '@/components/StoreBadge'
import type { Item, Deal } from '@/lib/api'

interface ItemRowProps {
  item: Item
  bestDeal?: Deal
  stack?: {
    final_price?: number
    savings_total?: number
    savings_pct?: number
    is_near_free?: boolean
    is_free?: boolean
    is_profit?: boolean
    store_name?: string
    store_chain?: string
  }
  onDelete?: (id: string) => void
  onEdit?: (item: Item) => void
  className?: string
}

export function ItemRow({ item, bestDeal, stack, onDelete, onEdit, className }: ItemRowProps) {
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)

  const statusLabel = stack ? getStatusLabel(stack) : null
  const statusClass = stack ? getStatusClass(stack) : ''

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onDelete) return
    setDeleting(true)
    await onDelete(item.id)
    setDeleting(false)
  }

  const finalPrice = stack?.final_price
  const savings = stack?.savings_total

  return (
    <div
      className={cn(
        'group flex items-center gap-3 p-3 rounded-lg border border-provision-border bg-provision-surface hover:border-white/10 transition-all cursor-pointer',
        stack?.is_near_free && 'shimmer',
        className
      )}
      onClick={() => navigate(`/stack/${item.id}`)}
    >
      {/* Status indicator */}
      <div className={cn(
        'w-1 self-stretch rounded-full shrink-0',
        stack?.is_profit ? 'bg-amber-400' :
        stack?.is_free ? 'bg-green-400' :
        stack?.is_near_free ? 'bg-yellow-400' :
        savings ? 'bg-emerald-500/50' : 'bg-provision-muted'
      )} />

      {/* Item info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="text-sm font-medium text-provision-text leading-none">{item.name}</span>
          {statusLabel && (
            <span className={cn('text-xs px-1.5 py-0.5 rounded-sm font-bold tracking-wider', statusClass)}>
              {statusLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {item.brand && <span className="text-xs text-provision-dim">{item.brand}</span>}
          {item.category && (
            <span className="text-xs text-provision-muted bg-provision-muted/30 px-1.5 rounded-sm">
              {item.category}
            </span>
          )}
          {stack?.store_name && (
            <StoreBadge name={stack.store_name} chain={stack.store_chain} size="sm" />
          )}
          {bestDeal?.valid_until && (
            <span className="text-xs text-provision-dim">
              until {new Date(bestDeal.valid_until).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      {/* Pricing */}
      <div className="text-right shrink-0">
        {finalPrice != null ? (
          <>
            <p className={cn(
              'text-base font-bold leading-none',
              stack?.is_profit ? 'text-amber-300' :
              stack?.is_free ? 'text-green-400' :
              stack?.is_near_free ? 'text-yellow-400' : 'text-emerald-400'
            )}>
              {stack?.is_profit ? `+$${Math.abs(finalPrice).toFixed(2)}` :
               finalPrice === 0 ? 'FREE' : `$${finalPrice.toFixed(2)}`}
            </p>
            {savings != null && savings > 0 && (
              <p className="text-xs text-provision-dim mt-0.5">
                save {formatPrice(savings)}
              </p>
            )}
          </>
        ) : (
          <span className="text-xs text-provision-dim">no deal</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {onEdit && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => { e.stopPropagation(); onEdit(item) }}
            className="opacity-0 group-hover:opacity-100"
          >
            <Edit2 size={13} />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleDelete}
            disabled={deleting}
            className="opacity-0 group-hover:opacity-100 hover:text-red-400"
          >
            <Trash2 size={13} />
          </Button>
        )}
        <ChevronRight size={14} className="text-provision-muted" />
      </div>
    </div>
  )
}
