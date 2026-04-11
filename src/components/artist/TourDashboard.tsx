'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ShowCard } from './ShowCard'
import { AddShowModal } from './AddShowModal'
import { Plus, FileText } from 'lucide-react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Tour } from '@/lib/types'

interface ShowWithDetails {
  id: string
  tour_id: string
  event_date: string
  venue_id: string | null
  venues: { id: string; name: string; city: string | null; state: string | null } | null
  request: { id: string; status: string } | null
}

interface Props {
  tour: Tour
  shows: ShowWithDetails[]
  userName?: string
}

export function TourDashboard({ tour, shows, userName }: Props) {
  const [addOpen, setAddOpen] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const upcoming = shows.filter(s => s.event_date >= today)
  const past = shows.filter(s => s.event_date < today)

  const totalShows = shows.length
  const packetsReceived = shows.filter(s => s.request?.status === 'approved').length
  const pending = shows.filter(s => s.request?.status === 'pending').length
  const noVenue = shows.filter(s => !s.venue_id).length

  return (
    <div className="space-y-8">
      {/* Back + Tour header */}
      <div>
        <Link
          href="/artist/tours"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-600 mb-4 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All tours
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{tour.tour_name}</h1>
            <p className="text-zinc-500 mt-0.5">{tour.artist_name}</p>
            {tour.user_role && (
              <p className="text-xs text-zinc-400 mt-1">{tour.user_role}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/artist/tours/${tour.id}/rider`}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-xs hover:bg-zinc-50 transition-colors"
            >
              <FileText className="h-4 w-4" />
              Tech Rider
            </Link>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Show
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Shows" value={totalShows} />
        <StatCard label="Packets Received" value={packetsReceived} color="green" />
        <StatCard label="Pending" value={pending} color="yellow" />
        <StatCard label="No Venue Yet" value={noVenue} color="zinc" />
      </div>

      {/* Show cards */}
      {shows.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-zinc-200 py-16 text-center">
          <p className="text-zinc-400 mb-4">No shows yet. Add your first show to get started.</p>
          <Button variant="outline" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Show
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
                Upcoming · {upcoming.length}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {upcoming.map(show => <ShowCard key={show.id} show={show} />)}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
                Past · {past.length}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-60">
                {past.map(show => <ShowCard key={show.id} show={show} />)}
              </div>
            </section>
          )}
        </div>
      )}

      <AddShowModal
        tourId={tour.id}
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  color = 'default',
}: {
  label: string
  value: number
  color?: 'green' | 'yellow' | 'zinc' | 'default'
}) {
  const valueClass =
    color === 'green' ? 'text-green-600' :
    color === 'yellow' ? 'text-yellow-600' :
    color === 'zinc' ? 'text-zinc-400' :
    'text-zinc-900'

  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
      <p className="text-xs text-zinc-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
    </div>
  )
}
