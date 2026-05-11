import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { InputListChannel } from '@/lib/types'
import { PrintTrigger } from '@/components/shared/PrintTrigger'

interface Props {
  params: Promise<{ tourId: string }>
}

export default async function InputListPrintPage({ params }: Props) {
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

  const { data: list } = await supabase
    .from('input_lists')
    .select('id, updated_at')
    .eq('tour_id', tourId)
    .single()

  if (!list) notFound()

  const { data: channels } = await supabase
    .from('input_list_channels')
    .select('*')
    .eq('list_id', list.id)
    .order('sort_order')

  const rows = (channels ?? []) as InputListChannel[]
  const generatedDate = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <>
      <PrintTrigger />
      <div className="bg-white text-zinc-900 font-sans p-10 max-w-5xl mx-auto print:p-0 print:max-w-none">

        {/* Header */}
        <div className="border-b-2 border-zinc-900 pb-4 mb-8">
          <h1 className="text-3xl font-bold tracking-tight">{tour.artist_name}</h1>
          <p className="text-lg text-zinc-600 mt-0.5">{tour.tour_name} — Input List</p>
          <div className="flex items-center gap-6 mt-2 text-xs text-zinc-400">
            <span>{rows.length} channels</span>
            <span>Generated {generatedDate}</span>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-zinc-400 text-sm">No channels added yet.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-zinc-900">
                <th className="text-left py-2 pr-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 w-10">Ch</th>
                <th className="text-left py-2 pr-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Source</th>
                <th className="text-left py-2 pr-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Type</th>
                <th className="text-left py-2 pr-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Mic / DI</th>
                <th className="text-center py-2 pr-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 w-12">48V</th>
                <th className="text-left py-2 pr-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Location</th>
                <th className="text-left py-2 pr-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Mixes</th>
                <th className="text-left py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((ch, i) => (
                <tr
                  key={ch.id}
                  className={i % 2 === 0 ? 'bg-white' : 'bg-zinc-50'}
                >
                  <td className="py-1.5 pr-3 font-mono font-semibold text-zinc-500 align-top">
                    {ch.channel_number ?? i + 1}
                  </td>
                  <td className="py-1.5 pr-3 font-medium align-top">{ch.source_name ?? '—'}</td>
                  <td className="py-1.5 pr-3 text-zinc-600 align-top">{ch.input_type ?? '—'}</td>
                  <td className="py-1.5 pr-3 text-zinc-600 align-top">{ch.mic_model ?? '—'}</td>
                  <td className="py-1.5 pr-3 text-center align-top">
                    {ch.phantom_power === true ? '✓' : ch.phantom_power === false ? '' : '—'}
                  </td>
                  <td className="py-1.5 pr-3 text-zinc-600 align-top">{ch.stage_location ?? '—'}</td>
                  <td className="py-1.5 pr-3 text-zinc-600 align-top">{ch.monitor_mixes ?? '—'}</td>
                  <td className="py-1.5 text-zinc-500 align-top">{ch.notes ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Footer */}
        <div className="mt-12 pt-4 border-t border-zinc-200 text-xs text-zinc-400 flex justify-between">
          <span>{tour.artist_name} · {tour.tour_name}</span>
          <span>Input List · {generatedDate}</span>
        </div>
      </div>
    </>
  )
}
