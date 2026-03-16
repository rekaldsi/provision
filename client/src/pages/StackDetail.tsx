import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Store } from 'lucide-react'
import { getItems, getStores, calculateStack, type Item, type Store as StoreType, type StackResult } from '@/lib/api'
import { StackBreakdown } from '@/components/StackBreakdown'
import { StoreBadge } from '@/components/StoreBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { formatPrice } from '@/lib/utils'

// Parse size from item name — e.g. "Tide Pods 35ct", "Chicken 3 lb", "Juice 64 oz"
function parseSizeFromName(name: string): { label: string; oz: number | null } | null {
  const patterns: Array<{ re: RegExp; unit: string; toOz: ((v: number) => number) | null }> = [
    { re: /(\d+(?:\.\d+)?)\s*(?:fl\s*)?oz/i, unit: 'oz', toOz: (v) => v },
    { re: /(\d+(?:\.\d+)?)\s*lb/i, unit: 'lb', toOz: (v) => v * 16 },
    { re: /(\d+(?:\.\d+)?)\s*kg/i, unit: 'kg', toOz: (v) => v * 35.274 },
    { re: /(\d+(?:\.\d+)?)\s*g\b/i, unit: 'g', toOz: (v) => v / 28.35 },
    { re: /(\d+(?:\.\d+)?)\s*(?:ct|count|pk|pack)/i, unit: 'ct', toOz: null },
    { re: /(\d+(?:\.\d+)?)\s*ml/i, unit: 'ml', toOz: (v) => v / 29.57 },
    { re: /(\d+(?:\.\d+)?)\s*l(?:iter)?s?\b/i, unit: 'L', toOz: (v) => v * 33.81 },
  ]
  for (const { re, unit, toOz } of patterns) {
    const m = name.match(re)
    if (m) {
      const value = parseFloat(m[1])
      return { label: `${value} ${unit}`, oz: toOz ? toOz(value) : null }
    }
  }
  return null
}

function computeUnitPrice(price: number, itemName: string): string | null {
  const sizeInfo = parseSizeFromName(itemName)
  if (!sizeInfo) return null
  if (sizeInfo.oz !== null && sizeInfo.oz > 0) {
    return `$${(price / sizeInfo.oz).toFixed(2)}/oz`
  }
  const countMatch = itemName.match(/(\d+)\s*(?:ct|count|pk|pack)/i)
  if (countMatch) {
    const count = parseInt(countMatch[1])
    if (count > 0) return `$${(price / count).toFixed(3)}/ea`
  }
  return null
}

function ItemSizeUnitPrice({ itemName, price }: { itemName: string; price?: number }) {
  const sizeInfo = parseSizeFromName(itemName)
  const unitPrice = price != null && price > 0 ? computeUnitPrice(price, itemName) : null
  if (!sizeInfo && !unitPrice) return null
  return (
    <div className="flex items-center gap-2 flex-wrap mt-0.5">
      {sizeInfo && <span className="text-xs text-provision-dim">{sizeInfo.label}</span>}
      {unitPrice && <span className="text-xs text-provision-muted">· {unitPrice}</span>}
    </div>
  )
}

export function StackDetail() {
  const { itemId } = useParams<{ itemId: string }>()
  const [item, setItem] = useState<Item | null>(null)
  const [stores, setStores] = useState<StoreType[]>([])
  const [stacks, setStacks] = useState<StackResult[]>([])
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)

  useEffect(() => {
    if (!itemId) return
    Promise.all([getItems(), getStores()])
      .then(([itemsRes, storesRes]) => {
        const found = itemsRes.items.find((i) => i.id === itemId)
        setItem(found || null)
        setStores(storesRes.stores)
      })
      .finally(() => setLoading(false))
  }, [itemId])

  const runStacks = async () => {
    if (!item) return
    setCalculating(true)
    const results: StackResult[] = []
    for (const store of stores) {
      try {
        const stack = await calculateStack(item.name, store.id, item.id)
        if (stack.base_price != null) {
          results.push(stack)
        }
      } catch {
        // skip
      }
    }
    results.sort((a, b) => (a.final_price ?? 9999) - (b.final_price ?? 9999))
    setStacks(results)
    setCalculating(false)
  }

  useEffect(() => {
    if (item && stores.length > 0) {
      runStacks()
    }
  }, [item, stores.length])

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-6 w-32 bg-provision-surface rounded animate-pulse" />
        <div className="h-24 bg-provision-surface rounded-lg animate-pulse" />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <p className="text-provision-dim">Item not found</p>
        <Link to="/list">
          <Button variant="ghost" size="sm" className="mt-3">Back to list</Button>
        </Link>
      </div>
    )
  }

  const bestStack = stacks[0]

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Back nav */}
      <Link to="/list" className="inline-flex items-center gap-1.5 text-xs text-provision-dim hover:text-provision-text transition-colors">
        <ArrowLeft size={12} />
        My List
      </Link>

      {/* Item header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-provision-text">{item.name}</h1>
          {item.brand && <p className="text-sm text-provision-dim">{item.brand}</p>}
          <div className="flex items-center gap-2 mt-1">
            {item.category && (
              <span className="text-xs bg-provision-muted text-provision-dim px-1.5 py-0.5 rounded-sm">
                {item.category}
              </span>
            )}
            {item.unit && <span className="text-xs text-provision-dim">{item.unit}</span>}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={runStacks}
          disabled={calculating}
          className="gap-1.5"
        >
          <RefreshCw size={12} className={calculating ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      {/* Best deal highlight */}
      {bestStack && (
        <Card className={
          bestStack.is_profit ? 'border-amber-400/30 bg-amber-400/5' :
          bestStack.is_free ? 'border-green-400/30 bg-green-400/5' :
          bestStack.is_near_free ? 'border-yellow-400/30 bg-yellow-400/5' :
          'border-emerald-500/20'
        }>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-provision-dim uppercase tracking-wider mb-1">Best Stack</p>
                <StoreBadge name={bestStack.store_name} size="md" />
                {/* Brand + size + unit price */}
                <div className="mt-1.5">
                  {item.brand && (
                    <p className="text-xs text-provision-dim">{item.brand} · {bestStack.item_name}</p>
                  )}
                  <ItemSizeUnitPrice itemName={bestStack.item_name} price={bestStack.final_price} />
                </div>
                {bestStack.deal_id && (
                  <Link
                    to={`/deal/${bestStack.deal_id}`}
                    className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 mt-1"
                  >
                    View Deal →
                  </Link>
                )}
              </div>
              <div className="text-right">
                <p className={
                  'text-2xl font-bold ' + (
                    bestStack.is_profit ? 'text-amber-300' :
                    bestStack.is_free ? 'text-green-400' :
                    bestStack.is_near_free ? 'text-yellow-400' : 'text-emerald-400'
                  )
                }>
                  {bestStack.is_profit
                    ? `+$${Math.abs(bestStack.final_price!).toFixed(2)}`
                    : bestStack.final_price === 0 ? 'FREE'
                    : formatPrice(bestStack.final_price)}
                </p>
                {bestStack.savings_pct != null && (
                  <p className="text-xs text-provision-dim">{bestStack.savings_pct}% off</p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <StackBreakdown
              breakdown={bestStack.stack_breakdown}
              originalPrice={bestStack.original_price}
              finalPrice={bestStack.final_price}
              isFree={bestStack.is_free}
              isProfit={bestStack.is_profit}
              isNearFree={bestStack.is_near_free}
            />
          </CardContent>
        </Card>
      )}

      {/* All store stacks */}
      {stacks.length > 1 && (
        <section>
          <h2 className="text-xs font-semibold text-provision-dim uppercase tracking-wider mb-3">
            All Stores ({stacks.length})
          </h2>
          <div className="space-y-2">
            {stacks.map((stack, i) => (
              <Card key={stack.store_id + i} className="hover:border-white/10 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <StoreBadge name={stack.store_name} />
                      <ItemSizeUnitPrice itemName={stack.item_name} price={stack.final_price} />
                      {stack.deal_id && (
                        <Link
                          to={`/deal/${stack.deal_id}`}
                          className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 mt-0.5"
                        >
                          View Deal →
                        </Link>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={
                        'text-base font-bold ' + (
                          stack.is_profit ? 'text-amber-300' :
                          stack.is_free ? 'text-green-400' :
                          stack.is_near_free ? 'text-yellow-400' : 'text-emerald-400'
                        )
                      }>
                        {stack.is_profit
                          ? `+$${Math.abs(stack.final_price!).toFixed(2)}`
                          : stack.final_price === 0 ? 'FREE'
                          : formatPrice(stack.final_price)}
                      </p>
                      {stack.savings_total != null && stack.savings_total > 0 && (
                        <p className="text-xs text-provision-dim">save {formatPrice(stack.savings_total)}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* No deals */}
      {!calculating && stacks.length === 0 && (
        <div className="text-center py-12 border border-provision-border rounded-lg">
          <Store size={32} className="mx-auto mb-3 text-provision-muted" />
          <p className="text-sm text-provision-dim">No current deals found for this item</p>
          <p className="text-xs text-provision-muted mt-1">Check back as new deals are added daily</p>
        </div>
      )}

      {calculating && (
        <div className="text-center py-8 text-provision-dim text-sm">
          <RefreshCw size={18} className="mx-auto mb-2 animate-spin" />
          Calculating stacks across {stores.length} stores...
        </div>
      )}
    </div>
  )
}
