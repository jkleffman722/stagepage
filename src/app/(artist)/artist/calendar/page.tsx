import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CalendarView, type CalendarEvent } from '@/components/shared/CalendarView'

export default async function ArtistCalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: requests } = await supabase
    .from('share_requests')
    .select('id, event_date, status, venues(id, name, city, state)')
    .eq('requester_profile_id', user.id)
    .not('event_date', 'is', null)
    .order('event_date')

  const events: CalendarEvent[] = (requests ?? []).map(r => {
    const venue = r.venues as unknown as { id: string; name: string; city: string | null; state: string | null } | null
    return {
      id: r.id,
      date: r.event_date!,
      title: venue?.name ?? 'Unknown venue',
      subtitle: [venue?.city, venue?.state].filter(Boolean).join(', ') || undefined,
      color: r.status === 'approved' ? 'blue' : r.status === 'pending' ? 'yellow' : 'zinc',
      href: r.status === 'approved' && venue ? `/artist/packets/${venue.id}` : undefined,
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
        <p className="text-zinc-500 mt-0.5 text-sm">
          Your upcoming shows and venue access
        </p>
      </div>

      <div className="flex gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-500" /> Approved
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-yellow-500" /> Pending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-zinc-400" /> Denied
        </span>
      </div>

      <CalendarView events={events} />
    </div>
  )
}
