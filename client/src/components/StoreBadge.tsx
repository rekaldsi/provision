import { cn } from '@/lib/utils'

const CHAIN_COLORS: Record<string, string> = {
  Kroger: 'bg-blue-900/40 text-blue-300 border-blue-800/50',
  Target: 'bg-red-900/40 text-red-300 border-red-800/50',
  Walmart: 'bg-blue-800/40 text-blue-200 border-blue-700/50',
  Aldi: 'bg-sky-900/40 text-sky-300 border-sky-800/50',
  Costco: 'bg-indigo-900/40 text-indigo-300 border-indigo-800/50',
  "Sam's Club": 'bg-teal-900/40 text-teal-300 border-teal-800/50',
  'Dollar General': 'bg-violet-900/40 text-violet-300 border-violet-800/50',
  'Dollar Tree': 'bg-purple-900/40 text-purple-300 border-purple-800/50',
  'Home Depot': 'bg-orange-900/40 text-orange-300 border-orange-800/50',
  Menards: 'bg-emerald-900/40 text-emerald-300 border-emerald-800/50',
  "Lowe's": 'bg-blue-900/40 text-blue-300 border-blue-800/50',
  'Restaurant Depot': 'bg-stone-700/40 text-stone-300 border-stone-600/50',
  'H Mart': 'bg-red-900/40 text-red-300 border-red-800/50',
  'Seafood City': 'bg-cyan-900/40 text-cyan-300 border-cyan-800/50',
  "Tony's": 'bg-amber-900/40 text-amber-300 border-amber-800/50',
}

interface StoreBadgeProps {
  name: string
  chain?: string
  className?: string
  size?: 'sm' | 'md'
}

export function StoreBadge({ name, chain, className, size = 'sm' }: StoreBadgeProps) {
  const key = chain || name
  const colorClass = CHAIN_COLORS[key] || 'bg-provision-muted text-provision-dim border-provision-border'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border font-medium',
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm',
        colorClass,
        className
      )}
    >
      {name}
    </span>
  )
}
