import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ExternalLink, Tag, Zap, ShoppingCart, CheckCircle2 } from 'lucide-react'
import { cn, formatPrice, formatDiscount } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StoreBadge } from '@/components/StoreBadge'
import { addToListFromDeal, type Deal } from '@/lib/api'

const CATEGORY_LABELS: Record<string, string> = {
  food: 'Food',
  household: 'Household',
  home_improvement: 'Home Improvement',
  personal_care: 'Personal Care',
  pharmacy: 'Pharmacy',
  auto: 'Auto',
  electronics: 'Electronics',
  clothing: 'Clothing',
  garden: 'Garden',
  pet: 'Pet',
  baby: 'Baby',
  sports: 'Sports',
}

function formatCategory(cat: string): string {
  if (!cat) return ''
  // Handle dotted subcategory like "food.protein" → "Food › Protein"
  return cat.split('.').map(part =>
    CATEGORY_LABELS[part] ?? part.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  ).join(' › ')
}

/** Strip brand prefix from product name if it was accidentally duplicated by the scraper.
 *  e.g. brand="Bounty", name="BountyBounty Paper Towels" → "Bounty Paper Towels"
 *  Also removes leading brand repetition: "Bounty Bounty Paper Towels" → "Bounty Paper Towels"
 */
function dedupeProductName(name: string, brand?: string | null): string {
  if (!name) return name
  // Pattern 1: exact brand doubled without space — "BountyBounty" → "Bounty"
  if (brand) {
    const doubled = brand + brand
    if (name.startsWith(doubled)) {
      return brand + name.slice(doubled.length)
    }
    // Pattern 2: brand repeated with space — "Bounty Bounty Paper Towels"
    const doubledSpaced = brand + ' ' + brand
    if (name.toLowerCase().startsWith(doubledSpaced.toLowerCase())) {
      return name.slice(brand.length + 1)
    }
  }
  // Pattern 3: repeated word at start — "Canned Canned Tamales" → "Canned Tamales"
  const words = name.split(' ')
  const deduped: string[] = []
  for (let i = 0; i < words.length; i++) {
    if (i > 0 && words[i].toLowerCase() === words[i - 1].toLowerCase()) continue
    deduped.push(words[i])
  }
  return deduped.join(' ')
}

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
  const [added, setAdded] = useState(false)
  const [adding, setAdding] = useState(false)

  const daysLeft = getDaysUntil(deal.valid_until)
  const isExpiringSoon = daysLeft != null && daysLeft <= 2
  const discount = deal.discount_pct ? Math.round(deal.discount_pct) : null
  const tier = (deal as any).tier

  async function handleAddToList(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (adding || added) return
    setAdding(true)
    try {
      await addToListFromDeal(deal)
      setAdded(true)
      setTimeout(() => setAdded(false), 3000)
    } catch { /* noop */ }
    setAdding(false)
  }

  return (
    <Link to={`/deal/${deal.id}`} className="block">
      <Card className={cn('hover:border-white/10 transition-colors', className)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {deal.stores?.name && (
                  <StoreBadge name={deal.stores.name} chain={deal.stores.chain} />
                )}
                {!deal.stores?.name && deal.store_name && (
                  <StoreBadge name={deal.store_name} chain={deal.store_chain} />
                )}
                {deal.is_store_brand && (
                  <span className="text-xs text-violet-400 font-medium">Store Brand</span>
                )}
                {deal.category && (
                  <span className="text-xs text-provision-dim">{formatCategory(deal.category)}</span>
                )}
              </div>
              <p className="text-sm font-medium text-provision-text leading-tight">
                {deal.item_brand && (
                  <span className="text-provision-dim mr-1">{deal.item_brand}</span>
                )}
                {dedupeProductName(deal.item_name, deal.item_brand)}
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
                  onClick={e => e.stopPropagation()}
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
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1 text-xs text-provision-dim hover:text-provision-text transition-colors"
                >
                  {deal.source} <ExternalLink size={10} />
                </a>
              )}
            </div>
          </div>

          {/* Add to List chip */}
          <div className="mt-3 pt-2.5 border-t border-provision-border/50">
            <button
              onClick={handleAddToList}
              disabled={adding}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                added
                  ? 'bg-provision-savings/20 border-provision-savings text-provision-savings'
                  : 'bg-provision-surface border-provision-border text-provision-dim hover:text-provision-text hover:border-provision-savings/50'
              )}
            >
              {added ? (
                <><CheckCircle2 size={11} /> Added to list</>
              ) : (
                <><ShoppingCart size={11} /> {adding ? 'Adding...' : 'Add to List'}</>
              )}
            </button>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
