import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RiderSectionEditor } from '@/components/artist/RiderSectionEditor'
import { TECH_RIDER_SECTIONS } from '@/lib/types'
import type { TechRiderSection } from '@/lib/types'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface Props {
  params: Promise<{ tourId: string }>
}

export default async function TechRiderPage({ params }: Props) {
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

  // Get or create tech rider for this tour
  let { data: rider } = await supabase
    .from('tech_riders')
    .select('id, updated_at')
    .eq('tour_id', tourId)
    .single()

  if (!rider) {
    const { data: newRider, error } = await supabase
      .from('tech_riders')
      .insert({ tour_id: tourId })
      .select('id, updated_at')
      .single()

    if (error || !newRider) {
      throw new Error('Failed to create tech rider')
    }
    rider = newRider

    // Pre-populate all sections with their default values
    const defaultSections = TECH_RIDER_SECTIONS
      .map((sectionDef, index) => {
        const fields: Record<string, string | number | boolean | null> = {}
        sectionDef.fields.forEach(f => {
          fields[f.key] = f.defaultValue !== undefined ? f.defaultValue : null
        })
        const hasAnyDefault = Object.values(fields).some(v => v !== null)
        if (!hasAnyDefault) return null
        return {
          rider_id: newRider.id,
          section_key: sectionDef.key,
          section_label: sectionDef.label,
          fields,
          sort_order: index,
        }
      })
      .filter(Boolean)

    if (defaultSections.length > 0) {
      await supabase.from('tech_rider_sections').insert(defaultSections)
    }
  }

  const { data: sections } = await supabase
    .from('tech_rider_sections')
    .select('*')
    .eq('rider_id', rider.id)
    .order('sort_order')

  const sectionMap = new Map<string, TechRiderSection>(
    (sections ?? []).map(s => [s.section_key, s])
  )

  // Completion stats
  const totalFields = TECH_RIDER_SECTIONS.reduce((acc, s) => acc + s.fields.length, 0)
  const filledFields = TECH_RIDER_SECTIONS.reduce((acc, sectionDef) => {
    const section = sectionMap.get(sectionDef.key)
    if (!section) return acc
    return acc + sectionDef.fields.filter(f => {
      const val = section.fields?.[f.key]
      return val !== null && val !== '' && val !== undefined
    }).length
  }, 0)
  const pct = Math.round((filledFields / totalFields) * 100)
  const isComplete = filledFields === totalFields

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
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tech Rider</h1>
          <p className="text-zinc-500 mt-0.5 text-sm">
            {tour.artist_name} · Last updated {new Date(rider.updated_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Completion bar */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-zinc-700">
            {isComplete ? 'Rider complete' : `${filledFields} of ${totalFields} fields filled in`}
          </p>
          <span className={`text-sm font-semibold ${isComplete ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-zinc-400'}`}>
            {pct}%
          </span>
        </div>
        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isComplete ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-400' : 'bg-zinc-300'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {!isComplete && (
          <p className="text-xs text-zinc-400 mt-2">
            Fill in your touring production&apos;s defaults once — this data auto-populates advance sheets for every show.
          </p>
        )}
      </div>

      {/* Section editors */}
      <div className="space-y-4">
        {TECH_RIDER_SECTIONS.map((sectionDef, index) => {
          const existing = sectionMap.get(sectionDef.key)
          return (
            <RiderSectionEditor
              key={`${sectionDef.key}-${existing?.updated_at ?? 'empty'}`}
              riderId={rider.id}
              sectionDef={sectionDef}
              existingSection={existing ?? null}
              sortOrder={index}
            />
          )
        })}
      </div>
    </div>
  )
}
