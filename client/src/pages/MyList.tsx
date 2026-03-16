import { useEffect, useState } from 'react'
import { getItems, deleteItem, updateItem, matchDeals, type Item, type DealMatch } from '@/lib/api'
import { ItemRow } from '@/components/ItemRow'
import { AddItemModal } from '@/components/AddItemModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Search, List } from 'lucide-react'

export function MyList() {
  const [items, setItems] = useState<Item[]>([])
  const [matches, setMatches] = useState<DealMatch[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState<Item | null>(null)
  const [editForm, setEditForm] = useState({ name: '', brand: '', category: '', quantity: '1', unit: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [itemsRes, matchRes] = await Promise.all([getItems(), matchDeals()])
    setItems(itemsRes.items)
    setMatches(matchRes.matches)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: string) => {
    await deleteItem(id)
    setItems((prev) => prev.filter((i) => i.id !== id))
    setMatches((prev) => prev.filter((m) => m.item.id !== id))
  }

  const handleEdit = (item: Item) => {
    setEditItem(item)
    setEditForm({
      name: item.name,
      brand: item.brand || '',
      category: item.category || '',
      quantity: String(item.quantity),
      unit: item.unit || '',
      notes: item.notes || '',
    })
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editItem) return
    setSaving(true)
    try {
      const { item } = await updateItem(editItem.id, {
        name: editForm.name,
        brand: editForm.brand || undefined,
        category: editForm.category || undefined,
        quantity: parseFloat(editForm.quantity) || 1,
        unit: editForm.unit || undefined,
        notes: editForm.notes || undefined,
      })
      setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)))
      setEditItem(null)
    } finally {
      setSaving(false)
    }
  }

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.brand || '').toLowerCase().includes(search.toLowerCase())
  )

  const getMatchForItem = (item: Item) => matches.find((m) => m.item.id === item.id)

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-provision-text">My List</h1>
          <p className="text-xs text-provision-dim">{items.length} items</p>
        </div>
        <AddItemModal onAdded={(item) => setItems((prev) => [item, ...prev])} />
      </div>

      {/* Search */}
      {items.length > 0 && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-provision-dim" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      )}

      {/* Items */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-provision-surface animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 border border-provision-border rounded-lg">
          <List size={32} className="mx-auto mb-3 text-provision-muted" />
          {items.length === 0 ? (
            <>
              <p className="text-sm text-provision-dim mb-3">Your list is empty</p>
              <AddItemModal onAdded={(item) => setItems((prev) => [item, ...prev])} />
            </>
          ) : (
            <p className="text-sm text-provision-dim">No items match your search</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const match = getMatchForItem(item)
            const bestDeal = match?.best_deal
            return (
              <ItemRow
                key={item.id}
                item={item}
                bestDeal={bestDeal}
                stack={bestDeal ? {
                  final_price: bestDeal.sale_price,
                  savings_total: bestDeal.original_price != null && bestDeal.sale_price != null
                    ? bestDeal.original_price - bestDeal.sale_price
                    : undefined,
                  savings_pct: bestDeal.discount_pct,
                  is_near_free: (bestDeal.sale_price || 0) > 0 && (bestDeal.sale_price || 0) < 0.25,
                  is_free: bestDeal.sale_price === 0,
                  is_profit: (bestDeal.sale_price || 0) < 0,
                  store_name: bestDeal.store_name,
                  store_chain: bestDeal.store_chain,
                } : undefined}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            )
          })}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-3">
            <div>
              <label className="text-xs text-provision-dim mb-1 block">Name</label>
              <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-provision-dim mb-1 block">Brand</label>
              <Input value={editForm.brand} onChange={(e) => setEditForm((f) => ({ ...f, brand: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-provision-dim mb-1 block">Qty</label>
                <Input type="number" value={editForm.quantity} onChange={(e) => setEditForm((f) => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-provision-dim mb-1 block">Unit</label>
                <Input value={editForm.unit} onChange={(e) => setEditForm((f) => ({ ...f, unit: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditItem(null)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
