'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Search } from 'lucide-react'

interface Venue {
  id: string
  name: string
  city: string | null
  state: string | null
  capacity: number | null
  requestStatus: string | null
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'text-yellow-600 border-yellow-300',
  approved: 'text-green-600 border-green-300',
  denied: 'text-red-500 border-red-300',
  revoked: 'text-zinc-400',
}

export function VenueSearch({ venues, userId }: { venues: Venue[]; userId: string }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null)
  const [eventDate, setEventDate] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const filtered = venues.filter(v => {
    const q = query.toLowerCase()
    return (
      v.name.toLowerCase().includes(q) ||
      v.city?.toLowerCase().includes(q) ||
      v.state?.toLowerCase().includes(q)
    )
  })

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedVenue) return
    setSubmitting(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('share_requests').insert({
      venue_id: selectedVenue.id,
      requester_profile_id: userId,
      requester_email: user?.email ?? '',
      event_date: eventDate || null,
      message: message || null,
    })

    if (error) {
      toast.error(error.message)
      setSubmitting(false)
      return
    }

    toast.success(`Request sent to ${selectedVenue.name}`)
    setSelectedVenue(null)
    setEventDate('')
    setMessage('')
    setSubmitting(false)
    router.refresh()
  }

  return (
    <>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <Input
          placeholder="Search by venue name or city..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-zinc-400">
            {query ? `No venues found matching "${query}"` : 'No venues with published packets yet.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(venue => (
            <Card key={venue.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{venue.name}</p>
                    <p className="text-sm text-zinc-500 mt-0.5">
                      {[venue.city, venue.state].filter(Boolean).join(', ')}
                      {venue.capacity ? ` · ${venue.capacity.toLocaleString()} cap` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {venue.requestStatus ? (
                      <Badge variant="outline" className={STATUS_STYLES[venue.requestStatus]}>
                        {venue.requestStatus.charAt(0).toUpperCase() + venue.requestStatus.slice(1)}
                      </Badge>
                    ) : (
                      <Button size="sm" onClick={() => setSelectedVenue(venue)}>
                        Request access
                      </Button>
                    )}
                    {venue.requestStatus === 'approved' && (
                      <Button size="sm" variant="outline" onClick={() => router.push(`/artist/packets/${venue.id}`)}>
                        View packet
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedVenue} onOpenChange={open => !open && setSelectedVenue(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request access</DialogTitle>
            <DialogDescription>
              Send a request to view {selectedVenue?.name}&apos;s technical packet.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRequest} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="event_date">Event date <span className="text-zinc-400 font-normal">(optional)</span></Label>
              <Input
                id="event_date"
                type="date"
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message <span className="text-zinc-400 font-normal">(optional)</span></Label>
              <Textarea
                id="message"
                placeholder="Briefly describe your show or production needs..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setSelectedVenue(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Sending...' : 'Send request'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
