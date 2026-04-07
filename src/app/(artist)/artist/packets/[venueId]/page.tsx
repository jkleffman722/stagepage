import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PacketViewer } from '@/components/artist/PacketViewer'

export default async function PacketViewPage({
  params,
}: {
  params: Promise<{ venueId: string }>
}) {
  const { venueId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Verify this artist has approved access
  const { data: request } = await supabase
    .from('share_requests')
    .select('status')
    .eq('venue_id', venueId)
    .eq('requester_profile_id', user.id)
    .single()

  if (!request || request.status !== 'approved') notFound()

  const { data: venue } = await supabase
    .from('venues')
    .select('name, city, state, capacity, website, contact_email, contact_phone')
    .eq('id', venueId)
    .single()

  if (!venue) notFound()

  const { data: packet } = await supabase
    .from('technical_packets')
    .select('id, last_updated_at')
    .eq('venue_id', venueId)
    .single()

  if (!packet) notFound()

  const [sectionsResult, attachmentsResult] = await Promise.all([
    supabase
      .from('packet_sections')
      .select('*')
      .eq('packet_id', packet.id)
      .order('sort_order'),
    supabase
      .from('packet_attachments')
      .select('id, file_name, storage_path')
      .eq('packet_id', packet.id)
      .order('uploaded_at', { ascending: false }),
  ])

  return (
    <PacketViewer
      venue={venue}
      sections={sectionsResult.data ?? []}
      attachments={attachmentsResult.data ?? []}
      lastUpdated={packet.last_updated_at}
    />
  )
}
