import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { PacketSectionEditor } from '@/components/venue/PacketSectionEditor'
import { PacketPublishToggle } from '@/components/venue/PacketPublishToggle'
import { PacketPDFUpload } from '@/components/venue/PacketPDFUpload'
import { PACKET_SECTIONS } from '@/lib/types'
import type { PacketSection } from '@/lib/types'

export default async function PacketPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: venue } = await supabase
    .from('venues')
    .select('id, name')
    .eq('owner_id', user.id)
    .single()

  if (!venue) redirect('/venue/dashboard')

  const { data: packet } = await supabase
    .from('technical_packets')
    .select('*')
    .eq('venue_id', venue.id)
    .single()

  if (!packet) redirect('/venue/packet/create')

  const { data: sections } = await supabase
    .from('packet_sections')
    .select('*')
    .eq('packet_id', packet.id)
    .order('sort_order')

  const { data: attachments } = await supabase
    .from('packet_attachments')
    .select('id, file_name, storage_path')
    .eq('packet_id', packet.id)
    .order('uploaded_at', { ascending: false })

  const sectionMap = new Map<string, PacketSection>(
    (sections ?? []).map(s => [s.section_key, s])
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Technical Packet</h1>
          <p className="text-zinc-500 mt-0.5 text-sm">
            Last updated {new Date(packet.last_updated_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={packet.is_published ? 'default' : 'secondary'}>
            {packet.is_published ? 'Published' : 'Draft'}
          </Badge>
          <PacketPublishToggle packetId={packet.id} isPublished={packet.is_published} />
        </div>
      </div>

      {/* PDF upload */}
      <div className="space-y-2">
        <div>
          <h2 className="text-sm font-semibold">Upload PDF</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Upload your existing tech packet — we'll extract the fields automatically.
            Artists with access can also download the original file.
          </p>
        </div>
        <PacketPDFUpload
          packetId={packet.id}
          venueId={venue.id}
          userId={user.id}
          existingAttachments={attachments ?? []}
        />
      </div>

      <Separator />

      {/* Manual section editors */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Packet Sections</h2>
        <p className="text-xs text-zinc-400">
          Review and edit each section. Fields populated from a PDF upload can be adjusted here.
        </p>
      </div>

      <div className="space-y-4">
        {PACKET_SECTIONS.map((sectionDef, index) => {
          const existing = sectionMap.get(sectionDef.key)
          return (
            <PacketSectionEditor
              key={sectionDef.key}
              packetId={packet.id}
              sectionDef={sectionDef}
              existingSection={existing ?? null}
              sortOrder={index}
            />
          )
        })}
      </div>
    </div>
  )
}
