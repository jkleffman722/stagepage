import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { VenueOnboardingForm } from '@/components/venue/VenueOnboardingForm'
import { PACKET_SECTIONS } from '@/lib/types'
import { AlertTriangle } from 'lucide-react'
import { getActiveVenue } from '@/lib/venue-context'

export default async function VenueDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const venue = await getActiveVenue(supabase, user.id, '*')

  const { data: packet } = venue
    ? await supabase
        .from('technical_packets')
        .select('*')
        .eq('venue_id', venue.id)
        .single()
    : { data: null }

  const { data: sections } = packet
    ? await supabase.from('packet_sections').select('*').eq('packet_id', packet.id)
    : { data: [] }

  const { data: requests } = venue
    ? await supabase
        .from('share_requests')
        .select('id, status')
        .eq('venue_id', venue.id)
    : { data: [] }

  const pendingCount = requests?.filter(r => r.status === 'pending').length ?? 0
  const approvedCount = requests?.filter(r => r.status === 'approved').length ?? 0

  // Packet completion
  const totalFields = PACKET_SECTIONS.reduce((acc, s) => acc + s.fields.length, 0)
  const sectionMap = new Map((sections ?? []).map(s => [s.section_key, s]))
  const filledFields = PACKET_SECTIONS.reduce((acc, sectionDef) => {
    const section = sectionMap.get(sectionDef.key)
    if (!section) return acc
    return acc + sectionDef.fields.filter(f => {
      const val = (section.fields as Record<string, unknown>)?.[f.key]
      return val !== null && val !== '' && val !== undefined
    }).length
  }, 0)
  const missingFields = totalFields - filledFields
  const pct = Math.round((filledFields / totalFields) * 100)

  // No venue yet — show onboarding
  if (!venue) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Welcome to StagePage</h1>
          <p className="text-zinc-500 mt-1">
            Let&apos;s start by setting up your venue profile.
          </p>
        </div>
        <VenueOnboardingForm userId={user.id} />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Incomplete packet warning */}
      {packet && missingFields > 0 && (
        <Link
          href="/venue/packet"
          className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 hover:bg-yellow-100 transition-colors"
        >
          <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              Technical packet is {pct}% complete — {missingFields} field{missingFields !== 1 ? 's' : ''} still need{missingFields === 1 ? 's' : ''} data
            </p>
            <p className="text-xs text-yellow-600 mt-0.5">
              Click to review missing fields in your packet →
            </p>
          </div>
        </Link>
      )}

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{venue.name}</h1>
        <p className="text-zinc-500 mt-0.5">
          {[venue.city, venue.state].filter(Boolean).join(', ')}
          {venue.capacity ? ` · ${venue.capacity.toLocaleString()} cap` : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Technical Packet</CardDescription>
            <CardTitle className="text-3xl">
              {packet ? (packet.is_published ? '1' : '1') : '0'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {packet ? (
              <Badge variant={packet.is_published ? 'default' : 'secondary'}>
                {packet.is_published ? 'Published' : 'Draft'}
              </Badge>
            ) : (
              <Badge variant="outline">Not created</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Requests</CardDescription>
            <CardTitle className="text-3xl">{pendingCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">awaiting your response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Access</CardDescription>
            <CardTitle className="text-3xl">{approvedCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">artists with approved access</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Technical Packet</CardTitle>
            <CardDescription>
              {packet
                ? `Last updated ${new Date(packet.last_updated_at).toLocaleDateString()}`
                : 'No packet created yet'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={packet ? '/venue/packet' : '/venue/packet/create'} className={buttonVariants({ size: 'sm' })}>
              {packet ? 'View / Edit Packet' : 'Create Packet'}
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Share Requests</CardTitle>
            <CardDescription>
              {pendingCount > 0
                ? `${pendingCount} request${pendingCount !== 1 ? 's' : ''} waiting for your review`
                : 'No pending requests'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/venue/requests" className={buttonVariants({ size: 'sm', variant: 'outline' })}>
              Manage Requests
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
