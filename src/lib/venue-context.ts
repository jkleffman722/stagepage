import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

export const ACTIVE_VENUE_COOKIE = 'spv'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getActiveVenue(
  supabase: SupabaseClient,
  userId: string,
  select = '*'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const { data: venues } = await supabase
    .from('venues')
    .select(select)
    .eq('owner_id', userId)
    .order('created_at')

  if (!venues || (venues as unknown[]).length === 0) return null

  const cookieStore = await cookies()
  const activeId = cookieStore.get(ACTIVE_VENUE_COOKIE)?.value

  if (activeId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const match = (venues as any[]).find((v: any) => v.id === activeId)
    if (match) return match
  }

  return (venues as unknown[])[0]
}
