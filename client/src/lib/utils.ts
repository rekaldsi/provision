import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number | null | undefined): string {
  if (price == null) return '—'
  if (price === 0) return 'FREE'
  if (price < 0) return `+$${Math.abs(price).toFixed(2)} profit`
  return `$${price.toFixed(2)}`
}

export function formatSavings(savings: number | null | undefined): string {
  if (savings == null) return '—'
  if (savings <= 0) return '$0.00'
  return `$${savings.toFixed(2)}`
}

export function formatDiscount(pct: number | null | undefined): string {
  if (pct == null) return ''
  return `${Math.round(pct)}% off`
}

export function getPriceClass(price: number | null | undefined): string {
  if (price == null) return 'text-provision-dim'
  if (price < 0) return 'text-amber-300'   // profit
  if (price === 0) return 'text-green-400'  // free
  if (price < 0.25) return 'text-yellow-400' // near-free
  return 'text-provision-savings'            // savings
}

export function getStatusLabel(stack: {
  is_profit?: boolean
  is_free?: boolean
  is_near_free?: boolean
}): string | null {
  if (stack.is_profit) return 'PROFIT'
  if (stack.is_free) return 'FREE'
  if (stack.is_near_free) return 'NEAR FREE'
  return null
}

export function getStatusClass(stack: {
  is_profit?: boolean
  is_free?: boolean
  is_near_free?: boolean
}): string {
  if (stack.is_profit) return 'pill-profit'
  if (stack.is_free) return 'pill-free'
  if (stack.is_near_free) return 'pill-near-free'
  return 'pill-savings'
}
