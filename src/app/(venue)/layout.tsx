import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SidebarLayout } from '@/components/shared/SidebarLayout'
import { getActiveVenue, ACTIVE_VENUE_COOKIE } from '@/lib/venue-context'
import { cookies } from 'next/headers'

export default async function VenueLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profileResult, venuesResult] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', user.id).single(),
    supabase.from('venues').select('id, name').eq('owner_id', user.id).order('created_at'),
  ])

  const venues = venuesResult.data ?? []

  const cookieStore = await cookies()
  const activeId = cookieStore.get(ACTIVE_VENUE_COOKIE)?.value
  const activeVenue = (activeId && venues.find(v => v.id === activeId)) || venues[0]

  return (
    <SidebarLayout
      role="venue"
      userName={profileResult.data?.display_name ?? user.email ?? undefined}
      entityName={activeVenue?.name ?? undefined}
      venues={venues}
      activeVenueId={activeVenue?.id}
    >
      {children}
    </SidebarLayout>
  )
}
