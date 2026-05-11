'use server'

import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'
import type { ShowNote } from '@/lib/types'

export async function addShowNote(advanceId: string, body: string) {
  const trimmed = body.trim()
  if (!trimmed) return { error: 'Note body is required' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: advance } = await supabase
    .from('show_advances')
    .select('id, show_notes, show_id')
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()
  const authorName = profile?.display_name || user.email?.split('@')[0] || 'PM'

  const newNote: ShowNote = {
    id: randomUUID(),
    body: trimmed,
    created_at: new Date().toISOString(),
    created_by_name: authorName,
  }

  const existing: ShowNote[] = Array.isArray(advance.show_notes) ? advance.show_notes : []
  const updated = [...existing, newNote]

  const { error } = await supabase
    .from('show_advances')
    .update({ show_notes: updated })
    .eq('id', advanceId)

  if (error) return { error: error.message }
  return { success: true, note: newNote }
}
