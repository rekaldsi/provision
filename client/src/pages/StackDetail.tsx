import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Store } from 'lucide-react'
import { getItems, getStores, calculateStack, type Item, type Store as StoreType, type StackResult } from '@/lib/api'
import { StackBreakdown } from '@/components/StackBreakdown'
import { StoreBadge } from '@/components/StoreBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPrice } from '@/lib/utils'

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
    // Sort by final price
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
                  <div className="flex items-center justify-between gap-3">
                    <StoreBadge name={stack.store_name} />
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
