import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PacketSectionEditor } from '@/components/venue/PacketSectionEditor'
import { PacketPublishToggle } from '@/components/venue/PacketPublishToggle'
import { Badge } from '@/components/ui/badge'
import { PACKET_SECTIONS } from '@/lib/types'
import type { PacketSection } from '@/lib/types'
import Link from 'next/link'
import { FileText } from 'lucide-react'

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

  // Completion stats
  const totalFields = PACKET_SECTIONS.reduce((acc, s) => acc + s.fields.length, 0)
  const filledFields = PACKET_SECTIONS.reduce((acc, sectionDef) => {
    const section = sectionMap.get(sectionDef.key)
    if (!section) return acc
    return acc + sectionDef.fields.filter(f => {
      const val = section.fields?.[f.key]
      return val !== null && val !== '' && val !== undefined
    }).length
  }, 0)
  const pct = Math.round((filledFields / totalFields) * 100)
  const isComplete = filledFields === totalFields

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

      {/* Completion bar */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-zinc-700">
            {isComplete ? 'Packet complete' : `${filledFields} of ${totalFields} fields filled in`}
          </p>
          <span className={`text-sm font-semibold ${isComplete ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
            {pct}%
          </span>
        </div>
        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isComplete ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {!isComplete && (
          <p className="text-xs text-zinc-400 mt-2">
            Sections with missing fields are highlighted below. You can also{' '}
            <Link href="/venue/documents" className="underline underline-offset-2 hover:text-zinc-600">
              upload a PDF
            </Link>{' '}
            to fill them automatically.
          </p>
        )}
      </div>

      {/* Section editors */}
      <div className="space-y-4">
        {PACKET_SECTIONS.map((sectionDef, index) => {
          const existing = sectionMap.get(sectionDef.key)
          return (
            <PacketSectionEditor
              key={`${sectionDef.key}-${existing?.updated_at ?? 'empty'}`}
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
