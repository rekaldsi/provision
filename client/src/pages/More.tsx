import { Link } from 'react-router-dom'
import { Package, Fuel, ShoppingBag, CalendarCheck, Heart, Map } from 'lucide-react'

const HUB_ITEMS = [
  {
    to: '/shopping-plan',
    icon: CalendarCheck,
    label: 'Shopping Plan',
    desc: 'Optimized weekly run',
    color: 'text-provision-savings',
    bg: 'bg-provision-savings/10',
    border: 'border-provision-savings/30',
  },
  {
    to: '/pantry',
    icon: Package,
    label: 'Pantry',
    desc: 'Track your inventory',
    color: 'text-amber-400',
    bg: 'bg-amber-900/20',
    border: 'border-amber-700/30',
  },
  {
    to: '/gas',
    icon: Fuel,
    label: 'Gas',
    desc: "Sam's · Costco · Fuel Rewards",
    color: 'text-blue-400',
    bg: 'bg-blue-900/20',
    border: 'border-blue-700/30',
  },
  {
    to: '/amazon',
    icon: ShoppingBag,
    label: 'Amazon',
    desc: 'Price tracker · Watchlist',
    color: 'text-orange-400',
    bg: 'bg-orange-900/20',
    border: 'border-orange-700/30',
  },
  {
    to: '/donate',
    icon: Heart,
    label: 'Donate',
    desc: 'Log donations · GCFD',
    color: 'text-red-400',
    bg: 'bg-red-900/20',
    border: 'border-red-700/30',
  },
]

export function More() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-provision-text">More</h1>
        <p className="text-provision-dim text-sm">Gas · Pantry · Amazon · Donate</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {HUB_ITEMS.map(item => (
          <Link key={item.to} to={item.to}>
            <div className={`rounded-xl border ${item.border} ${item.bg} p-4 hover:opacity-90 transition-opacity`}>
              <item.icon size={22} className={`${item.color} mb-2`} />
              <p className={`font-semibold text-sm ${item.color}`}>{item.label}</p>
              <p className="text-xs text-provision-dim mt-0.5">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Home Improvement quick links */}
      <div className="bg-provision-surface border border-provision-border rounded-xl p-4">
        <p className="text-xs text-provision-dim uppercase tracking-wide font-medium mb-3">Home Improvement Deals</p>
        <div className="space-y-2">
          {[
            { name: 'Home Depot', url: 'https://www.homedepot.com/b/Featured-Products-Specials-Special-Buys/N-5yc1vZbv26' },
            { name: 'Menards', url: 'https://www.menards.com/main/weekly-ads/c-18552.htm', note: '11% rebate' },
            { name: "Lowe's", url: 'https://www.lowes.com/l/deals.html' },
          ].map(store => (
            <a
              key={store.name}
              href={store.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between py-2 border-b border-provision-border last:border-0 hover:text-provision-text transition-colors"
            >
              <span className="text-sm text-provision-text">{store.name}</span>
              <div className="flex items-center gap-2">
                {store.note && <span className="text-xs text-provision-savings">{store.note}</span>}
                <span className="text-xs text-provision-dim">Weekly Ad →</span>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Auto care quick links */}
      <div className="bg-provision-surface border border-provision-border rounded-xl p-4">
        <p className="text-xs text-provision-dim uppercase tracking-wide font-medium mb-3">Auto Care Coupons</p>
        <div className="space-y-2">
          {[
            { name: 'Jiffy Lube', url: 'https://www.jiffylube.com/coupons' },
            { name: 'Valvoline', url: 'https://www.valvoline.com/en/service-coupons' },
            { name: 'Firestone', url: 'https://www.firestonecompleteautocare.com/promotions/' },
            { name: 'Midas', url: 'https://www.midas.com/coupons' },
          ].map(shop => (
            <a
              key={shop.name}
              href={shop.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between py-2 border-b border-provision-border last:border-0 hover:text-provision-text transition-colors"
            >
              <span className="text-sm text-provision-text">{shop.name}</span>
              <span className="text-xs text-provision-dim">Coupons →</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
