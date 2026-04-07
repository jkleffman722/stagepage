import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VenueSearch } from '@/components/artist/VenueSearch'

export default async function ArtistVenuesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Load all venues that have a published packet
  const { data: venues } = await supabase
    .from('venues')
    .select('id, name, city, state, capacity, technical_packets!inner(is_published)')
    .eq('technical_packets.is_published', true)
    .order('name')

  // Load existing requests so we can show status per venue
  const { data: myRequests } = await supabase
    .from('share_requests')
    .select('venue_id, status')
    .eq('requester_profile_id', user.id)

  const requestMap = new Map(myRequests?.map(r => [r.venue_id, r.status]) ?? [])

  const venuesWithStatus = (venues ?? []).map(v => ({
    id: v.id,
    name: v.name,
    city: v.city,
    state: v.state,
    capacity: v.capacity,
    requestStatus: requestMap.get(v.id) ?? null,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Find Venues</h1>
        <p className="text-zinc-500 mt-1">
          Request access to a venue&apos;s technical packet.
        </p>
      </div>
      <VenueSearch venues={venuesWithStatus} userId={user.id} />
    </div>
  )
}
