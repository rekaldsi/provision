import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

interface BarcodeScannerProps {
  onResult: (upc: string) => void
  onClose: () => void
}

export function BarcodeScanner({ onResult, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const readerRef = useRef<{ reset: () => void } | null>(null)
  const hasResultRef = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const startScanner = async () => {
      try {
        const moduleName = '@zxing/library'
        const zxing = await import(/* @vite-ignore */ moduleName)
        if (!active) return

        const reader = new zxing.BrowserMultiFormatReader()
        readerRef.current = reader

        const videoEl = videoRef.current
        if (!videoEl) return

        await reader.decodeFromVideoDevice(null, videoEl, (result: { getText: () => string } | null) => {
          if (!active || !result || hasResultRef.current) return
          hasResultRef.current = true
          const text = result.getText()
          if (text) {
            onResult(text)
            reader.reset()
          }
        })
      } catch (err) {
        console.error('Barcode scanner failed:', err)
        setError('Camera unavailable or scanner dependency missing')
      }
    }

    startScanner()

    return () => {
      active = false
      readerRef.current?.reset()
      readerRef.current = null
      hasResultRef.current = false
    }
  }, [onResult])

  const close = () => {
    readerRef.current?.reset()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black">
      <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline />
      <div className="absolute inset-0 bg-black/45" />

      <button
        type="button"
        aria-label="Close scanner"
        onClick={close}
        className="absolute right-4 top-4 z-20 rounded-full bg-black/60 p-2 text-white"
      >
        <X size={20} />
      </button>

      <div className="absolute inset-0 z-10 flex items-center justify-center px-8">
        <div className="relative h-64 w-full max-w-xs rounded-xl border border-white/20 bg-transparent">
          <span className="absolute -left-0.5 -top-0.5 h-8 w-8 border-l-4 border-t-4 border-white" />
          <span className="absolute -right-0.5 -top-0.5 h-8 w-8 border-r-4 border-t-4 border-white" />
          <span className="absolute -bottom-0.5 -left-0.5 h-8 w-8 border-b-4 border-l-4 border-white" />
          <span className="absolute -bottom-0.5 -right-0.5 h-8 w-8 border-b-4 border-r-4 border-white" />
        </div>
      </div>

      <div className="absolute bottom-16 left-0 right-0 z-10 text-center">
        <p className="text-sm font-medium text-white">Scanning...</p>
        {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      </div>
    </div>
  )
}
