const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// Items
export const getItems = () => request<{ items: Item[] }>('/items')
export const createItem = (data: Partial<Item>) =>
  request<{ item: Item }>('/items', { method: 'POST', body: JSON.stringify(data) })
export const updateItem = (id: string, data: Partial<Item>) =>
  request<{ item: Item }>(`/items/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteItem = (id: string) =>
  request<{ deleted: boolean }>(`/items/${id}`, { method: 'DELETE' })

// Stores
export const getStores = () => request<{ stores: Store[] }>('/stores')

// Deals
export const getDeal = (id: string) => request<{ deal: Deal }>(`/deals/${id}`)
export const getDeals = (params?: { store_id?: string; category?: string; search?: string }) => {
  const q = new URLSearchParams()
  if (params?.store_id) q.set('store_id', params.store_id)
  if (params?.category) q.set('category', params.category)
  if (params?.search) q.set('search', params.search)
  return request<{ deals: Deal[] }>(`/deals${q.toString() ? '?' + q : ''}`)
}
export const matchDeals = () => request<{ matches: DealMatch[] }>('/deals/match')

export const addToListFromDeal = (deal: Deal) =>
  createItem({
    name: deal.item_name,
    brand: deal.item_brand,
    category: deal.category,
    quantity: 1,
  })

// Stack
export const calculateStack = (item_name: string, store_id: string, item_id?: string) =>
  request<StackResult>('/stack/calculate', {
    method: 'POST',
    body: JSON.stringify({ item_name, store_id, item_id }),
  })

// Shopping plan
export const getShoppingPlan = () => request<ShoppingPlanResponse>('/shopping-plan')

// Stats
export const getStats = () => request<Stats>('/stats')

// Alerts
export const getAlerts = () => request<{ alerts: AlertItem[]; total: number }>('/alerts')

// Pharmacy
export const getRxPrices = (drug: string, zip?: string) => {
  const q = new URLSearchParams({ drug, ...(zip ? { zip } : {}) })
  return request<RxComparison>(`/pharmacy/prices?${q}`)
}
export const getWalmartGenerics = (search?: string) => {
  const q = search ? `?search=${encodeURIComponent(search)}` : ''
  return request<{ generics: WalmartGeneric[]; total: number }>(`/pharmacy/walmart-generics${q}`)
}
export const getRxList = () => request<{ rx_list: RxItem[] }>('/rx-list')
export const addRxItem = (data: Partial<RxItem>) =>
  request<{ rx: RxItem }>('/rx-list', { method: 'POST', body: JSON.stringify(data) })
export const deleteRxItem = (id: string) =>
  request<{ deleted: boolean }>(`/rx-list/${id}`, { method: 'DELETE' })

// Types
export interface Item {
  id: string
  name: string
  brand?: string
  category?: string
  quantity: number
  unit?: string
  notes?: string
  household_id: string
  created_at: string
}

export interface Store {
  id: string
  name: string
  chain?: string
  type?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  coupon_stacking_policy?: Record<string, unknown>
  active: boolean
}

export interface Deal {
  id: string
  item_name: string
  item_brand?: string
  store_id: string
  store_name?: string
  store_chain?: string
  store_type?: string
  stores?: { name: string; chain?: string; type?: string }
  sale_price?: number
  original_price?: number
  unit?: string
  discount_pct?: number
  source?: string
  source_url?: string
  target_circle_url?: string
  coupon_type?: string
  coupon_deep_link?: string | null
  coupon_barcode?: string | null
  item_size?: string
  valid_from?: string
  valid_until?: string
  category?: string
  quality_score?: number
  is_store_brand?: boolean
  is_national_brand?: boolean
  created_at: string
}

export interface DealMatch {
  item: Item
  deals: Deal[]
  best_deal: Deal
}

export interface StackBreakdownLayer {
  layer: string
  label: string
  value: number
  price_after: number
  source?: string
  source_url?: string
  coupon_id?: string
}

export interface StackResult {
  item_name: string
  store_id: string
  store_name: string
  deal_id?: string
  base_price?: number
  original_price?: number
  store_coupon_value: number
  manufacturer_coupon_value: number
  rebate_value: number
  final_price?: number
  savings_total?: number
  savings_pct?: number
  is_near_free: boolean
  is_free: boolean
  is_profit: boolean
  stack_breakdown: StackBreakdownLayer[]
  manufacturer_coupons_available: Array<{
    id: string
    value: number
    type: string
    source: string
    valid_until: string
  }>
  computed_at: string
}

export interface ShoppingPlanTrip {
  store_id: string
  store_name: string
  items: Array<{
    item_id: string
    item_name: string
    item_brand?: string
    base_price?: number
    final_price?: number
    savings_total?: number
    savings_pct?: number
    is_near_free: boolean
    is_free: boolean
    is_profit: boolean
    stack_breakdown: StackBreakdownLayer[]
    deal_id?: string
  }>
  trip_savings: number
  trip_total: number
}

export interface ShoppingPlanResponse {
  plan: ShoppingPlanTrip[]
  unmatched_items: Array<{ item_id: string; item_name: string; item_brand?: string }>
  total_savings: number
  near_free_count: number
  free_count: number
  profit_count: number
}

export interface Stats {
  active_deals: number
  list_items: number
  near_free_deals: number
  rx_tracked?: number
}

export interface AlertTier {
  label: string
  color: string
  bgColor: string
  emoji: string
}

export interface AlertItem {
  type: string
  tier: AlertTier
  deal: Deal
  item_matched: Item | null
  on_my_list: boolean
  message: string
  priority: number
}

export interface RxItem {
  id: string
  drug_name: string
  drug_generic?: string
  dosage?: string
  quantity: number
  form?: string
  notes?: string
  household_id: string
  created_at: string
}

export interface RxPrice {
  source: string
  pharmacy_name: string
  price: number | null
  coupon_url?: string
  url?: string
  quantity?: number
  note?: string
  advantage?: string
  price_90_day?: number
  dosages_covered?: string[]
  is_on_walmart_list?: boolean
}

export interface RxComparison {
  drug_name: string
  prices: RxPrice[]
  warehouse_notes: RxPrice[]
  cheapest: RxPrice | null
  walmart_generic: RxPrice | null
  on_walmart_4_list: boolean
  comparison_note: string
  goodrx_url: string
  costplus_url: string
}

export interface WalmartGeneric {
  drug: string
  dosages: string[]
  qty30: number
  qty90: number
}
