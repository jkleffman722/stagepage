import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TourDashboard } from '@/components/artist/TourDashboard'
import type { Tour } from '@/lib/types'

interface Props {
  params: Promise<{ tourId: string }>
}

export default async function TourDetailPage({ params }: Props) {
  const { tourId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  const { data: tour } = await supabase
    .from('tours')
    .select('*')
    .eq('id', tourId)
    .eq('profile_id', user.id)
    .single()

  if (!tour) notFound()

  const { data: shows } = await supabase
    .from('shows')
    .select('*, venues(id, name, city, state)')
    .eq('tour_id', tour.id)
    .order('event_date')

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
