import { useState } from 'react'
import { Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createItem, type Item } from '@/lib/api'

const CATEGORIES = [
  'food',
  'household',
  'personal_care',
  'pharmacy',
  'auto',
  'home_improvement',
  'electronics',
  'garden',
  'other',
]

interface AddItemModalProps {
  onAdded?: (item: Item) => void
}

export function AddItemModal({ onAdded }: AddItemModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    brand: '',
    category: '',
    quantity: '1',
    unit: '',
    notes: '',
  })
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Name is required')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { item } = await createItem({
        name: form.name.trim(),
        brand: form.brand.trim() || undefined,
        category: form.category || undefined,
        quantity: parseFloat(form.quantity) || 1,
        unit: form.unit.trim() || undefined,
        notes: form.notes.trim() || undefined,
      })
      onAdded?.(item)
      setOpen(false)
      setForm({ name: '', brand: '', category: '', quantity: '1', unit: '', notes: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item')
    } finally {
      setLoading(false)
    }
  }

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus size={14} />
          Add Item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add to My List</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-provision-dim mb-1 block">Item Name *</label>
            <Input
              placeholder="e.g. Tide Pods Laundry Detergent"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-provision-dim mb-1 block">Brand</label>
            <Input
              placeholder="e.g. Tide"
              value={form.brand}
              onChange={(e) => set('brand', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-provision-dim mb-1 block">Category</label>
              <Select value={form.category} onValueChange={(v) => set('category', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-provision-dim mb-1 block">Qty</label>
              <Input
                type="number"
                min="1"
                step="1"
                value={form.quantity}
                onChange={(e) => set('quantity', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-provision-dim mb-1 block">Unit</label>
            <Input
              placeholder="e.g. 42ct, 12oz, lb"
              value={form.unit}
              onChange={(e) => set('unit', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-provision-dim mb-1 block">Notes</label>
            <Input
              placeholder="Optional notes"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Adding...' : 'Add to List'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
