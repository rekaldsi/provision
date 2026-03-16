import { useState, useEffect } from 'react'
import { ShoppingBag, Plus, ExternalLink, TrendingDown, Trash2, Star } from 'lucide-react'

const API = '/api'

interface WatchlistItem {
  id: string
  asin?: string
  item_name: string
  target_price?: number
  current_price?: number
  all_time_low?: number
  camel_url?: string
  amazon_url?: string
  category?: string
  is_subscribe_save: boolean
  notes?: string
}

export function Amazon() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addName, setAddName] = useState('')
  const [addAsin, setAddAsin] = useState('')
  const [addTarget, setAddTarget] = useState('')
  const [addCategory, setAddCategory] = useState('')
  const [addSubscribeSave, setAddSubscribeSave] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchItems() }, [])

  async function fetchItems() {
    setLoading(true)
    try {
      const r = await fetch(`${API}/amazon-watchlist`)
      const d = await r.json()
      setItems(d.items || [])
    } catch { /* noop */ }
    setLoading(false)
  }

  async function addItem() {
    if (!addName.trim()) return
    setSaving(true)
    await fetch(`${API}/amazon-watchlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_name: addName,
        asin: addAsin || undefined,
        target_price: parseFloat(addTarget) || undefined,
        category: addCategory || undefined,
        is_subscribe_save: addSubscribeSave,
      }),
    })
    setAddName(''); setAddAsin(''); setAddTarget(''); setAddCategory(''); setAddSubscribeSave(false)
    setSaving(false)
    setShowAdd(false)
    fetchItems()
  }

  async function deleteItem(id: string) {
    await fetch(`${API}/amazon-watchlist/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag size={18} className="text-provision-savings" />
            <h1 className="text-xl font-bold text-provision-text">Amazon Tracker</h1>
          </div>
          <p className="text-provision-dim text-sm">Track ASINs · Set price targets · Price history</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="p-2 bg-provision-savings/20 border border-provision-savings/40 rounded-lg text-provision-savings hover:bg-provision-savings/30 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* CamelCamelCamel tip */}
      <div className="bg-provision-surface border border-provision-border rounded-lg p-3">
        <p className="text-xs text-provision-dim">
          💡 <strong className="text-provision-text">Pro tip:</strong> For full price history, use{' '}
          <a href="https://camelcamelcamel.com" target="_blank" rel="noopener noreferrer" className="text-provision-savings hover:underline">CamelCamelCamel.com</a>{' '}
          or the{' '}
          <a href="https://keepa.com" target="_blank" rel="noopener noreferrer" className="text-provision-savings hover:underline">Keepa</a>{' '}
          browser extension. Add ASIN below to get direct links.
        </p>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-provision-surface border border-provision-border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-provision-text text-sm">Track New Item</h3>
          <input
            className="w-full bg-[#0a0a0a] border border-provision-border rounded-lg px-3 py-2 text-sm text-provision-text placeholder:text-provision-dim focus:outline-none focus:border-provision-savings"
            placeholder="Item name *"
            value={addName}
            onChange={e => setAddName(e.target.value)}
          />
          <input
            className="w-full bg-[#0a0a0a] border border-provision-border rounded-lg px-3 py-2 text-sm text-provision-text placeholder:text-provision-dim focus:outline-none focus:border-provision-savings font-mono"
            placeholder="ASIN (e.g. B08N5WRWNW) — optional"
            value={addAsin}
            onChange={e => setAddAsin(e.target.value)}
          />
          <div className="flex gap-2">
            <input
              className="flex-1 bg-[#0a0a0a] border border-provision-border rounded-lg px-3 py-2 text-sm text-provision-text placeholder:text-provision-dim focus:outline-none focus:border-provision-savings"
              placeholder="Target price $"
              value={addTarget}
              onChange={e => setAddTarget(e.target.value)}
              type="number"
              step="0.01"
            />
            <input
              className="flex-1 bg-[#0a0a0a] border border-provision-border rounded-lg px-3 py-2 text-sm text-provision-text placeholder:text-provision-dim focus:outline-none focus:border-provision-savings"
              placeholder="Category"
              value={addCategory}
              onChange={e => setAddCategory(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={addSubscribeSave}
              onChange={e => setAddSubscribeSave(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-provision-dim">📦 Check Subscribe & Save price</span>
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAdd(false)}
              className="flex-1 py-2 border border-provision-border rounded-lg text-sm text-provision-dim hover:text-provision-text transition-colors"
            >Cancel</button>
            <button
              onClick={addItem}
              disabled={!addName.trim() || saving}
              className="flex-1 py-2 bg-provision-savings text-black font-semibold rounded-lg text-sm disabled:opacity-50 hover:bg-green-300 transition-colors"
            >
              {saving ? 'Adding...' : 'Track Item'}
            </button>
          </div>
        </div>
      )}

      {/* Watchlist */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-provision-surface rounded-lg animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-10">
          <ShoppingBag size={32} className="text-provision-muted mx-auto mb-3" />
          <p className="text-provision-dim text-sm">No items tracked yet</p>
          <p className="text-provision-dim text-xs mt-1">Add an ASIN to track price history</p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-3 px-4 py-2 bg-provision-savings text-black font-semibold rounded-lg text-sm hover:bg-green-300 transition-colors"
          >
            Track First Item
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Category: Electronics/Hobbyist */}
          <div className="bg-provision-surface border border-provision-border rounded-xl p-3 mb-2">
            <p className="text-xs text-provision-dim font-medium uppercase tracking-wide mb-2">🔌 Electronics Watchlist</p>
            <div className="flex flex-wrap gap-2">
              {['Raspberry Pi 5', 'ESP32', 'LoRa Module', 'RTL-SDR', 'Jackery Power Station', 'EcoFlow'].map(preset => (
                <button
                  key={preset}
                  onClick={() => { setAddName(preset); setShowAdd(true) }}
                  className="px-2 py-1 bg-provision-muted rounded-md text-xs text-provision-dim hover:text-provision-text transition-colors"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          {items.map(item => (
            <div key={item.id} className="bg-provision-surface border border-provision-border rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-provision-text text-sm leading-tight">{item.item_name}</p>
                  {item.asin && <p className="text-xs text-provision-dim font-mono mt-0.5">ASIN: {item.asin}</p>}
                  {item.category && <p className="text-xs text-provision-dim">{item.category}</p>}
                  {item.is_subscribe_save && <span className="text-xs text-blue-400">📦 Subscribe & Save</span>}

                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {item.target_price && (
                      <div className="flex items-center gap-1">
                        <Star size={11} className="text-yellow-400" />
                        <span className="text-xs text-yellow-400">Target: ${item.target_price.toFixed(2)}</span>
                      </div>
                    )}
                    {item.current_price && (
                      <span className="text-xs text-provision-text font-semibold">Current: ${item.current_price.toFixed(2)}</span>
                    )}
                    {item.all_time_low && (
                      <div className="flex items-center gap-1">
                        <TrendingDown size={11} className="text-provision-savings" />
                        <span className="text-xs text-provision-savings">ATL: ${item.all_time_low.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  {item.amazon_url && (
                    <a href={item.amazon_url} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 bg-provision-muted rounded-md text-provision-dim hover:text-provision-text transition-colors">
                      <ExternalLink size={13} />
                    </a>
                  )}
                  {item.camel_url && (
                    <a href={item.camel_url} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 bg-provision-muted rounded-md text-provision-savings hover:text-green-300 transition-colors text-xs font-medium text-center">
                      📈
                    </a>
                  )}
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="p-1.5 bg-provision-muted rounded-md text-provision-muted hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* CamelCamelCamel note */}
              {item.asin && !item.current_price && (
                <p className="text-xs text-provision-dim mt-2 pt-2 border-t border-provision-border">
                  Price history: <a href={item.camel_url || '#'} target="_blank" rel="noopener noreferrer" className="text-provision-savings hover:underline">View on CamelCamelCamel</a>
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
