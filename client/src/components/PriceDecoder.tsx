import { useState } from 'react'

type StoreName = 'Costco' | "Sam's Club" | 'Walmart' | 'Target'
type Confidence = 'high' | 'medium' | null

interface DecodeResult {
  store: string
  price: number
  ending: string
  signal: string | null
  action: string | null
  confidence: Confidence
  found: boolean
}

const STORES: StoreName[] = ['Costco', "Sam's Club", 'Walmart', 'Target']

function confidenceBadgeClass(confidence: Confidence) {
  if (confidence === 'high') {
    return 'bg-green-900/30 border-green-600 text-green-400'
  }

  if (confidence === 'medium') {
    return 'bg-yellow-900/30 border-yellow-600 text-yellow-300'
  }

  return 'bg-provision-surface border-provision-border text-provision-dim'
}

export function PriceDecoder() {
  const [store, setStore] = useState<StoreName>('Costco')
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DecodeResult | null>(null)

  async function handleDecode() {
    const numeric = Number(price)
    if (!Number.isFinite(numeric)) return

    setLoading(true)
    try {
      const response = await fetch('/api/decode-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store, price: numeric }),
      })

      const payload = (await response.json()) as DecodeResult
      setResult(payload)
    } catch {
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-xl border border-provision-border bg-provision-surface p-4 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-provision-text">Price Signal Decoder</h2>
        <p className="text-xs text-provision-dim">Decode store-specific price endings instantly.</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STORES.map((storeOption) => (
          <button
            key={storeOption}
            type="button"
            onClick={() => setStore(storeOption)}
            className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              store === storeOption
                ? 'bg-provision-savings/20 border-provision-savings text-provision-savings'
                : 'bg-provision-bg border-provision-border text-provision-dim hover:text-provision-text'
            }`}
          >
            {storeOption}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="$0.00"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="flex-1 bg-provision-bg border border-provision-border rounded-lg px-3 py-2.5 text-sm text-provision-text placeholder:text-provision-dim focus:outline-none focus:border-provision-savings"
        />
        <button
          type="button"
          onClick={handleDecode}
          disabled={loading || price.trim() === ''}
          className="rounded-lg px-4 py-2.5 text-sm font-semibold bg-provision-savings text-black disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Decoding...' : 'Decode'}
        </button>
      </div>

      {result && (
        <div className="rounded-lg border border-provision-border bg-provision-bg p-3">
          {result.found ? (
            <div className="space-y-2">
              <p className="text-sm text-provision-text"><span className="text-provision-dim">Signal:</span> {result.signal}</p>
              <p className="text-sm text-provision-text"><span className="text-provision-dim">Action:</span> {result.action}</p>
              <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold uppercase ${confidenceBadgeClass(result.confidence)}`}>
                {result.confidence} confidence
              </span>
            </div>
          ) : (
            <p className="text-sm text-provision-dim">No signal found for this price ending at {store}</p>
          )}
        </div>
      )}
    </section>
  )
}
