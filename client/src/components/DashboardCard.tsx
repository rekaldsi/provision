import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'

interface DashboardCardProps {
  label: string
  value: string
  sublabel?: string
  icon: LucideIcon
  variant?: 'default' | 'savings' | 'near-free' | 'free' | 'profit'
  className?: string
}

const variantStyles = {
  default: {
    icon: 'text-provision-dim',
    value: 'text-provision-text',
    border: '',
  },
  savings: {
    icon: 'text-emerald-400',
    value: 'text-emerald-400',
    border: 'border-emerald-500/20',
  },
  'near-free': {
    icon: 'text-yellow-400',
    value: 'text-yellow-400',
    border: 'border-yellow-500/20',
  },
  free: {
    icon: 'text-green-400',
    value: 'text-green-400',
    border: 'border-green-500/20',
  },
  profit: {
    icon: 'text-amber-300',
    value: 'text-amber-300',
    border: 'border-amber-400/20',
  },
}

export function DashboardCard({
  label,
  value,
  sublabel,
  icon: Icon,
  variant = 'default',
  className,
}: DashboardCardProps) {
  const styles = variantStyles[variant]

  return (
    <Card className={cn('animate-fade-in', styles.border && styles.border, className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-provision-dim font-medium uppercase tracking-wider mb-1">{label}</p>
            <p className={cn('text-2xl font-bold leading-none', styles.value)}>{value}</p>
            {sublabel && (
              <p className="text-xs text-provision-dim mt-1">{sublabel}</p>
            )}
          </div>
          <div className={cn('mt-0.5 shrink-0', styles.icon)}>
            <Icon size={20} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
