import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InputListEditor } from '@/components/artist/InputListEditor'
import type { InputListChannel } from '@/lib/types'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface Props {
  params: Promise<{ tourId: string }>
}

export default async function InputListPage({ params }: Props) {
  const { tourId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: tour } = await supabase
    .from('tours')
    .select('id, tour_name, artist_name')
    .eq('id', tourId)
    .eq('profile_id', user.id)
    .single()

  if (!tour) notFound()

  // Get or create input list
  let { data: list } = await supabase
    .from('input_lists')
    .select('id, updated_at')
    .eq('tour_id', tourId)
    .single()

  if (!list) {
    const { data: newList, error } = await supabase
      .from('input_lists')
      .insert({ tour_id: tourId })
      .select('id, updated_at')
      .single()

    if (error || !newList) throw new Error('Failed to create input list')
    list = newList
  }

  const { data: channels } = await supabase
    .from('input_list_channels')
    .select('*')
    .eq('list_id', list.id)
    .order('sort_order')

  // Get rider ID so we can auto-update channel count + monitor mixes on save
  const { data: rider } = await supabase
    .from('tech_riders')
    .select('id')
    .eq('tour_id', tourId)
    .single()

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/artist/tours/${tourId}`}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-600 mb-4 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {tour.tour_name}
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Input List</h1>
            <p className="text-zinc-500 mt-0.5 text-sm">
              {tour.artist_name} · Last updated {new Date(list.updated_at).toLocaleDateString()}
            </p>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            {(channels ?? []).length} channels
          </p>
        </div>
      </div>

      <InputListEditor
        listId={list.id}
        riderId={rider?.id ?? null}
        initialChannels={(channels ?? []) as InputListChannel[]}
      />
    </div>
  )
}
