'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { AddShowModal } from './AddShowModal'
import { AssignVenueModal } from './AssignVenueModal'
import { Calendar, MapPin, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ShowWithDetails {
  id: string
  tour_id: string
  event_date: string
  venue_id: string | null
  venues: { id: string; name: string; city: string | null; state: string | null } | null
  request: { id: string; status: string } | null
}

interface Props {
  show: ShowWithDetails
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  approved: { label: 'Packet Received', className: 'text-green-700 border-green-200 bg-green-50' },
  pending:  { label: 'Pending',         className: 'text-yellow-700 border-yellow-200 bg-yellow-50' },
  denied:   { label: 'Access Denied',   className: 'text-red-600 border-red-200 bg-red-50' },
  revoked:  { label: 'Access Revoked',  className: 'text-zinc-500 border-zinc-200' },
}

export function ShowCard({ show }: Props) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [venueOpen, setVenueOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const formattedDate = new Date(show.event_date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })

  const status = show.request?.status
  const statusConfig = status ? STATUS_CONFIG[status] : null
  const hasVenue = !!show.venue_id && !!show.venues

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()

    // Nullify show_id on any linked requests first (avoid FK constraint)
    await supabase
      .from('share_requests')
      .update({ show_id: null })
      .eq('show_id', show.id)

    const { error } = await supabase.from('shows').delete().eq('id', show.id)

    if (error) {
      toast.error(error.message)
      setDeleting(false)
      return
    }

    toast.success('Show removed')
    router.refresh()
  }

  return (
    <>
      <div className={cn(
        'rounded-xl border bg-white p-5 space-y-4 transition-shadow hover:shadow-sm',
        !hasVenue && 'border-zinc-200',
        status === 'approved' && 'border-green-100',
        status === 'pending' && 'border-yellow-100',
        status === 'denied' || status === 'revoked' ? 'border-red-100' : '',
      )}>
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
            <Calendar className="h-4 w-4 text-zinc-400 shrink-0" />
            {formattedDate}
          </div>
          {statusConfig ? (
            <Badge variant="outline" className={cn('text-xs shrink-0', statusConfig.className)}>
              {statusConfig.label}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-zinc-400 shrink-0">
              No venue
            </Badge>
          )}
        </div>

        {/* Venue info */}
        {hasVenue ? (
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <span className="font-medium">{show.venues!.name}</span>
            {(show.venues!.city || show.venues!.state) && (
              <span className="text-zinc-400">
                · {[show.venues!.city, show.venues!.state].filter(Boolean).join(', ')}
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-400 italic">No venue assigned yet</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {/* Primary action */}
          {!hasVenue && (
            <Button size="sm" onClick={() => setVenueOpen(true)}>
              Find &amp; Request Venue
            </Button>
          )}
          {status === 'approved' && show.venues && (
            <Link href={`/artist/packets/${show.venues.id}`}>
              <Button size="sm">View Packet</Button>
            </Link>
          )}

          {/* Secondary actions */}
          <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)} className="text-zinc-400 hover:text-zinc-700">
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Edit date
          </Button>

          {confirmDelete ? (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-zinc-500">Remove show?</span>
              <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Removing...' : 'Yes'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmDelete(true)}
              className="text-zinc-400 hover:text-red-500 ml-auto"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <AddShowModal
        tourId={show.tour_id}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        existingShow={{ id: show.id, event_date: show.event_date }}
      />

      <AssignVenueModal
        show={{ id: show.id, event_date: show.event_date }}
        open={venueOpen}
        onClose={() => setVenueOpen(false)}
      />
    </>
  )
}
