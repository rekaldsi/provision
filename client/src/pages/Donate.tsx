import { useState, useEffect } from 'react'
import { Heart, Plus, ExternalLink, Gift } from 'lucide-react'

const API = '/api'

interface Donation {
  id: string
  item_name: string
  quantity: number
  unit?: string
  retail_value?: number
  pantry_name?: string
  donation_date?: string
  notes?: string
}

// GCFD & Chicago pantry directory (static)
const CHICAGO_PANTRIES = [
  { name: 'Greater Chicago Food Depository', url: 'https://www.gcfd.org/find-food', desc: 'Main regional food bank — find local pantries' },
  { name: 'Common Pantry (Ravenswood)', url: 'https://commonpantry.org', desc: '3744 N. Damen Ave · Mon-Sat' },
  { name: 'Northwest Side Housing Center Food Pantry', url: 'https://www.nwshc.org', desc: 'Portage Park area' },
  { name: 'St. Ferdinand Parish Pantry', url: 'https://www.stferdinand.org', desc: '2818 N. Moody Ave' },
  { name: 'Cradles to Crayons', url: 'https://www.cradlestocrayons.org/chicago/', desc: 'Kids supplies + household items' },
]

export function Donate() {
  const [donations, setDonations] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addName, setAddName] = useState('')
  const [addQty, setAddQty] = useState('1')
  const [addUnit, setAddUnit] = useState('lbs')
  const [addRetailValue, setAddRetailValue] = useState('')
  const [addPantry, setAddPantry] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchDonations() }, [])

  async function fetchDonations() {
    setLoading(true)
    try {
      const r = await fetch(`${API}/donations`)
      const d = await r.json()
      setDonations(d.donations || [])
    } catch { /* noop */ }
    setLoading(false)
  }

  async function addDonation() {
    if (!addName.trim() || !addQty) return
    setSaving(true)
    await fetch(`${API}/donations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_name: addName,
        quantity: parseFloat(addQty),
        unit: addUnit || undefined,
        retail_value: parseFloat(addRetailValue) || undefined,
        pantry_name: addPantry || undefined,
        donation_date: new Date().toISOString().slice(0, 10),
      }),
    })
    setAddName(''); setAddQty('1'); setAddRetailValue(''); setAddPantry('')
    setSaving(false)
    setShowAdd(false)
    fetchDonations()
  }

  const totalLbs = donations.reduce((sum, d) => sum + (d.unit === 'lbs' ? d.quantity : 0), 0)
  const totalValue = donations.reduce((sum, d) => sum + (d.retail_value || 0), 0)

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Heart size={18} className="text-red-400" />
            <h1 className="text-xl font-bold text-provision-text">Donate Mode</h1>
          </div>
          <p className="text-provision-dim text-sm">Stack deep. Give back.</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="p-2 bg-red-900/30 border border-red-700/40 rounded-lg text-red-400 hover:bg-red-900/40 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Impact summary */}
      {(totalLbs > 0 || totalValue > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{totalLbs.toFixed(1)}</p>
            <p className="text-xs text-provision-dim">lbs donated</p>
          </div>
          <div className="bg-provision-savings/10 border border-provision-savings/30 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-provision-savings">${totalValue.toFixed(2)}</p>
            <p className="text-xs text-provision-dim">retail value</p>
          </div>
        </div>
      )}

      {/* Add donation */}
      {showAdd && (
        <div className="bg-provision-surface border border-provision-border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-provision-text text-sm">Log Donation</h3>
          <input
            className="w-full bg-[#0a0a0a] border border-provision-border rounded-lg px-3 py-2 text-sm text-provision-text placeholder:text-provision-dim focus:outline-none focus:border-provision-savings"
            placeholder="Item name *"
            value={addName}
            onChange={e => setAddName(e.target.value)}
          />
          <div className="flex gap-2">
            <input
              className="w-20 bg-[#0a0a0a] border border-provision-border rounded-lg px-3 py-2 text-sm text-provision-text placeholder:text-provision-dim focus:outline-none focus:border-provision-savings"
              placeholder="Qty"
              value={addQty}
              onChange={e => setAddQty(e.target.value)}
              type="number"
            />
            <select
              value={addUnit}
              onChange={e => setAddUnit(e.target.value)}
              className="flex-1 bg-[#0a0a0a] border border-provision-border rounded-lg px-3 py-2 text-sm text-provision-text focus:outline-none focus:border-provision-savings"
            >
              {['lbs', 'cans', 'boxes', 'bags', 'items'].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <input
              className="flex-1 bg-[#0a0a0a] border border-provision-border rounded-lg px-3 py-2 text-sm text-provision-text placeholder:text-provision-dim focus:outline-none focus:border-provision-savings"
              placeholder="$ value"
              value={addRetailValue}
              onChange={e => setAddRetailValue(e.target.value)}
              type="number"
              step="0.01"
            />
          </div>
          <input
            className="w-full bg-[#0a0a0a] border border-provision-border rounded-lg px-3 py-2 text-sm text-provision-text placeholder:text-provision-dim focus:outline-none focus:border-provision-savings"
            placeholder="Pantry / food bank name"
            value={addPantry}
            onChange={e => setAddPantry(e.target.value)}
          />
          <button
            onClick={addDonation}
            disabled={!addName.trim() || saving}
            className="w-full py-2.5 bg-red-600 text-white font-semibold rounded-lg text-sm disabled:opacity-50 hover:bg-red-500 transition-colors"
          >
            {saving ? 'Logging...' : '❤️ Log Donation'}
          </button>
        </div>
      )}

      {/* Chicago pantry directory */}
      <div className="bg-provision-surface border border-provision-border rounded-xl p-4">
        <p className="text-xs text-provision-dim uppercase tracking-wide font-medium mb-3">Chicago Pantry Directory</p>
        <div className="space-y-3">
          {CHICAGO_PANTRIES.map(pantry => (
            <div key={pantry.name} className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-provision-text">{pantry.name}</p>
                <p className="text-xs text-provision-dim">{pantry.desc}</p>
              </div>
              <a
                href={pantry.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-provision-savings hover:text-green-300 shrink-0 p-1"
              >
                <ExternalLink size={14} />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Donation history */}
      {donations.length > 0 && (
        <div>
          <p className="text-xs text-provision-dim uppercase tracking-wide font-medium mb-3">Donation History</p>
          <div className="bg-provision-surface border border-provision-border rounded-xl px-4 divide-y divide-provision-border">
            {donations.map(d => (
              <div key={d.id} className="py-3 flex items-center gap-3">
                <Gift size={14} className="text-red-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-provision-text">{d.item_name}</p>
                  <p className="text-xs text-provision-dim">
                    {d.quantity} {d.unit}
                    {d.pantry_name && ` → ${d.pantry_name}`}
                    {d.donation_date && ` · ${new Date(d.donation_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                  </p>
                </div>
                {d.retail_value && (
                  <span className="text-xs text-provision-savings shrink-0">${d.retail_value.toFixed(2)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && donations.length === 0 && !showAdd && (
        <div className="text-center py-10">
          <Heart size={32} className="text-provision-muted mx-auto mb-3" />
          <p className="text-provision-dim text-sm">No donations logged yet</p>
          <p className="text-provision-dim text-xs mt-1">Stack deals near free, donate the surplus</p>
        </div>
      )}
    </div>
  )
}
