import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ShareRequestList } from '@/components/venue/ShareRequestList'
import { getActiveVenue } from '@/lib/venue-context'

export default async function RequestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const venue = await getActiveVenue(supabase, user.id, 'id')

  if (!venue) redirect('/venue/dashboard')

  const { data: requests } = await supabase
    .from('share_requests')
    .select('*')
    .eq('venue_id', venue.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Share Requests</h1>
        <p className="text-zinc-500 mt-1">
          Manage who has access to your technical packet.
        </p>
      </div>
      <ShareRequestList requests={requests ?? []} venueId={venue.id} />
    </div>
  )
}
