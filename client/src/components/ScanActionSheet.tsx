import { X } from 'lucide-react'

type ScannedProduct = {
  name: string
  brand?: string
  size?: string
  category?: string
  image_url?: string
} | null

interface ScanActionSheetProps {
  product: ScannedProduct
  upc: string
  onAddToPantry: () => void
  onAddToList: () => void
  onCompare: () => void
  onClose: () => void
}

export function ScanActionSheet({ product, upc, onAddToPantry, onAddToList, onCompare, onClose }: ScanActionSheetProps) {
  return (
    <div className="fixed inset-0 z-[75]">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl border-t border-provision-border bg-provision-surface p-4 shadow-xl animate-in slide-in-from-bottom duration-200">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {product ? (
              <>
                <p className="truncate text-base font-semibold text-provision-text">{product.name}</p>
                <p className="mt-1 text-xs text-provision-dim">
                  {[product.brand, product.size].filter(Boolean).join(' • ') || 'Scanned product'}
                </p>
              </>
            ) : (
              <>
                <p className="text-base font-semibold text-provision-text">Product not found</p>
                <p className="mt-1 text-xs text-provision-dim">Product not found — try scanning again</p>
              </>
            )}
            <p className="mt-1 text-[11px] text-provision-muted">UPC: {upc}</p>
          </div>

          {product?.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="h-14 w-14 rounded-lg border border-provision-border object-cover"
              loading="lazy"
            />
          ) : null}

          <button
            type="button"
            aria-label="Close actions"
            onClick={onClose}
            className="rounded-full border border-provision-border p-1.5 text-provision-dim"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2 pb-safe">
          <button
            type="button"
            onClick={onAddToPantry}
            className="w-full rounded-xl border border-provision-border bg-provision-bg px-4 py-3 text-left text-sm font-medium text-provision-text"
          >
            📦 Add to Pantry
          </button>
          <button
            type="button"
            onClick={onAddToList}
            className="w-full rounded-xl border border-provision-border bg-provision-bg px-4 py-3 text-left text-sm font-medium text-provision-text"
          >
            🛒 Add to Shopping List
          </button>
          <button
            type="button"
            onClick={onCompare}
            className="w-full rounded-xl border border-provision-border bg-provision-bg px-4 py-3 text-left text-sm font-medium text-provision-text"
          >
            💰 Compare Prices
          </button>
        </div>
      </div>
    </div>
  )
}
