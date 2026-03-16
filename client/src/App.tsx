import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { LayoutGrid, List, Tag, CalendarCheck, Layers } from 'lucide-react'
import { Dashboard } from '@/pages/Dashboard'
import { MyList } from '@/pages/MyList'
import { Deals } from '@/pages/Deals'
import { ShoppingPlan } from '@/pages/ShoppingPlan'
import { StackDetail } from '@/pages/StackDetail'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', icon: LayoutGrid, label: 'Home', exact: true },
  { to: '/list', icon: List, label: 'List', exact: false },
  { to: '/deals', icon: Tag, label: 'Deals', exact: false },
  { to: '/shopping-plan', icon: CalendarCheck, label: 'Plan', exact: false },
]

function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-provision-bg border-t border-provision-border">
      <div className="max-w-lg mx-auto flex items-stretch">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-colors',
                isActive
                  ? 'text-provision-text'
                  : 'text-provision-muted hover:text-provision-dim'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

function AppLayout() {
  const location = useLocation()
  // Hide bottom nav on stack detail page
  const hideNav = location.pathname.startsWith('/stack/')

  return (
    <div className="min-h-screen bg-provision-bg text-provision-text">
      <main className={cn('max-w-lg mx-auto px-4 pt-6', hideNav ? 'pb-6' : 'pb-24')}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/list" element={<MyList />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/shopping-plan" element={<ShoppingPlan />} />
          <Route path="/stack/:itemId" element={<StackDetail />} />
        </Routes>
      </main>
      {!hideNav && <BottomNav />}
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  )
}
