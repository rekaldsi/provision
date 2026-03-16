import { ArrowDown, ExternalLink } from 'lucide-react'
import { cn, formatPrice } from '@/lib/utils'
import type { StackBreakdownLayer } from '@/lib/api'

interface StackBreakdownProps {
  breakdown: StackBreakdownLayer[]
  originalPrice?: number
  finalPrice?: number
  isFree?: boolean
  isProfit?: boolean
  isNearFree?: boolean
  className?: string
}

const LAYER_COLORS: Record<string, string> = {
  sale_price: 'text-blue-400',
  manufacturer_coupon: 'text-purple-400',
  store_coupon: 'text-emerald-400',
  rebate: 'text-amber-400',
}

export function StackBreakdown({
  breakdown,
  originalPrice,
  finalPrice,
  isFree,
  isProfit,
  isNearFree,
  className,
}: StackBreakdownProps) {
  const finalColor = isProfit
    ? 'text-amber-300'
    : isFree
    ? 'text-green-400'
    : isNearFree
    ? 'text-yellow-400'
    : 'text-emerald-400'

  const finalLabel = isProfit ? 'PROFIT' : isFree ? 'FREE' : isNearFree ? 'NEAR FREE' : 'Final Price'

  return (
    <div className={cn('font-mono text-sm', className)}>
      {/* Starting price */}
      {originalPrice != null && (
        <div className="flex items-center justify-between py-1.5 border-b border-provision-border">
          <span className="text-provision-dim text-xs">Original Price</span>
          <span className="text-provision-text">{formatPrice(originalPrice)}</span>
        </div>
      )}

      {/* Stack layers */}
      {breakdown.map((layer, i) => (
        <div key={i} className="flex items-start justify-between py-1.5 border-b border-provision-border/50">
          <div className="flex items-start gap-2 min-w-0">
            <ArrowDown size={12} className="mt-0.5 shrink-0 text-provision-muted" />
            <div className="min-w-0">
              <span className={cn('text-xs font-medium', LAYER_COLORS[layer.layer] || 'text-provision-dim')}>
                {layer.label}
              </span>
              {layer.source_url && (
                <a
                  href={layer.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 inline-flex items-center text-provision-dim hover:text-provision-text"
                >
                  <ExternalLink size={10} />
                </a>
              )}
            </div>
          </div>
          <span className="text-emerald-400 shrink-0 ml-2">
            {layer.value < 0 ? `−$${Math.abs(layer.value).toFixed(2)}` : `+$${layer.value.toFixed(2)}`}
          </span>
        </div>
      ))}

      {/* Final price */}
      <div className={cn('flex items-center justify-between pt-2 mt-1')}>
        <span className={cn('text-xs font-bold uppercase tracking-wider', finalColor)}>{finalLabel}</span>
        <span className={cn('text-lg font-bold', finalColor)}>
          {finalPrice != null
            ? finalPrice < 0
              ? `+$${Math.abs(finalPrice).toFixed(2)}`
              : finalPrice === 0
              ? 'FREE'
              : `$${finalPrice.toFixed(2)}`
            : '—'}
        </span>
      </div>
    </div>
  )
}
