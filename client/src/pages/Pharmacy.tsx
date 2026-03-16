import { useState, useEffect } from 'react'
import { Search, Pill, CheckCircle, ExternalLink, ChevronDown, ChevronRight, AlertCircle, DollarSign } from 'lucide-react'

const API = '/api'

interface RxItem {
  id: string
  drug_name: string
  drug_generic?: string
  dosage?: string
  quantity: number
  form?: string
  notes?: string
}

interface RxPrice {
  source: string
  pharmacy_name: string
  price: number | null
  coupon_url?: string
  url?: string
  quantity?: number
  note?: string
  advantage?: string
  price_90_day?: number
  dosages_covered?: string[]
  is_on_walmart_list?: boolean
}

interface RxComparison {
  drug_name: string
  prices: RxPrice[]
  warehouse_notes: RxPrice[]
  cheapest: RxPrice | null
  walmart_generic: RxPrice | null
  on_walmart_4_list: boolean
  comparison_note: string
  goodrx_url: string
  costplus_url: string
}

interface WalmartGeneric {
  drug: string
  dosages: string[]
  qty30: number
  qty90: number
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  goodrx: { label: 'GoodRx', color: '#00B386' },
  costplus: { label: 'Cost Plus Drugs', color: '#1DA1F2' },
  walmart_generic_list: { label: 'Walmart $4 Generic', color: '#0071CE' },
  warehouse_note: { label: 'Warehouse Pharmacy', color: '#E5A823' },
}

function PriceSourceBadge({ source }: { source: string }) {
  const info = SOURCE_LABELS[source] || { label: source, color: '#888' }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ backgroundColor: info.color + '22', color: info.color, border: `1px solid ${info.color}44` }}
    >
      {info.label}
    </span>
  )
}

function PriceCard({ price }: { price: RxPrice }) {
  return (
    <div className="bg-provision-surface border border-provision-border rounded-lg p-3 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <PriceSourceBadge source={price.source} />
          <span className="text-provision-dim text-xs truncate">{price.pharmacy_name}</span>
        </div>
        {price.price != null ? (
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-provision-savings">${price.price.toFixed(2)}</span>
            <span className="text-provision-dim text-xs">/{price.quantity || 30} pills</span>
            {price.price_90_day && (
              <span className="text-provision-dim text-xs ml-1">${price.price_90_day}/90-day</span>
            )}
          </div>
        ) : (
          <span className="text-provision-dim text-sm">Price varies — check site</span>
        )}
        {price.note && <p className="text-provision-dim text-xs mt-1">{price.note}</p>}
        {price.dosages_covered && (
          <p className="text-provision-dim text-xs mt-1">Dosages: {price.dosages_covered.join(', ')}</p>
        )}
      </div>
      {(price.coupon_url || price.url) && (
        <a
          href={price.coupon_url || price.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-provision-savings hover:text-green-300 transition-colors"
        >
          <ExternalLink size={16} />
        </a>
      )}
    </div>
  )
}

function WalmartGenericRow({ drug }: { drug: WalmartGeneric }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="border-b border-provision-border last:border-0">
      <button
        className="w-full flex items-center justify-between py-3 px-0 text-left hover:text-provision-savings transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <span className="font-medium text-sm text-provision-text">{drug.drug}</span>
          <span className="ml-3 text-xs text-provision-savings font-semibold">${drug.qty30}/mo · ${drug.qty90}/90-day</span>
        </div>
        {expanded ? <ChevronDown size={14} className="text-provision-dim" /> : <ChevronRight size={14} className="text-provision-dim" />}
      </button>
      {expanded && (
        <div className="pb-3 text-xs text-provision-dim">
          Covered dosages: {drug.dosages.join(', ')}
        </div>
      )}
    </div>
  )
}

export function Pharmacy() {
  const [tab, setTab] = useState<'compare' | 'rx-list' | 'walmart'>('compare')
  const [searchDrug, setSearchDrug] = useState('')
  const [comparing, setComparing] = useState(false)
  const [comparison, setComparison] = useState<RxComparison | null>(null)
  const [rxList, setRxList] = useState<RxItem[]>([])
  const [walmartList, setWalmartList] = useState<WalmartGeneric[]>([])
  const [walmartSearch, setWalmartSearch] = useState('')
  const [addDrug, setAddDrug] = useState('')
  const [addDosage, setAddDosage] = useState('')
  const [addQty, setAddQty] = useState('30')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    fetchRxList()
    fetchWalmartList()
  }, [])

  async function fetchRxList() {
    const r = await fetch(`${API}/rx-list`)
    const d = await r.json()
    setRxList(d.rx_list || [])
  }

  async function fetchWalmartList(search = '') {
    const url = search ? `${API}/pharmacy/walmart-generics?search=${encodeURIComponent(search)}` : `${API}/pharmacy/walmart-generics`
    const r = await fetch(url)
    const d = await r.json()
    setWalmartList(d.generics || [])
  }

  async function comparePrices(drugName: string) {
    if (!drugName.trim()) return
    setComparing(true)
    setComparison(null)
    try {
      const r = await fetch(`${API}/pharmacy/prices?drug=${encodeURIComponent(drugName)}`)
      const d = await r.json()
      setComparison(d)
    } catch {
      // handle error
    }
    setComparing(false)
  }

  async function addToRxList() {
    if (!addDrug.trim()) return
    setAdding(true)
    await fetch(`${API}/rx-list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drug_name: addDrug, dosage: addDosage, quantity: parseInt(addQty) || 30 }),
    })
    setAddDrug('')
    setAddDosage('')
    setAdding(false)
    fetchRxList()
  }

  async function deleteRx(id: string) {
    await fetch(`${API}/rx-list/${id}`, { method: 'DELETE' })
    setRxList(prev => prev.filter(r => r.id !== id))
  }

  const filteredWalmart = walmartList.filter(d =>
    !walmartSearch || d.drug.toLowerCase().includes(walmartSearch.toLowerCase())
  )

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Pill size={18} className="text-provision-savings" />
          <h1 className="text-xl font-bold text-provision-text">Pharmacy</h1>
        </div>
        <p className="text-provision-dim text-sm">Compare Rx prices. Never overpay for prescriptions.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-provision-surface rounded-lg p-1 border border-provision-border">
        {(['compare', 'rx-list', 'walmart'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === t ? 'bg-provision-muted text-provision-text' : 'text-provision-dim hover:text-provision-text'
            }`}
          >
            {t === 'compare' ? 'Compare Prices' : t === 'rx-list' ? 'My Rx List' : 'Walmart $4 List'}
          </button>
        ))}
      </div>

      {/* Compare Prices Tab */}
      {tab === 'compare' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-provision-dim" />
              <input
                className="w-full bg-provision-surface border border-provision-border rounded-lg pl-8 pr-3 py-2.5 text-sm text-provision-text placeholder:text-provision-dim focus:outline-none focus:border-provision-savings"
                placeholder="Drug name (e.g. Metformin, Lisinopril)"
                value={searchDrug}
                onChange={e => setSearchDrug(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && comparePrices(searchDrug)}
              />
            </div>
            <button
              onClick={() => comparePrices(searchDrug)}
              disabled={comparing || !searchDrug.trim()}
              className="px-4 py-2 bg-provision-savings text-black font-semibold rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-300 transition-colors"
            >
              {comparing ? '...' : 'Compare'}
            </button>
          </div>

          {/* Quick searches */}
          <div className="flex flex-wrap gap-1.5">
            {['Metformin', 'Lisinopril', 'Atorvastatin', 'Levothyroxine', 'Metoprolol', 'Omeprazole'].map(drug => (
              <button
                key={drug}
                onClick={() => { setSearchDrug(drug); comparePrices(drug) }}
                className="px-2.5 py-1 bg-provision-surface border border-provision-border rounded-full text-xs text-provision-dim hover:text-provision-text hover:border-provision-savings transition-colors"
              >
                {drug}
              </button>
            ))}
          </div>

          {/* Comparison results */}
          {comparing && (
            <div className="text-center py-8 text-provision-dim text-sm">
              Checking GoodRx, Cost Plus Drugs, Walmart...
            </div>
          )}

          {comparison && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-provision-text">{comparison.drug_name}</h3>
                {comparison.on_walmart_4_list && (
                  <span className="px-2 py-0.5 bg-blue-900/40 border border-blue-700/40 text-blue-400 text-xs rounded-full font-medium">
                    Walmart $4 List ✓
                  </span>
                )}
              </div>

              {/* Best price banner */}
              {comparison.cheapest && (
                <div className="bg-provision-savings/10 border border-provision-savings/30 rounded-lg p-3 flex items-center gap-3">
                  <CheckCircle size={20} className="text-provision-savings shrink-0" />
                  <div>
                    <p className="text-provision-savings font-semibold text-sm">Best Price: ${comparison.cheapest.price?.toFixed(2)}/mo</p>
                    <p className="text-provision-dim text-xs">{comparison.cheapest.pharmacy_name}</p>
                  </div>
                </div>
              )}

              {/* Price cards */}
              <div className="space-y-2">
                {comparison.prices.map((p, i) => <PriceCard key={i} price={p} />)}
              </div>

              {/* Warehouse notes */}
              {comparison.warehouse_notes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-provision-dim font-medium uppercase tracking-wide">Warehouse Pharmacy Tips</p>
                  {comparison.warehouse_notes.map((n, i) => (
                    <div key={i} className="bg-provision-surface border border-yellow-900/40 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle size={12} className="text-yellow-500" />
                        <span className="text-yellow-500 text-xs font-medium">{n.pharmacy_name}</span>
                      </div>
                      <p className="text-provision-dim text-xs">{n.note}</p>
                      {n.url && (
                        <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-xs text-provision-savings hover:underline mt-1 inline-flex items-center gap-1">
                          Visit pharmacy <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* External links */}
              <div className="flex gap-2">
                <a
                  href={comparison.goodrx_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#00B38622] border border-[#00B38644] rounded-lg text-xs text-[#00B386] hover:bg-[#00B38633] transition-colors"
                >
                  <ExternalLink size={12} />
                  GoodRx Coupon
                </a>
                <a
                  href={comparison.costplus_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-900/20 border border-blue-700/30 rounded-lg text-xs text-blue-400 hover:bg-blue-900/30 transition-colors"
                >
                  <ExternalLink size={12} />
                  Cost Plus Drugs
                </a>
              </div>
            </div>
          )}

          {!comparing && !comparison && (
            <div className="text-center py-10">
              <DollarSign size={32} className="text-provision-muted mx-auto mb-3" />
              <p className="text-provision-dim text-sm">Search any prescription to compare prices</p>
              <p className="text-provision-dim text-xs mt-1">GoodRx · Cost Plus Drugs · Walmart $4 List</p>
            </div>
          )}
        </div>
      )}

      {/* Rx List Tab */}
      {tab === 'rx-list' && (
        <div className="space-y-3">
          <p className="text-provision-dim text-xs">Track your family's medications. Tap to compare prices anytime.</p>

          {/* Add form */}
          <div className="bg-provision-surface border border-provision-border rounded-lg p-3 space-y-2">
            <input
              className="w-full bg-[#0a0a0a] border border-provision-border rounded-lg px-3 py-2 text-sm text-provision-text placeholder:text-provision-dim focus:outline-none focus:border-provision-savings"
              placeholder="Drug name (generic preferred)"
              value={addDrug}
              onChange={e => setAddDrug(e.target.value)}
            />
            <div className="flex gap-2">
              <input
                className="flex-1 bg-[#0a0a0a] border border-provision-border rounded-lg px-3 py-2 text-sm text-provision-text placeholder:text-provision-dim focus:outline-none focus:border-provision-savings"
                placeholder="Dosage (e.g. 10mg)"
                value={addDosage}
                onChange={e => setAddDosage(e.target.value)}
              />
              <input
                className="w-16 bg-[#0a0a0a] border border-provision-border rounded-lg px-3 py-2 text-sm text-provision-text placeholder:text-provision-dim focus:outline-none focus:border-provision-savings"
                placeholder="Qty"
                value={addQty}
                onChange={e => setAddQty(e.target.value)}
              />
            </div>
            <button
              onClick={addToRxList}
              disabled={!addDrug.trim() || adding}
              className="w-full py-2 bg-provision-savings text-black font-semibold rounded-lg text-sm disabled:opacity-50 hover:bg-green-300 transition-colors"
            >
              Add to Rx List
            </button>
          </div>

          {/* Rx list */}
          <div className="space-y-2">
            {rxList.length === 0 && (
              <div className="text-center py-8">
                <Pill size={28} className="text-provision-muted mx-auto mb-2" />
                <p className="text-provision-dim text-sm">No medications tracked yet</p>
              </div>
            )}
            {rxList.map(rx => (
              <div key={rx.id} className="bg-provision-surface border border-provision-border rounded-lg p-3 flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-medium text-sm text-provision-text">{rx.drug_name}</p>
                  {(rx.dosage || rx.quantity) && (
                    <p className="text-xs text-provision-dim">
                      {rx.dosage && `${rx.dosage} · `}{rx.quantity} day supply
                    </p>
                  )}
                </div>
                <button
                  onClick={() => { setTab('compare'); setSearchDrug(rx.drug_name); comparePrices(rx.drug_name) }}
                  className="px-3 py-1.5 bg-provision-savings/10 border border-provision-savings/30 text-provision-savings rounded-md text-xs hover:bg-provision-savings/20 transition-colors"
                >
                  Compare
                </button>
                <button
                  onClick={() => deleteRx(rx.id)}
                  className="text-provision-muted hover:text-red-400 transition-colors p-1"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Walmart $4 List Tab */}
      {tab === 'walmart' && (
        <div className="space-y-3">
          <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3">
            <p className="text-blue-400 text-xs font-medium mb-1">Walmart Generic Rx Program</p>
            <p className="text-provision-dim text-xs">$4/30-day · $10/90-day for hundreds of generics. No membership required.</p>
            <a
              href="https://www.walmart.com/pharmacy/clinical-services/generic-drugs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:underline mt-1 inline-flex items-center gap-1"
            >
              Full list on Walmart.com <ExternalLink size={10} />
            </a>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-provision-dim" />
            <input
              className="w-full bg-provision-surface border border-provision-border rounded-lg pl-8 pr-3 py-2.5 text-sm text-provision-text placeholder:text-provision-dim focus:outline-none focus:border-provision-savings"
              placeholder="Search generics..."
              value={walmartSearch}
              onChange={e => setWalmartSearch(e.target.value)}
            />
          </div>

          <div className="bg-provision-surface border border-provision-border rounded-lg px-3 divide-y divide-provision-border">
            {filteredWalmart.length === 0 && (
              <div className="py-6 text-center text-provision-dim text-sm">No matches</div>
            )}
            {filteredWalmart.map((drug, i) => <WalmartGenericRow key={i} drug={drug} />)}
          </div>
        </div>
      )}
    </div>
  )
}
