import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-white/10 text-provision-text',
        savings: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
        'near-free': 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25',
        free: 'bg-green-500/15 text-green-400 border border-green-500/25',
        profit: 'bg-amber-400/15 text-amber-300 border border-amber-400/25',
        muted: 'bg-provision-muted text-provision-dim',
        outline: 'border border-provision-border text-provision-dim',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
