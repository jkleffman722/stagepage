'use server'

import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function createAdvanceShare(advanceId: string, showId: string, label?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Only reuse existing advance-type shares (not day sheet shares)
  const { data: existing } = await supabase
    .from('advance_shares')
    .select('token')
    .eq('advance_id', advanceId)
    .eq('created_by', user.id)
    .eq('type', 'advance')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    const origin = (await headers()).get('origin') ?? ''
    return { token: existing.token, url: `${origin}/share/${existing.token}` }
  }

  const { data, error } = await supabase
    .from('advance_shares')
    .insert({
      advance_id: advanceId,
      show_id: showId,
      created_by: user.id,
      label: label ?? null,
      type: 'advance',
    })
    .select('token')
    .single()

  if (error) return { error: error.message }

  const origin = (await headers()).get('origin') ?? ''
  return { token: data.token, url: `${origin}/share/${data.token}` }
}

export async function createDaySheetShare(advanceId: string, showId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Only reuse existing day-sheet-type shares — never reuse an advance share token
  const { data: existing } = await supabase
    .from('advance_shares')
    .select('token')
    .eq('advance_id', advanceId)
    .eq('created_by', user.id)
    .eq('type', 'day_sheet')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    const origin = (await headers()).get('origin') ?? ''
    return { token: existing.token, url: `${origin}/share/day-sheet/${existing.token}` }
  }

  const { data, error } = await supabase
    .from('advance_shares')
    .insert({
      advance_id: advanceId,
      show_id: showId,
      created_by: user.id,
      label: 'Day Sheet',
      type: 'day_sheet',
    })
    .select('token')
    .single()

  if (error) return { error: error.message }

  const origin = (await headers()).get('origin') ?? ''
  return { token: data.token, url: `${origin}/share/day-sheet/${data.token}` }
}

export async function deleteAdvanceShare(token: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('advance_shares')
    .delete()
    .eq('token', token)
    .eq('created_by', user.id)

  if (error) return { error: error.message }
  return { success: true }
}
