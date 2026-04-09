import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, Music2, ChevronRight } from 'lucide-react'

export default async function ToursPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: tours } = await supabase
    .from('tours')
    .select('id, artist_name, tour_name, user_role, created_at')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })

  // Get show counts per tour
  const tourIds = (tours ?? []).map(t => t.id)
  const { data: showCounts } = tourIds.length > 0
    ? await supabase
        .from('shows')
        .select('tour_id')
        .in('tour_id', tourIds)
    : { data: [] }

  const countByTour = (showCounts ?? []).reduce<Record<string, number>>((acc, s) => {
    acc[s.tour_id] = (acc[s.tour_id] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tours</h1>
          <p className="mt-1 text-zinc-500 text-sm">Manage your tours and shows.</p>
        </div>
        <Link href="/artist/tours/new">
          <Button>
            <Plus className="h-4 w-4 mr-1.5" />
            New Tour
          </Button>
        </Link>
      </div>

      {!tours || tours.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-zinc-200 py-20 text-center">
          <Music2 className="h-8 w-8 text-zinc-300 mx-auto mb-3" />
          <p className="text-zinc-400 mb-4">No tours yet. Create your first tour to get started.</p>
          <Link href="/artist/tours/new">
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-1.5" />
              Create Tour
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {tours.map(tour => {
            const showCount = countByTour[tour.id] ?? 0
            return (
              <Link key={tour.id} href={`/artist/tours/${tour.id}`}>
                <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 hover:border-zinc-300 hover:shadow-sm transition-all cursor-pointer">
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900 truncate">{tour.tour_name}</p>
                    <p className="text-sm text-zinc-500 mt-0.5">{tour.artist_name}</p>
                    {tour.user_role && (
                      <p className="text-xs text-zinc-400 mt-0.5">{tour.user_role}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-zinc-700">{showCount}</p>
                      <p className="text-xs text-zinc-400">{showCount === 1 ? 'show' : 'shows'}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
