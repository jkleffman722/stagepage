import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default async function ArtistDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  const { data: requests } = await supabase
    .from('share_requests')
    .select('*, venues(name, city, state)')
    .eq('requester_profile_id', user.id)
    .order('created_at', { ascending: false })

  const pending = requests?.filter(r => r.status === 'pending') ?? []
  const approved = requests?.filter(r => r.status === 'approved') ?? []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back{profile?.display_name ? `, ${profile.display_name}` : ''}
        </h1>
        <p className="text-zinc-500 mt-0.5">Manage your venue packet requests.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Requests</CardDescription>
            <CardTitle className="text-3xl">{pending.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">awaiting venue response</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Approved Access</CardDescription>
            <CardTitle className="text-3xl">{approved.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">packets you can view</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Requests</CardDescription>
            <CardTitle className="text-3xl">{requests?.length ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">all time</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent requests */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent Requests</h2>
          <Link href="/artist/venues" className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}>
            Find a venue
          </Link>
        </div>

        {(!requests || requests.length === 0) ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-zinc-400 mb-4">No requests yet.</p>
              <Link href="/artist/venues" className={buttonVariants({ size: 'sm' })}>
                Find your first venue
              </Link>
            </CardContent>
          </Card>
        ) : (
          requests.slice(0, 5).map(r => (
            <Card key={r.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{(r.venues as { name: string; city: string | null; state: string | null } | null)?.name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {[(r.venues as { name: string; city: string | null; state: string | null } | null)?.city, (r.venues as { name: string; city: string | null; state: string | null } | null)?.state].filter(Boolean).join(', ')}
                      {r.event_date ? ` · ${new Date(r.event_date).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={r.status} />
                    {r.status === 'approved' && (
                      <Link
                        href={`/artist/packets/${r.venue_id}`}
                        className={cn(buttonVariants({ size: 'sm' }))}
                      >
                        View packet
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'text-yellow-600 border-yellow-300',
    approved: 'text-green-600 border-green-300',
    denied: 'text-red-500 border-red-300',
    revoked: 'text-zinc-400',
  }
  return (
    <Badge variant="outline" className={styles[status] ?? ''}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}
