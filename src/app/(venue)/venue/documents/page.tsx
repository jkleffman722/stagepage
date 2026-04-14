import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DocumentManager } from '@/components/venue/DocumentManager'
import { getActiveVenue } from '@/lib/venue-context'

export default async function DocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const venue = await getActiveVenue(supabase, user.id, 'id')

  if (!venue) redirect('/venue/dashboard')

  const { data: packet } = await supabase
    .from('technical_packets')
    .select('id')
    .eq('venue_id', venue.id)
    .single()

  if (!packet) redirect('/venue/packet/create')

  const { data: attachments } = await supabase
    .from('packet_attachments')
    .select('id, file_name, storage_path, uploaded_at')
    .eq('packet_id', packet.id)
    .order('uploaded_at', { ascending: false })

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
        <p className="text-zinc-500 mt-0.5 text-sm">
          Upload your tech packet PDFs. We&apos;ll read them and map the fields to your packet automatically.
          Artists with access can also download the originals.
        </p>
      </div>

      <DocumentManager
        packetId={packet.id}
        venueId={venue.id}
        userId={user.id}
        attachments={attachments ?? []}
      />
    </div>
  )
}
