'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface Props {
  tourId: string
  open: boolean
  onClose: () => void
  existingShow?: { id: string; event_date: string } | null
}

export function AddShowModal({ tourId, open, onClose, existingShow }: Props) {
  const router = useRouter()
  const [date, setDate] = useState(existingShow?.event_date ?? '')
  const [saving, setSaving] = useState(false)

  const isEdit = !!existingShow

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!date) return
    setSaving(true)

    const supabase = createClient()

    if (isEdit) {
      const { error } = await supabase
        .from('shows')
        .update({ event_date: date, updated_at: new Date().toISOString() })
        .eq('id', existingShow!.id)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Show updated')
    } else {
      const { error } = await supabase.from('shows').insert({
        tour_id: tourId,
        event_date: date,
      })
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Show added')
    }

    setSaving(false)
    onClose()
    router.refresh()
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setDate(existingShow?.event_date ?? '')
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit show date' : 'Add a show'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the date for this show.'
              : 'Enter the date for your show. You can assign a venue after.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
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
            <Button type="submit" disabled={saving || !date}>
              {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Add show'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
