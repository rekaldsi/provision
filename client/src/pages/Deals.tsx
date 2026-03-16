import { useEffect, useState } from 'react'
import { Search, Tag, Leaf, Zap, Star } from 'lucide-react'
import { getDeals, getStores, type Deal, type Store } from '@/lib/api'
import { DealCard } from '@/components/DealCard'

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'food', label: '🥩 Food' },
  { value: 'household', label: '🧹 Household' },
  { value: 'personal_care', label: '🧴 Personal Care' },
  { value: 'pharmacy', label: '💊 Pharmacy' },
  { value: 'home_improvement', label: '🔨 Home Imp.' },
  { value: 'auto', label: '🚗 Auto' },
]

function ChipFilter({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
        active
          ? 'bg-provision-savings/20 border-provision-savings text-provision-savings'
          : 'bg-provision-surface border-provision-border text-provision-dim hover:text-provision-text'
      }`}
    >
      {label}
    </button>
  )
}

export function Deals() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [search, setSearch] = useState('')
  const [storeFilter, setStoreFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [qualityOnly, setQualityOnly] = useState(false)
  const [hotOnly, setHotOnly] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (storeFilter !== 'all') params.store_id = storeFilter
      if (categoryFilter !== 'all') params.category = categoryFilter
      if (search) params.search = search
      if (qualityOnly) params.quality_min = '7'
      if (hotOnly) params.exclude_junk = 'true'

      const q = new URLSearchParams(params)
      const [dealsRes, storesRes] = await Promise.all([
        fetch(`/api/deals${q.toString() ? '?' + q : ''}`).then(r => r.json()),
        getStores(),
      ])
      setDeals(dealsRes.deals || [])
      setStores(storesRes.stores)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [storeFilter, categoryFilter, qualityOnly, hotOnly])

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-provision-text">Deals</h1>
        <p className="text-xs text-provision-dim">{loading ? '...' : `${deals.length} active deals`}</p>
      </div>

      {/* Search */}
      <form onSubmit={e => { e.preventDefault(); load() }} className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-provision-dim" />
        <input
          className="w-full bg-provision-surface border border-provision-border rounded-lg pl-8 pr-20 py-2.5 text-sm text-provision-text placeholder:text-provision-dim focus:outline-none focus:border-provision-savings"
          placeholder="Search deals..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button
          type="submit"
          className="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-provision-savings text-black font-medium rounded-md text-xs hover:bg-green-300 transition-colors"
        >
          Search
        </button>
      </form>

      {/* Category chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {CATEGORIES.map(c => (
          <ChipFilter
            key={c.value}
            label={c.label}
            active={categoryFilter === c.value}
            onClick={() => setCategoryFilter(c.value)}
          />
        ))}
      </div>

      {/* Quality + filter toggles */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setQualityOnly(!qualityOnly)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            qualityOnly ? 'bg-green-900/30 border-green-600 text-green-400' : 'bg-provision-surface border-provision-border text-provision-dim hover:text-provision-text'
          }`}
        >
          <Leaf size={11} />
          Quality Foods Only
        </button>
        <button
          onClick={() => setHotOnly(!hotOnly)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            hotOnly ? 'bg-red-900/30 border-red-600 text-red-400' : 'bg-provision-surface border-provision-border text-provision-dim hover:text-provision-text'
          }`}
        >
          <Zap size={11} />
          No Junk Food
        </button>

        {/* Store select */}
        <select
          value={storeFilter}
          onChange={e => setStoreFilter(e.target.value)}
          className="px-3 py-1.5 rounded-full text-xs font-medium border bg-provision-surface border-provision-border text-provision-dim focus:outline-none focus:border-provision-savings"
        >
          <option value="all">All Stores</option>
          {stores.filter(s => s.type !== 'pharmacy').map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Deals list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-provision-surface animate-pulse" />
          ))}
        </div>
      ) : deals.length === 0 ? (
        <div className="text-center py-12 border border-provision-border rounded-lg">
          <Tag size={32} className="mx-auto mb-3 text-provision-muted" />
          <p className="text-sm text-provision-dim">No deals found</p>
          {(search || storeFilter !== 'all' || categoryFilter !== 'all' || qualityOnly || hotOnly) && (
            <button
              onClick={() => { setSearch(''); setStoreFilter('all'); setCategoryFilter('all'); setQualityOnly(false); setHotOnly(false) }}
              className="mt-2 text-xs text-provision-dim hover:text-provision-text"
            >
              Clear filters
            </button>
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
