import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default async function ArtistPacketsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: approved } = await supabase
    .from('share_requests')
    .select('venue_id, event_date, created_at, venues(name, city, state, capacity)')
    .eq('requester_profile_id', user.id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Packets</h1>
        <p className="text-zinc-500 mt-1">Venue technical packets you have access to.</p>
      </div>

      {(!approved || approved.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-zinc-400 mb-4">No approved packets yet.</p>
            <Link href="/artist/venues" className={buttonVariants({ size: 'sm' })}>
              Find venues
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {approved.map(r => {
            const venue = r.venues as unknown as { name: string; city: string | null; state: string | null; capacity: number | null } | null
            return (
              <Card key={r.venue_id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{venue?.name}</p>
                      <p className="text-sm text-zinc-500 mt-0.5">
                        {[venue?.city, venue?.state].filter(Boolean).join(', ')}
                        {venue?.capacity ? ` · ${venue.capacity.toLocaleString()} cap` : ''}
                      </p>
                      {r.event_date && (
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Event: {new Date(r.event_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/artist/packets/${r.venue_id}`}
                      className={cn(buttonVariants({ size: 'sm' }))}
                    >
                      View packet
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
