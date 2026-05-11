'use server'

import { createClient } from '@/lib/supabase/server'

export async function saveDaySheetNotes(advanceId: string, notes: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: advance } = await supabase
    .from('show_advances')
    .select('id, fields, show_id')
    .eq('id', advanceId)
    .single()
  if (!advance) return { error: 'Advance not found' }

  // Verify ownership via show → tour
  const { data: show } = await supabase
    .from('shows')
    .select('tour_id')
    .eq('id', advance.show_id)
    .single()
  if (!show) return { error: 'Show not found' }

  const { data: tour } = await supabase
    .from('tours')
    .select('profile_id')
    .eq('id', show.tour_id)
    .single()
  if (!tour || tour.profile_id !== user.id) return { error: 'Unauthorized' }

  const updatedFields = { ...(advance.fields ?? {}), day_sheet_notes: notes }

  const { error } = await supabase
    .from('show_advances')
    .update({ fields: updatedFields })
    .eq('id', advance.id)

  if (error) return { error: error.message }
  return { success: true }
}
