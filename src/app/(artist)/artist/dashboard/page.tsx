import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TourDashboard } from '@/components/artist/TourDashboard'
import type { Tour } from '@/lib/types'

export default async function ArtistDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  // Get active tour (most recent)
  const { data: tour } = await supabase
    .from('tours')
    .select('*')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!tour) redirect('/artist/tours/new')

  // Get shows with venue data
  const { data: shows } = await supabase
    .from('shows')
    .select('*, venues(id, name, city, state)')
    .eq('tour_id', tour.id)
    .order('event_date')

  // Get share requests for these shows
  const showIds = (shows ?? []).map(s => s.id)
  const { data: requests } = showIds.length > 0
    ? await supabase
        .from('share_requests')
        .select('id, status, show_id')
        .in('show_id', showIds)
    : { data: [] }

  const requestByShowId = new Map((requests ?? []).map(r => [r.show_id, r]))

  const showsWithDetails = (shows ?? []).map(s => ({
    ...s,
    venues: s.venues as { id: string; name: string; city: string | null; state: string | null } | null,
    request: requestByShowId.get(s.id) ?? null,
  }))

  return (
    <TourDashboard
      tour={tour as Tour}
      shows={showsWithDetails}
      userName={profile?.display_name ?? undefined}
    />
  )
}
