import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TECH_RIDER_SECTIONS } from '@/lib/types'
import type { TechRiderSection } from '@/lib/types'
import { PrintTrigger } from '@/components/shared/PrintTrigger'

interface Props {
  params: Promise<{ tourId: string }>
}

export default async function TechRiderPrintPage({ params }: Props) {
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

  const { data: rider } = await supabase
    .from('tech_riders')
    .select('id, updated_at')
    .eq('tour_id', tourId)
    .single()

  if (!rider) notFound()

  const { data: sections } = await supabase
    .from('tech_rider_sections')
    .select('*')
    .eq('rider_id', rider.id)
    .order('sort_order')

  const sectionMap = new Map<string, TechRiderSection>(
    (sections ?? []).map(s => [s.section_key, s])
  )

  const generatedDate = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <>
      <PrintTrigger />
      <div className="bg-white text-zinc-900 font-sans p-10 max-w-4xl mx-auto print:p-0 print:max-w-none">

        {/* Header */}
        <div className="border-b-2 border-zinc-900 pb-4 mb-8">
          <h1 className="text-3xl font-bold tracking-tight">{tour.artist_name}</h1>
          <p className="text-lg text-zinc-600 mt-0.5">{tour.tour_name} — Technical Rider</p>
          <p className="text-xs text-zinc-400 mt-2">Generated {generatedDate}</p>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {TECH_RIDER_SECTIONS.map(sectionDef => {
            const section = sectionMap.get(sectionDef.key)
            if (!section) return null

            // Only render sections that have at least one filled field
            const populatedFields = sectionDef.fields.filter(f => {
              const val = section.fields?.[f.key]
              return val !== null && val !== undefined && val !== ''
            })
            if (populatedFields.length === 0) return null

            return (
              <div key={sectionDef.key} className="break-inside-avoid">
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 border-b border-zinc-200 pb-1.5 mb-4">
                  {sectionDef.label}
                </h2>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  {populatedFields.map(f => {
                    const val = section.fields?.[f.key]
                    const display = typeof val === 'boolean'
                      ? (val ? 'Yes' : 'No')
                      : String(val)
                    const isMultiline = display.includes('\n') || display.length > 80

                    return isMultiline ? (
                      <div key={f.key} className="col-span-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-0.5">{f.label}</p>
                        <p className="text-sm text-zinc-800 whitespace-pre-wrap">{display}</p>
                      </div>
                    ) : (
                      <div key={f.key}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-0.5">{f.label}</p>
                        <p className="text-sm text-zinc-800">{display}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-4 border-t border-zinc-200 text-xs text-zinc-400 flex justify-between">
          <span>{tour.artist_name} · {tour.tour_name}</span>
          <span>Technical Rider · {generatedDate}</span>
        </div>
      </div>
    </>
  )
}
