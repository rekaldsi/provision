import { useState, useEffect } from 'react'
import { Package, Plus, AlertTriangle, Trash2, Archive, Thermometer, Star } from 'lucide-react'

const API = '/api'

interface PantryItem {
  id: string
  item_name: string
  item_brand?: string
  category?: string
  quantity: number
  unit?: string
  location: string
  expiry_date?: string
  purchase_date?: string
  purchase_price?: number
  store_name?: string
  notes?: string
  reorder_threshold?: number
  is_long_term_storage: boolean
  shelf_life_months?: number
}

const LOCATIONS = [
  { value: 'pantry', label: '🗄️ Pantry', color: 'text-amber-400' },
  { value: 'freezer', label: '🧊 Freezer', color: 'text-blue-400' },
  { value: 'fridge', label: '🌡️ Fridge', color: 'text-cyan-400' },
  { value: 'long_term', label: '📦 Long-Term', color: 'text-purple-400' },
  { value: 'garage', label: '🏠 Garage', color: 'text-orange-400' },
]

function getDaysUntilExpiry(dateStr?: string): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function ExpiryBadge({ date }: { date?: string }) {
  if (!date) return null
  const days = getDaysUntilExpiry(date)
  if (days == null) return null

  if (days < 0) return <span className="text-xs text-red-400 font-medium">EXPIRED</span>
  if (days <= 7) return <span className="text-xs text-red-400 font-medium">Exp {days}d</span>
  if (days <= 30) return <span className="text-xs text-yellow-400 font-medium">Exp {days}d</span>
  return <span className="text-xs text-provision-dim">Exp {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
}

function LocationBadge({ location }: { location: string }) {
  const loc = LOCATIONS.find(l => l.value === location) || LOCATIONS[0]
  return <span className={`text-xs ${loc.color}`}>{loc.label}</span>
}

function PantryItemRow({ item, onDelete, onAdjust }: {
  item: PantryItem
  onDelete: (id: string) => void
  onAdjust: (id: string, qty: number) => void
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-provision-border last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <LocationBadge location={item.location} />
          <ExpiryBadge date={item.expiry_date} />
          {item.is_long_term_storage && (
            <span className="text-xs text-purple-400 font-medium">🔒 Long-Term</span>
          )}
        </div>
        <p className="text-sm font-medium text-provision-text truncate">{item.item_name}</p>
        {item.item_brand && <p className="text-xs text-provision-dim">{item.item_brand}</p>}
      </div>

      {/* Quantity controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => onAdjust(item.id, Math.max(0, item.quantity - 1))}
          className="w-6 h-6 rounded-md bg-provision-muted text-provision-dim hover:text-provision-text flex items-center justify-center text-sm transition-colors"
        >−</button>
        <span className="text-sm font-semibold text-provision-text min-w-[1.5rem] text-center">
          {item.quantity}{item.unit ? ` ${item.unit}` : ''}
        </span>
        <button
          onClick={() => onAdjust(item.id, item.quantity + 1)}
          className="w-6 h-6 rounded-md bg-provision-muted text-provision-dim hover:text-provision-text flex items-center justify-center text-sm transition-colors"
        >+</button>
        <button
          onClick={() => onDelete(item.id)}
          className="ml-1 text-provision-muted hover:text-red-400 transition-colors p-0.5"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

export function Pantry() {
  const [items, setItems] = useState<PantryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all' | 'expiring' | 'long_term' | 'add'>('all')
  const [locationFilter, setLocationFilter] = useState<string | null>(null)

  // Add form state
  const [addName, setAddName] = useState('')
  const [addBrand, setAddBrand] = useState('')
  const [addQty, setAddQty] = useState('1')
  const [addUnit, setAddUnit] = useState('')
  const [addLocation, setAddLocation] = useState('pantry')
  const [addExpiry, setAddExpiry] = useState('')
  const [addLongTerm, setAddLongTerm] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchPantry() }, [])

  async function fetchPantry() {
    setLoading(true)
    try {
      const r = await fetch(`${API}/pantry`)
      const d = await r.json()
      setItems(d.items || [])
    } catch { /* noop */ }
    setLoading(false)
  }

  async function addItem() {
    if (!addName.trim()) return
    setSaving(true)
    await fetch(`${API}/pantry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_name: addName,
        item_brand: addBrand || undefined,
        quantity: parseFloat(addQty) || 1,
        unit: addUnit || undefined,
        location: addLocation,
        expiry_date: addExpiry || undefined,
        is_long_term_storage: addLongTerm,
      }),
    })
    setAddName(''); setAddBrand(''); setAddQty('1'); setAddUnit(''); setAddExpiry(''); setAddLongTerm(false)
    setSaving(false)
    fetchPantry()
    setTab('all')
  }

  async function deleteItem(id: string) {
    await fetch(`${API}/pantry/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function adjustQty(id: string, qty: number) {
    if (qty === 0) {
      deleteItem(id)
      return
    }
    await fetch(`${API}/pantry/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: qty }),
    })
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i))
  }

  // Filter views
  const expiringItems = items.filter(i => {
    const days = getDaysUntilExpiry(i.expiry_date)
    return days != null && days <= 30
  }).sort((a, b) => {
    const da = getDaysUntilExpiry(a.expiry_date) ?? 9999
    const db = getDaysUntilExpiry(b.expiry_date) ?? 9999
    return da - db
  })

  const longTermItems = items.filter(i => i.is_long_term_storage || i.location === 'long_term')

  const filteredItems = locationFilter
    ? items.filter(i => i.location === locationFilter)
    : items

  // Group by location
  const byLocation = LOCATIONS.reduce<Record<string, PantryItem[]>>((acc, loc) => {
    acc[loc.value] = items.filter(i => i.location === loc.value)
    return acc
  }, {})

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Package size={18} className="text-provision-savings" />
          <h1 className="text-xl font-bold text-provision-text">Pantry</h1>
          <span className="px-2 py-0.5 bg-provision-surface border border-provision-border rounded-full text-xs text-provision-dim">{items.length} items</span>
        </div>
        <p className="text-provision-dim text-sm">Track what you have. Waste less. Buy only what you need.</p>
      </div>

      {/* Expiring soon alert */}
      {expiringItems.length > 0 && (
        <div className="bg-red-900/20 border border-red-700/40 rounded-lg p-3 flex items-center gap-3">
          <AlertTriangle size={16} className="text-red-400 shrink-0" />
          <div>
            <p className="text-red-400 text-sm font-medium">{expiringItems.length} item{expiringItems.length > 1 ? 's' : ''} expiring within 30 days</p>
            <p className="text-xs text-provision-dim">Use first or consider donating</p>
          </div>
          <button onClick={() => setTab('expiring')} className="ml-auto text-xs text-red-400 hover:text-red-300">View →</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-provision-surface rounded-lg p-1 border border-provision-border">
        {[
          { value: 'all', label: `All (${items.length})` },
          { value: 'expiring', label: `⚠️ Expiring (${expiringItems.length})` },
          { value: 'long_term', label: `📦 Long-Term (${longTermItems.length})` },
          { value: 'add', label: '+ Add' },
        ].map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value as typeof tab)}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === t.value ? 'bg-provision-muted text-provision-text' : 'text-provision-dim hover:text-provision-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Add Item Tab */}
      {tab === 'add' && (
        <div className="bg-provision-surface border border-provision-border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-provision-text text-sm">Add to Pantry</h3>
          <input
            className="w-full bg-[#0a0a0a] border border-provision-border rounded-lg px-3 py-2 text-sm text-provision-text placeholder:text-provision-dim focus:outline-none focus:border-provision-savings"
            placeholder="Item name *"
            value={addName}
            onChange={e => setAddName(e.target.value)}
          />
          <input
            className="w-full bg-[#0a0a0a] border border-provision-border rounded-lg px-3 py-2 text-sm text-provision-text placeholder:text-provision-dim focus:outline-none focus:border-provision-savings"
            placeholder="Brand (optional)"
            value={addBrand}
            onChange={e => setAddBrand(e.target.value)}
          />
          <div className="flex gap-2">
            <input
              className="w-20 bg-[#0a0a0a] border border-provision-border rounded-lg px-3 py-2 text-sm text-provision-text placeholder:text-provision-dim focus:outline-none focus:border-provision-savings"
              placeholder="Qty"
              value={addQty}
              onChange={e => setAddQty(e.target.value)}
            />
            <input
              className="flex-1 bg-[#0a0a0a] border border-provision-border rounded-lg px-3 py-2 text-sm text-provision-text placeholder:text-provision-dim focus:outline-none focus:border-provision-savings"
              placeholder="Unit (lbs, oz, cans...)"
              value={addUnit}
              onChange={e => setAddUnit(e.target.value)}
            />
          </div>
          <select
            value={addLocation}
            onChange={e => setAddLocation(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-provision-border rounded-lg px-3 py-2 text-sm text-provision-text focus:outline-none focus:border-provision-savings"
          >
            {LOCATIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
          <input
            type="date"
            className="w-full bg-[#0a0a0a] border border-provision-border rounded-lg px-3 py-2 text-sm text-provision-text focus:outline-none focus:border-provision-savings"
            placeholder="Expiry date (optional)"
            value={addExpiry}
            onChange={e => setAddExpiry(e.target.value)}
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={addLongTerm}
              onChange={e => setAddLongTerm(e.target.checked)}
              className="rounded border-provision-border"
            />
            <span className="text-sm text-provision-dim">📦 Long-term storage (mylar bag / sealed bucket)</span>
          </label>
          <button
            onClick={addItem}
            disabled={!addName.trim() || saving}
            className="w-full py-2.5 bg-provision-savings text-black font-semibold rounded-lg text-sm disabled:opacity-50 hover:bg-green-300 transition-colors"
          >
            {saving ? 'Adding...' : 'Add to Pantry'}
          </button>
        </div>
      )}

      {/* Expiring Tab */}
      {tab === 'expiring' && (
        <div>
          {expiringItems.length === 0 ? (
            <div className="text-center py-10">
              <Star size={28} className="text-provision-muted mx-auto mb-2" />
              <p className="text-provision-dim text-sm">No items expiring within 30 days 🎉</p>
            </div>
          ) : (
            <div className="bg-provision-surface border border-provision-border rounded-xl px-4 divide-y divide-provision-border">
              {expiringItems.map(item => (
                <PantryItemRow key={item.id} item={item} onDelete={deleteItem} onAdjust={adjustQty} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Long Term Tab */}
      {tab === 'long_term' && (
        <div>
          {longTermItems.length === 0 ? (
            <div className="text-center py-10">
              <Archive size={28} className="text-provision-muted mx-auto mb-2" />
              <p className="text-provision-dim text-sm">No long-term storage items tracked yet</p>
            </div>
          ) : (
            <div className="bg-provision-surface border border-provision-border rounded-xl px-4 divide-y divide-provision-border">
              {longTermItems.map(item => (
                <PantryItemRow key={item.id} item={item} onDelete={deleteItem} onAdjust={adjustQty} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Items Tab */}
      {tab === 'all' && (
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-provision-surface rounded-lg animate-pulse" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-10">
              <Package size={32} className="text-provision-muted mx-auto mb-3" />
              <p className="text-provision-dim text-sm">Your pantry is empty</p>
              <button onClick={() => setTab('add')} className="mt-3 px-4 py-2 bg-provision-savings text-black font-semibold rounded-lg text-sm hover:bg-green-300 transition-colors">
                Add First Item
              </button>
            </div>
          ) : (
            <>
              {/* Location filter chips */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
                <button
                  onClick={() => setLocationFilter(null)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${!locationFilter ? 'bg-provision-savings/20 border-provision-savings text-provision-savings' : 'bg-provision-surface border-provision-border text-provision-dim'}`}
                >All</button>
                {LOCATIONS.filter(l => (byLocation[l.value] || []).length > 0).map(l => (
                  <button
                    key={l.value}
                    onClick={() => setLocationFilter(l.value === locationFilter ? null : l.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${locationFilter === l.value ? 'bg-provision-savings/20 border-provision-savings text-provision-savings' : 'bg-provision-surface border-provision-border text-provision-dim'}`}
                  >
                    {l.label} {(byLocation[l.value] || []).length > 0 && `(${(byLocation[l.value] || []).length})`}
                  </button>
                ))}
              </div>

              <div className="bg-provision-surface border border-provision-border rounded-xl px-4 divide-y divide-provision-border">
                {filteredItems.map(item => (
                  <PantryItemRow key={item.id} item={item} onDelete={deleteItem} onAdjust={adjustQty} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
