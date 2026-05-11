'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface Tour { id: string; tour_name: string; artist_name: string }

interface Props {
  tours: Tour[]
  open: boolean
  onClose: () => void
}

export function RoutingAddShowModal({ tours, open, onClose }: Props) {
  const router = useRouter()
  const [tourId, setTourId] = useState(tours[0]?.id ?? '')
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)

  function handleOpenChange(o: boolean) {
    if (!o) {
      setDate('')
      setTourId(tours[0]?.id ?? '')
      onClose()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!date || !tourId) return
    setSaving(true)

    const supabase = createClient()
    const { error } = await supabase.from('shows').insert({ tour_id: tourId, event_date: date })

    if (error) { toast.error(error.message); setSaving(false); return }

    toast.success('Show added')
    setSaving(false)
    onClose()
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add show</DialogTitle>
          <DialogDescription>Choose a tour and date. Assign a venue after.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Tour</Label>
            <select
              value={tourId}
              onChange={e => setTourId(e.target.value)}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            >
              {tours.map(t => (
                <option key={t.id} value={t.id}>{t.tour_name} — {t.artist_name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="showDate">Show date</Label>
            <Input
              id="showDate"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || !date || !tourId}>
              {saving ? 'Saving...' : 'Add show'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
