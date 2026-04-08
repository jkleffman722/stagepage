import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VenueSettingsForm } from '@/components/venue/VenueSettingsForm'
import { TeamSection } from '@/components/venue/TeamSection'

export default async function VenueSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: venue } = await supabase
    .from('venues')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!venue) redirect('/venue/dashboard')

  // Fetch team members if table exists (safe — returns empty if not yet created)
  const { data: members } = await supabase
    .from('venue_members')
    .select('id, email, role, status, invited_at')
    .eq('venue_id', venue.id)
    .order('invited_at')

  return (
    <div className="space-y-10 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-zinc-500 mt-0.5 text-sm">Manage your venue profile and team</p>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Venue Profile</h2>
          <p className="text-sm text-zinc-500">This information is visible to artists with access.</p>
        </div>
        <VenueSettingsForm venue={venue} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Team</h2>
          <p className="text-sm text-zinc-500">
            Invite team members to manage this venue&apos;s packet and requests.
          </p>
        </div>
        <TeamSection venueId={venue.id} members={members ?? []} ownerEmail={user.email ?? ''} />
      </section>
    </div>
  )
}
