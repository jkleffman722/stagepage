import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ tourId: string; showId: string }>
}

export default async function ShowDetailPage({ params }: Props) {
  const { tourId, showId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Verify ownership before redirecting
  const { data: show } = await supabase
    .from('shows')
    .select('id')
    .eq('id', showId)
    .eq('tour_id', tourId)
    .single()
  if (!show) notFound()

  redirect(`/artist/routing/${tourId}/shows/${showId}/advance`)
}
