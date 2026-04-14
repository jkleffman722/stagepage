import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CalendarView, type CalendarEvent } from '@/components/shared/CalendarView'
import { Badge } from '@/components/ui/badge'
import { getActiveVenue } from '@/lib/venue-context'

export default async function VenueCalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const venue = await getActiveVenue(supabase, user.id, 'id, name')

  if (!venue) redirect('/venue/dashboard')

  const { data: requests } = await supabase
    .from('share_requests')
    .select('id, requester_name, requester_email, event_date, status')
    .eq('venue_id', venue.id)
    .not('event_date', 'is', null)
    .order('event_date')

  const today = new Date().toISOString().split('T')[0]

  const upcomingFive = (requests ?? [])
    .filter(r => r.event_date >= today)
    .slice(0, 5)

  const events: CalendarEvent[] = (requests ?? []).map(r => ({
    id: r.id,
    date: r.event_date!,
    title: r.requester_name ?? r.requester_email,
    subtitle: r.status === 'approved' ? 'Confirmed' : r.status === 'pending' ? 'Pending approval' : r.status,
    color: r.status === 'approved' ? 'green' : r.status === 'pending' ? 'yellow' : 'zinc',
    href: '/venue/requests',
  }))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
        <p className="text-zinc-500 mt-0.5 text-sm">
          Shows where artists have requested packet access
        </p>
      </div>

      {/* Next 5 shows */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-700">Next 5 Shows</h2>
        {upcomingFive.length === 0 ? (
          <p className="text-sm text-zinc-400">No upcoming shows scheduled.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingFive.map(r => {
              const name = r.requester_name ?? r.requester_email
              const isShared = r.status === 'approved'
              const isPending = r.status === 'pending'
              return (
                <div
                  key={r.id}
                  className="flex items-start justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {new Date(r.event_date + 'T12:00:00').toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      isShared
                        ? 'text-xs text-green-600 border-green-200 bg-green-50 shrink-0 ml-3'
                        : isPending
                        ? 'text-xs text-yellow-600 border-yellow-200 bg-yellow-50 shrink-0 ml-3'
                        : 'text-xs text-zinc-400 shrink-0 ml-3'
                    }
                  >
                    {isShared ? 'Packet shared' : isPending ? 'Pending' : 'Denied'}
                  </Badge>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-500" /> Confirmed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-yellow-500" /> Pending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-zinc-400" /> Denied / Revoked
        </span>
      </div>

      <CalendarView events={events} />
    </div>
  )
}
