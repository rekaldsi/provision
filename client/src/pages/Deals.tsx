import { useEffect, useState } from 'react'
import { Search, SlidersHorizontal, Tag } from 'lucide-react'
import { getDeals, getStores, type Deal, type Store } from '@/lib/api'
import { DealCard } from '@/components/DealCard'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'food', label: 'Food' },
  { value: 'household', label: 'Household' },
  { value: 'personal_care', label: 'Personal Care' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'home_improvement', label: 'Home Improvement' },
]

export function Deals() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [search, setSearch] = useState('')
  const [storeFilter, setStoreFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [dealsRes, storesRes] = await Promise.all([
        getDeals({
          store_id: storeFilter !== 'all' ? storeFilter : undefined,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
          search: search || undefined,
        }),
        getStores(),
      ])
      setDeals(dealsRes.deals)
      setStores(storesRes.stores)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [storeFilter, categoryFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    load()
  }

  const clearFilters = () => {
    setSearch('')
    setStoreFilter('all')
    setCategoryFilter('all')
  }

  const hasFilters = search || storeFilter !== 'all' || categoryFilter !== 'all'

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-provision-text">Deals</h1>
          <p className="text-xs text-provision-dim">{deals.length} active deals</p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <form onSubmit={handleSearch} className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-provision-dim" />
          <Input
            placeholder="Search deals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-16"
          />
          <Button type="submit" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7">
            Search
          </Button>
        </form>

        <div className="grid grid-cols-2 gap-2">
          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Stores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {stores.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-provision-dim">
            Clear filters
          </Button>
        )}
      </div>

      {/* Deals list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-provision-surface animate-pulse" />
          ))}
        </div>
      ) : deals.length === 0 ? (
        <div className="text-center py-12 border border-provision-border rounded-lg">
          <Tag size={32} className="mx-auto mb-3 text-provision-muted" />
          <p className="text-sm text-provision-dim">No deals found</p>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-2 text-xs">
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      )}
    </div>
  )
}
