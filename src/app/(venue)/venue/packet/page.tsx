import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PacketSectionEditor } from '@/components/venue/PacketSectionEditor'
import { PacketPublishToggle } from '@/components/venue/PacketPublishToggle'
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
