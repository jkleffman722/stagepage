import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PACKET_SECTIONS } from '@/lib/types'

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
    .select('last_updated_at')
    .eq('venue_id', venueId)
    .single()

  const { data: sections } = await supabase
    .from('packet_sections')
    .select('*')
    .eq('packet_id', (
      await supabase
        .from('technical_packets')
        .select('id')
        .eq('venue_id', venueId)
        .single()
    ).data?.id ?? '')
    .order('sort_order')

  const sectionMap = new Map(sections?.map(s => [s.section_key, s]) ?? [])

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{venue.name}</h1>
        <p className="text-zinc-500 mt-0.5">
          {[venue.city, venue.state].filter(Boolean).join(', ')}
          {venue.capacity ? ` · ${venue.capacity.toLocaleString()} cap` : ''}
        </p>
        {packet && (
          <p className="text-xs text-zinc-400 mt-1">
            Last updated {new Date(packet.last_updated_at).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Venue contact info */}
      {(venue.contact_email || venue.contact_phone || venue.website) && (
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-1.5 text-sm">
            {venue.contact_email && (
              <p><span className="text-zinc-400 w-20 inline-block">Email</span>{venue.contact_email}</p>
            )}
            {venue.contact_phone && (
              <p><span className="text-zinc-400 w-20 inline-block">Phone</span>{venue.contact_phone}</p>
            )}
            {venue.website && (
              <p>
                <span className="text-zinc-400 w-20 inline-block">Website</span>
                <a href={venue.website} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  {venue.website}
                </a>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Packet sections */}
      {PACKET_SECTIONS.map(sectionDef => {
        const section = sectionMap.get(sectionDef.key)
        if (!section) return null

        const filledFields = sectionDef.fields.filter(f => {
          const val = section.fields?.[f.key]
          return val !== null && val !== '' && val !== undefined
        })

        if (filledFields.length === 0) return null

        return (
          <Card key={sectionDef.key}>
            <CardHeader className="py-4">
              <CardTitle className="text-base">{sectionDef.label}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <dl className="space-y-3">
                {filledFields.map(field => {
                  const val = section.fields?.[field.key]
                  let display: string
                  if (field.type === 'boolean') {
                    display = val === true || val === 'true' ? 'Yes' : 'No'
                  } else {
                    display = String(val)
                  }
                  return (
                    <div key={field.key} className="flex gap-4">
                      <dt className="text-sm text-zinc-400 min-w-40 shrink-0">{field.label}</dt>
                      <dd className="text-sm">{display}</dd>
                    </div>
                  )
                })}
              </dl>
            </CardContent>
          </Card>
        )
      })}

      <div className="flex items-center gap-2 pt-2">
        <Badge variant="outline" className="text-xs text-zinc-400">Read only</Badge>
        <p className="text-xs text-zinc-400">This packet is maintained by {venue.name}</p>
      </div>
    </div>
  )
}
