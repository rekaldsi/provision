import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react'
import { getShoppingPlan, type ShoppingPlanTrip } from '@/lib/api'

interface CouponItem {
  storeName: string
  itemName: string
  itemBrand?: string
  discountAmount: number
  salePrice?: number
  couponTypeLabel: string
  couponDeepLink: string | null
  dealId?: string
}

const KROGER_FAMILY = ['jewel', 'mariano', "pick 'n save", 'kroger', 'fred meyer', 'king soopers', 'ralphs']

function getCouponTypeLabel(storeName: string, itemName: string): string {
  const store = storeName.toLowerCase()
  if (store.includes('target')) return 'Digital Clip'
  if (KROGER_FAMILY.some(k => store.includes(k))) return 'Digital Clip'
  if (itemName.toLowerCase().includes('final price with card')) return 'Loyalty Card Price'
  return 'Show at Register'
}

function getCouponDeepLink(storeName: string): string | null {
  const store = storeName.toLowerCase()
  if (KROGER_FAMILY.some(k => store.includes(k))) {
    return 'https://www.kroger.com/savings/cl/promotions/'
  }
  return null
}

function buildCoupons(trips: ShoppingPlanTrip[]): CouponItem[] {
  const coupons: CouponItem[] = []
  for (const trip of trips) {
    for (const item of trip.items) {
      if (item.savings_total && item.savings_total > 0) {
        coupons.push({
          storeName: trip.store_name,
          itemName: item.item_name,
          itemBrand: item.item_brand,
          discountAmount: item.savings_total,
          salePrice: item.final_price,
          couponTypeLabel: getCouponTypeLabel(trip.store_name, item.item_name),
          couponDeepLink: getCouponDeepLink(trip.store_name),
          dealId: item.deal_id,
        })
      }
    }
  }
  return coupons
}

export function Checkout() {
  const [coupons, setCoupons] = useState<CouponItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [done, setDone] = useState(false)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    getShoppingPlan()
      .then(plan => setCoupons(buildCoupons(plan.plan)))
      .catch(console.error)
      .finally(() => setLoading(false))

    // Request WakeLock to keep screen on during checkout
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen')
        .then(lock => { wakeLockRef.current = lock })
        .catch(() => {/* wakeLock not supported or denied */})
    }

    return () => {
      wakeLockRef.current?.release()
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-provision-dim text-sm">Loading your coupons...</p>
      </div>
    )
  }

  if (coupons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <p className="text-provision-dim">No coupons — add items to your list first.</p>
        <Link to="/shopping-plan" className="text-emerald-400 text-sm underline">Back to Shopping Plan</Link>
      </div>
    )
  }

  if (done) {
    const totalSavings = coupons.reduce((sum, c) => sum + c.discountAmount, 0)
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center gap-6 px-4">
        <CheckCircle size={64} className="text-emerald-400" />
        <div>
          <h1 className="text-2xl font-bold text-provision-text mb-2">Done!</h1>
          <p className="text-lg font-semibold text-emerald-400">
            Estimated savings: ${totalSavings.toFixed(2)}
          </p>
        </div>
        <Link
          to="/shopping-plan"
          className="px-8 py-3 bg-emerald-500 text-black font-semibold rounded-full text-base"
        >
          Back to List
        </Link>
      </div>
    )
  }

  const coupon = coupons[currentIndex]
  const isLast = currentIndex === coupons.length - 1

  const handleNext = () => {
    if (isLast) {
      setDone(true)
    } else {
      setCurrentIndex(i => i + 1)
    }
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <Link to="/shopping-plan" className="text-provision-dim hover:text-provision-text">
          <ArrowLeft size={20} />
        </Link>
        <span className="text-xs text-provision-dim">
          Coupon {currentIndex + 1} of {coupons.length}
        </span>
        <div className="w-6" />
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-provision-surface rounded-full mb-5 overflow-hidden">
        <div
          className="h-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / coupons.length) * 100}%` }}
        />
      </div>

      {/* Coupon card */}
      <div className="flex-1 flex flex-col border border-provision-border rounded-2xl p-6 gap-4 bg-provision-surface">
        {/* Store */}
        <p className="text-2xl font-bold text-provision-text leading-tight">{coupon.storeName}</p>

        {/* Product */}
        <div>
          {coupon.itemBrand && (
            <p className="text-sm text-provision-dim">{coupon.itemBrand}</p>
          )}
          <p className="text-base text-provision-text">{coupon.itemName}</p>
        </div>

        {/* Discount — big */}
        <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
          <p className="text-5xl font-bold text-emerald-400 leading-none">
            ${coupon.discountAmount.toFixed(2)} OFF
          </p>
          {coupon.salePrice != null && coupon.salePrice > 0 && (
            <p className="text-lg text-provision-dim mt-3">Sale: ${coupon.salePrice.toFixed(2)}</p>
          )}
        </div>

        {/* Coupon type badge */}
        <div>
          <span className="inline-block px-3 py-1 bg-provision-muted border border-provision-border rounded-full text-xs text-provision-dim">
            {coupon.couponTypeLabel}
          </span>
        </div>

        {/* Action */}
        {coupon.couponDeepLink ? (
          <a
            href={coupon.couponDeepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-emerald-500 text-black font-semibold rounded-xl text-center text-sm"
          >
            Open {coupon.storeName} App →
          </a>
        ) : (
          <div className="w-full py-4 border border-provision-border/60 rounded-xl text-center">
            <p className="text-sm text-provision-dim">Present this screen at checkout</p>
          </div>
        )}
      </div>

      {/* Next button */}
      <button
        onClick={handleNext}
        className="mt-4 w-full py-4 bg-emerald-500 text-black font-bold rounded-xl text-base flex items-center justify-center gap-2"
      >
        {isLast ? 'Finish' : <>Next <ArrowRight size={18} /></>}
      </button>
    </div>
  )
}
