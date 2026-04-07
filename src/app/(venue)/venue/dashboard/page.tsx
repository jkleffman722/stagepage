import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { VenueOnboardingForm } from '@/components/venue/VenueOnboardingForm'

export default async function VenueDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: venue } = await supabase
    .from('venues')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  const { data: packet } = venue
    ? await supabase
        .from('technical_packets')
        .select('*, packet_sections(count)')
        .eq('venue_id', venue.id)
        .single()
    : { data: null }

  const { data: requests } = venue
    ? await supabase
        .from('share_requests')
        .select('id, status')
        .eq('venue_id', venue.id)
    : { data: [] }

  const pendingCount = requests?.filter(r => r.status === 'pending').length ?? 0
  const approvedCount = requests?.filter(r => r.status === 'approved').length ?? 0

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
