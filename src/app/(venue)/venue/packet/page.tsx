import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PacketSectionEditor } from '@/components/venue/PacketSectionEditor'
import { PacketPublishToggle } from '@/components/venue/PacketPublishToggle'
import { Badge } from '@/components/ui/badge'
import { PACKET_SECTIONS } from '@/lib/types'
import type { PacketSection } from '@/lib/types'
import { getPacketCompletion } from '@/lib/packet-utils'
import Link from 'next/link'
import { AlertTriangle, FileText, MessageSquare } from 'lucide-react'

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

  const completion = getPacketCompletion(sections ?? [])

  // Pending field requests for this venue
  const { data: pendingRequests } = await supabase
    .from('packet_field_requests')
    .select('id, requested_fields, message, created_at')
    .eq('venue_id', venue.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

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
          <PacketPublishToggle
            packetId={packet.id}
            isPublished={packet.is_published}
            missingRequiredCount={completion.missingRequired.length}
          />
        </div>
      </div>

      {/* Pending field requests from artists */}
      {pendingRequests && pendingRequests.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-blue-500" />
            <p className="text-sm font-semibold text-blue-800">
              {pendingRequests.length} open field request{pendingRequests.length !== 1 ? 's' : ''} from artists
            </p>
          </div>
          {pendingRequests.map(req => {
            const requestedPaths: string[] = Array.isArray(req.requested_fields) ? req.requested_fields : []
            const fieldLabels = requestedPaths.map(path => {
              const [sKey, fKey] = path.split('.')
              const sectionDef = PACKET_SECTIONS.find(s => s.key === sKey)
              const fieldDef = sectionDef?.fields.find(f => f.key === fKey)
              return fieldDef ? `${sectionDef?.label}: ${fieldDef.label}` : path
            })
            return (
              <div key={req.id} className="rounded-md bg-white border border-blue-100 px-3 py-2.5 space-y-1.5">
                <p className="text-xs text-zinc-500">
                  Requested {new Date(req.created_at).toLocaleDateString()}
                  {req.message && ` · "${req.message}"`}
                </p>
                <ul className="space-y-0.5">
                  {fieldLabels.map(label => (
                    <li key={label} className="text-xs font-medium text-blue-700 flex items-center gap-1">
                      <span className="h-1 w-1 rounded-full bg-blue-400 shrink-0" />
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}

      {/* Completion bar */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 space-y-3">
        {/* Required fields */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-zinc-700">Required fields</p>
              {!completion.requiredComplete && (
                <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
              )}
            </div>
            <span className={`text-sm font-semibold ${completion.requiredComplete ? 'text-green-600' : completion.requiredPct >= 60 ? 'text-orange-500' : 'text-red-500'}`}>
              {completion.filledRequired} / {completion.requiredFields}
            </span>
          </div>
          <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${completion.requiredComplete ? 'bg-green-500' : completion.requiredPct >= 60 ? 'bg-orange-400' : 'bg-red-400'}`}
              style={{ width: `${completion.requiredPct}%` }}
            />
          </div>
          {completion.missingRequired.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {completion.missingRequired.map(f => (
                <a
                  key={f.path}
                  href={`#${f.sectionKey}`}
                  className="inline-block text-[10px] font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5 hover:bg-orange-100 hover:border-orange-300 transition-colors"
                >
                  {f.sectionLabel}: {f.fieldLabel}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Overall fields */}
        <div className="border-t border-zinc-100 pt-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-sm text-zinc-500">Overall completion</p>
            <span className={`text-sm font-semibold ${completion.pct === 100 ? 'text-green-600' : completion.pct >= 50 ? 'text-yellow-600' : 'text-zinc-400'}`}>
              {completion.pct}%
            </span>
          </div>
          <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${completion.pct === 100 ? 'bg-green-500' : completion.pct >= 50 ? 'bg-yellow-400' : 'bg-zinc-300'}`}
              style={{ width: `${completion.pct}%` }}
            />
          </div>
          {completion.pct < 100 && (
            <p className="text-xs text-zinc-400 mt-1.5">
              You can{' '}
              <Link href="/venue/documents" className="underline underline-offset-2 hover:text-zinc-600">
                upload a PDF
              </Link>{' '}
              to fill fields automatically.
            </p>
          )}
        </div>
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
