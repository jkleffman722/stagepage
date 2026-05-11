'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

export async function parseRoutingPDF(base64: string): Promise<{ text: string; error?: string }> {
  const client = new Anthropic()
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          } as unknown as Anthropic.TextBlockParam,
          {
            type: 'text',
            text: 'Extract all show routing information from this document. Return only the raw text of the routing data — dates, venue names, cities, states. No explanation, no formatting, just the raw routing text.',
          },
        ],
      }],
    })
    const text = (response.content[0] as { type: string; text: string }).text.trim()
    return { text }
  } catch {
    return { text: '', error: 'Failed to extract text from PDF.' }
  }
}

interface ParsedShow {
  date: string        // YYYY-MM-DD
  venue_name: string
  city: string | null
  state: string | null
}

interface MatchedShow extends ParsedShow {
  matched_venue_id: string | null
  matched_venue_name: string | null
  match_confidence: 'high' | 'low' | 'none'
}

export async function parseRoutingSheet(text: string): Promise<{ shows: MatchedShow[]; error?: string }> {
  const client = new Anthropic()

  let parsed: ParsedShow[] = []

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      system: 'You are a data extraction assistant. You output only valid JSON arrays, never markdown, never explanations.',
      messages: [{
        role: 'user',
        content: `Parse this routing sheet and return a JSON array. Each element must have:
- date: ISO date string YYYY-MM-DD (convert from any format)
- venue_name: string (venue/club/theater name only, not city)
- city: string or null
- state: string or null (2-letter US state code if applicable)

Output ONLY the raw JSON array starting with [ and ending with ]. No markdown fences, no explanation.

Routing sheet:
${text}`,
      }],
    })

    const raw = (response.content[0] as { type: string; text: string }).text.trim()

    // Strip markdown code fences if present
    const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    const start = stripped.indexOf('[')
    const end = stripped.lastIndexOf(']')
    if (start === -1 || end === -1) {
      console.error('parseRoutingSheet: no JSON array in response:', stripped.slice(0, 200))
      return { shows: [], error: 'Failed to parse routing sheet. Make sure it contains dates and venue names.' }
    }

    parsed = JSON.parse(stripped.slice(start, end + 1)) as ParsedShow[]
  } catch (err) {
    console.error('parseRoutingSheet error:', err)
    return { shows: [], error: 'Failed to parse routing sheet. Make sure it contains dates and venue names.' }
  }

  // Fetch all venues for matching
  const supabase = await createClient()
  const { data: venues } = await supabase
    .from('venues')
    .select('id, name, city, state')

  const allVenues = venues ?? []

  // Fuzzy match each parsed show against our venue list
  const matched: MatchedShow[] = parsed
    .filter(s => s.date && s.venue_name)
    .map(show => {
      const venueLower = show.venue_name.toLowerCase().replace(/[^a-z0-9 ]/g, '')

      let bestMatch: typeof allVenues[0] | null = null
      let bestScore = 0

      for (const venue of allVenues) {
        const nameLower = venue.name.toLowerCase().replace(/[^a-z0-9 ]/g, '')
        const score = similarity(venueLower, nameLower)
        if (score > bestScore) {
          bestScore = score
          bestMatch = venue
        }
      }

      const confidence = bestScore >= 0.75 ? 'high' : bestScore >= 0.45 ? 'low' : 'none'

      return {
        ...show,
        matched_venue_id: confidence !== 'none' ? bestMatch!.id : null,
        matched_venue_name: confidence !== 'none' ? bestMatch!.name : null,
        match_confidence: confidence,
      }
    })

  return { shows: matched }
}

export async function importRoutingShows(
  tourId: string,
  shows: Array<{ date: string; venue_id: string | null }>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify tour ownership
  const { data: tour } = await supabase
    .from('tours')
    .select('id')
    .eq('id', tourId)
    .eq('profile_id', user.id)
    .single()
  if (!tour) return { error: 'Tour not found' }

  const inserts = shows.map(s => ({
    tour_id: tourId,
    event_date: s.date,
    venue_id: s.venue_id ?? null,
  }))

  const { error } = await supabase.from('shows').insert(inserts)
  if (error) return { error: error.message }

  // For shows with venues, create share requests
  const showsWithVenues = shows.filter(s => s.venue_id)
  if (showsWithVenues.length > 0) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()

    // Fetch the newly created show IDs
    const { data: newShows } = await supabase
      .from('shows')
      .select('id, event_date, venue_id')
      .eq('tour_id', tourId)
      .in('event_date', showsWithVenues.map(s => s.date))
      .not('venue_id', 'is', null)

    if (newShows && newShows.length > 0) {
      const requests = newShows.map(s => ({
        venue_id: s.venue_id,
        requester_profile_id: user.id,
        requester_name: profile?.display_name ?? null,
        requester_email: '',
        event_date: s.event_date,
        show_id: s.id,
      }))

      await supabase.from('share_requests').insert(requests)
    }
  }

  return { success: true, count: inserts.length }
}

// Simple token-based similarity score
function similarity(a: string, b: string): number {
  if (a === b) return 1
  if (a.includes(b) || b.includes(a)) return 0.85

  const aWords = new Set(a.split(' ').filter(w => w.length > 2))
  const bWords = new Set(b.split(' ').filter(w => w.length > 2))
  if (aWords.size === 0 || bWords.size === 0) return 0

  let overlap = 0
  for (const word of aWords) {
    if (bWords.has(word)) overlap++
  }
  return (2 * overlap) / (aWords.size + bWords.size)
}
