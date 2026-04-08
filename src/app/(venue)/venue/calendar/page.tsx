import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CalendarView, type CalendarEvent } from '@/components/shared/CalendarView'

export default async function VenueCalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: venue } = await supabase
    .from('venues')
    .select('id, name')
    .eq('owner_id', user.id)
    .single()

  if (!venue) redirect('/venue/dashboard')

  const { data: requests } = await supabase
    .from('share_requests')
    .select('id, requester_name, requester_email, event_date, status')
    .eq('venue_id', venue.id)
    .not('event_date', 'is', null)
    .order('event_date')

  const events: CalendarEvent[] = (requests ?? []).map(r => ({
    id: r.id,
    date: r.event_date!,
    title: r.requester_name ?? r.requester_email,
    subtitle: r.status === 'approved' ? 'Confirmed' : r.status === 'pending' ? 'Pending approval' : r.status,
    color: r.status === 'approved' ? 'green' : r.status === 'pending' ? 'yellow' : 'zinc',
    href: '/venue/requests',
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
        <p className="text-zinc-500 mt-0.5 text-sm">
          Shows where artists have requested packet access
        </p>
      </div>

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
