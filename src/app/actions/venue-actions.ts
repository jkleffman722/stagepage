'use server'

import { cookies } from 'next/headers'
import { ACTIVE_VENUE_COOKIE } from '@/lib/venue-context'

export async function switchVenue(venueId: string) {
  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_VENUE_COOKIE, venueId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
}
