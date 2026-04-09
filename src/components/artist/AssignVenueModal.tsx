'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Search, MapPin, Loader2 } from 'lucide-react'

interface Venue {
  id: string
  name: string
  city: string | null
  state: string | null
  capacity: number | null
}

interface Props {
  show: { id: string; event_date: string }
  open: boolean
  onClose: () => void
}

export function AssignVenueModal({ show, open, onClose }: Props) {
  const router = useRouter()
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(false)
  const [requesting, setRequesting] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (open) loadVenues()
  }, [open])

  async function loadVenues() {
    setLoading(true)
    const supabase = createClient()

    const { data: packets } = await supabase
      .from('technical_packets')
      .select('venue_id')
      .eq('is_published', true)

    const ids = (packets ?? []).map(p => p.venue_id).filter(Boolean)
    if (ids.length === 0) { setLoading(false); return }

    const { data } = await supabase
      .from('venues')
      .select('id, name, city, state, capacity')
      .in('id', ids)
      .order('name')

    setVenues(data ?? [])
    setLoading(false)
  }

  async function handleRequest(venue: Venue) {
    setRequesting(venue.id)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not signed in'); setRequesting(null); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()

    // Assign venue to show
    const { error: showError } = await supabase
      .from('shows')
      .update({ venue_id: venue.id, updated_at: new Date().toISOString() })
      .eq('id', show.id)

    if (showError) { toast.error(showError.message); setRequesting(null); return }

    // Create share request linked to this show
    const { error: reqError } = await supabase.from('share_requests').insert({
      venue_id: venue.id,
      requester_profile_id: user.id,
      requester_name: profile?.display_name ?? null,
      requester_email: user.email ?? '',
      event_date: show.event_date,
      show_id: show.id,
    })

    if (reqError) {
      toast.error(reqError.message)
      setRequesting(null)
      return
    }

    toast.success(`Packet requested from ${venue.name}`)
    setRequesting(null)
    onClose()
    router.refresh()
  }

  const filtered = venues.filter(v => {
    if (!query) return true
    const q = query.toLowerCase()
    return (
      v.name.toLowerCase().includes(q) ||
      v.city?.toLowerCase().includes(q) ||
      v.state?.toLowerCase().includes(q)
    )
  })

  const showDate = new Date(show.event_date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Find a venue</DialogTitle>
          <DialogDescription>
            {showDate} — Select a venue to assign and request their tech packet.
          </DialogDescription>
        </DialogHeader>

        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search by venue name or city..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="mt-2 space-y-2 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading venues...
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-sm text-zinc-400">
              {query ? `No venues matching "${query}"` : 'No venues with published packets yet.'}
            </p>
          ) : (
            filtered.map(venue => (
              <div
                key={venue.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 hover:bg-zinc-50"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">{venue.name}</p>
                  <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {[venue.city, venue.state].filter(Boolean).join(', ')}
                    {venue.capacity ? ` · ${venue.capacity.toLocaleString()} cap` : ''}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleRequest(venue)}
                  disabled={!!requesting}
                >
                  {requesting === venue.id ? 'Requesting...' : 'Request Packet'}
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
