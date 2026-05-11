'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { ARTIST_ROLES } from '@/lib/types'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onClose: () => void
  onCreated?: (tour: { id: string; tour_name: string; artist_name: string }) => void
}

export function NewTourModal({ open, onClose, onCreated }: Props) {
  const router = useRouter()
  const [artistName, setArtistName] = useState('')
  const [tourName, setTourName] = useState('')
  const [userRole, setUserRole] = useState('')
  const [loading, setLoading] = useState(false)

  function handleOpenChange(o: boolean) {
    if (!o) {
      setArtistName('')
      setTourName('')
      setUserRole('')
      onClose()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!artistName.trim() || !tourName.trim()) return
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); setLoading(false); return }

    const { data: newTour, error } = await supabase.from('tours').insert({
      profile_id: user.id,
      artist_name: artistName.trim(),
      tour_name: tourName.trim(),
      user_role: userRole || null,
      is_active: true,
    }).select('id, tour_name, artist_name').single()

    if (error) { toast.error(error.message); setLoading(false); return }

    toast.success('Tour created')
    setLoading(false)
    if (newTour) onCreated?.(newTour)
    handleOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New tour</DialogTitle>
          <DialogDescription>Create a tour to start adding shows and advancing.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="artistName">Artist / Band name</Label>
            <Input
              id="artistName"
              placeholder="e.g. Tame Impala"
              value={artistName}
              onChange={e => setArtistName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tourName">Tour name</Label>
            <Input
              id="tourName"
              placeholder="e.g. The Slow Rush World Tour 2026"
              value={tourName}
              onChange={e => setTourName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>
              Your role <span className="text-zinc-400 font-normal text-xs">(optional)</span>
            </Label>
            <Select value={userRole} onValueChange={v => setUserRole(v ?? '')}>
              <SelectTrigger>
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                {ARTIST_ROLES.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading || !artistName || !tourName}>
              {loading ? 'Creating…' : 'Create tour'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
