import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PacketCreateForm } from '@/components/venue/PacketCreateForm'
import { getActiveVenue } from '@/lib/venue-context'

export default async function PacketCreatePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const venue = await getActiveVenue(supabase, user.id, 'id, name')

  if (!venue) redirect('/venue/dashboard')

  // Check if packet already exists
  const { data: existing } = await supabase
    .from('technical_packets')
    .select('id')
    .eq('venue_id', venue.id)
    .single()

  if (existing) redirect('/venue/packet')

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Technical Packet</h1>
        <p className="text-zinc-500 mt-1">
          Add your venue&apos;s technical information. You can start with a few
          sections and fill in the rest later.
        </p>
      </div>
      <PacketCreateForm venueId={venue.id} />
    </div>
  )
}
