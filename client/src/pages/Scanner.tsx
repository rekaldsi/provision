import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, CheckCircle2 } from 'lucide-react'
import { BarcodeScanner } from '@/components/BarcodeScanner'
import { ScanActionSheet } from '@/components/ScanActionSheet'

type ScanState = 'idle' | 'scanning' | 'found'

type ProductLookupResult = {
  name: string
  brand?: string
  size?: string
  category?: string
  image_url?: string
} | null

const API = '/api'

export function Scanner() {
  const navigate = useNavigate()
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [upc, setUpc] = useState('')
  const [product, setProduct] = useState<ProductLookupResult>(null)
  const [loadingLookup, setLoadingLookup] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const displayName = useMemo(() => product?.name || `UPC ${upc}`, [product, upc])

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2200)
  }

  const resetToIdle = () => {
    setScanState('idle')
    setProduct(null)
    setUpc('')
    setLoadingLookup(false)
  }

  const fetchLookup = async (nextUpc: string) => {
    setLoadingLookup(true)
    try {
      const res = await fetch(`${API}/product-lookup/${encodeURIComponent(nextUpc)}`)
      if (res.status === 404) {
        setProduct(null)
        return
      }
      if (!res.ok) throw new Error(`Lookup failed: ${res.status}`)
      const data = (await res.json()) as ProductLookupResult
      setProduct(data)
    } catch (err) {
      console.error(err)
      setProduct(null)
    } finally {
      setLoadingLookup(false)
    }
  }

  const handleScanResult = (scannedUpc: string) => {
    setUpc(scannedUpc)
    setScanState('found')
    void fetchLookup(scannedUpc)
  }

  const handleAddToPantry = async () => {
    const itemName = (product?.name || upc).trim()
    if (!itemName) return

    const payload = {
      item_name: itemName,
      quantity: 1,
      item_brand: product?.brand,
      category: product?.category,
      unit: product?.size,
    }

    const res = await fetch(`${API}/pantry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) throw new Error('Failed to add to pantry')
    showToast('Added to pantry')
    resetToIdle()
  }

  const handleAddToList = async () => {
    const itemName = (product?.name || upc).trim()
    if (!itemName) return

    const listPayload = { item_name: itemName }
    let res = await fetch(`${API}/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(listPayload),
    })

    if (res.status === 404 || res.status === 405) {
      res = await fetch(`${API}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: itemName, quantity: 1, brand: product?.brand, category: product?.category }),
      })
    }

    if (!res.ok) throw new Error('Failed to add to shopping list')
    showToast('Added to shopping list')
    resetToIdle()
  }

  const handleCompare = () => {
    const search = product?.name || upc
    navigate(`/deals?search=${encodeURIComponent(search)}`)
    resetToIdle()
  }

  const runAction = async (fn: () => Promise<void>) => {
    try {
      await fn()
    } catch (err) {
      console.error(err)
      showToast('Action failed')
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-9rem)] animate-fade-in">
      <div className="flex h-full min-h-[calc(100vh-9rem)] items-center justify-center">
        <button
          type="button"
          onClick={() => setScanState('scanning')}
          className="flex flex-col items-center gap-3 rounded-2xl border border-provision-border bg-provision-surface px-8 py-10"
        >
          <div className="rounded-full bg-provision-bg p-4">
            <Camera size={32} className="text-provision-text" />
          </div>
          <p className="text-sm font-semibold text-provision-text">Tap to Scan</p>
          <p className="text-xs text-provision-dim">Point camera at a barcode</p>
        </button>
      </div>

      {scanState === 'scanning' && (
        <BarcodeScanner onResult={handleScanResult} onClose={resetToIdle} />
      )}

      {scanState === 'found' && (
        <>
          <ScanActionSheet
            product={loadingLookup ? null : product}
            upc={upc}
            onAddToPantry={() => void runAction(handleAddToPantry)}
            onAddToList={() => void runAction(handleAddToList)}
            onCompare={handleCompare}
            onClose={resetToIdle}
          />
          {loadingLookup && (
            <div className="fixed inset-0 z-[76] flex items-center justify-center bg-black/40">
              <div className="rounded-lg border border-provision-border bg-provision-surface px-4 py-2 text-xs text-provision-dim">
                Looking up product...
              </div>
            </div>
          )}
        </>
      )}

      {scanState === 'idle' && upc && (
        <p className="mt-4 text-center text-xs text-provision-dim">Last scan: {displayName}</p>
      )}

      {toast && (
        <div className="pointer-events-none fixed left-1/2 top-4 z-[90] -translate-x-1/2 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-4 py-2 text-xs font-medium text-emerald-300">
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 size={13} /> {toast}
          </span>
        </div>
      )}
    </div>
  )
}
