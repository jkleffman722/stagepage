/**
 * Seeds a test tour + show at Red Rocks + tech rider for conflict detection testing.
 * Run: npx tsx scripts/seed-test-tour.ts
 * Run with --clean to remove all seeded test data first.
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const ADMIN_USER_ID = '39da9faa-e3eb-404b-8db6-61fb1959c42b'
const VENUE_OWNER_ID = '69a0da4c-3f7f-4f15-9e9d-982a3e09d657'
const TEST_TOUR_NAME = '[TEST] Conflict Detection Tour'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ── Clean ─────────────────────────────────────────────────────────────────────

async function clean() {
  console.log('Cleaning existing test data...')
  const { data: tours } = await supabase
    .from('tours')
    .select('id')
    .eq('profile_id', ADMIN_USER_ID)
    .eq('tour_name', TEST_TOUR_NAME)
  if (tours?.length) {
    await supabase.from('tours').delete().in('id', tours.map(t => t.id))
    console.log(`  Deleted ${tours.length} tour(s) and cascaded shows, riders, requests.`)
  } else {
    console.log('  Nothing to clean.')
  }
}

// ── Seed ──────────────────────────────────────────────────────────────────────

async function seed() {
  // 1. Find Red Rocks venue
  const { data: venues } = await supabase
    .from('venues')
    .select('id, name')
    .eq('owner_id', VENUE_OWNER_ID)
    .ilike('name', '%Red Rocks%')
    .limit(1)

  const venue = venues?.[0]
  if (!venue) throw new Error('Red Rocks venue not found — run seed-venues.ts first')
  console.log(`Using venue: ${venue.name} (${venue.id})`)

  // 2. Create tour
  const { data: tour, error: tourErr } = await supabase
    .from('tours')
    .insert({
      profile_id: ADMIN_USER_ID,
      tour_name: TEST_TOUR_NAME,
      artist_name: 'Test Artist',
      is_active: true,
    })
    .select('id')
    .single()
  if (tourErr) throw new Error(`Tour insert: ${tourErr.message}`)
  console.log(`Created tour: ${tour.id}`)

  // 3. Create show at Red Rocks
  const { data: show, error: showErr } = await supabase
    .from('shows')
    .insert({
      tour_id: tour.id,
      venue_id: venue.id,
      event_date: '2026-08-27',
    })
    .select('id')
    .single()
  if (showErr) throw new Error(`Show insert: ${showErr.message}`)
  console.log(`Created show: ${show.id}`)

  // 4. Approved share request so advance sheet can read venue packet
  const { error: reqErr } = await supabase
    .from('share_requests')
    .insert({
      venue_id: venue.id,
      requester_profile_id: ADMIN_USER_ID,
      requester_email: 'admin@admin.com',
      requester_name: 'Admin (Test)',
      show_id: show.id,
      event_date: '2026-08-27',
      status: 'approved',
      message: 'Test advance for conflict detection',
    })
  if (reqErr) throw new Error(`Share request insert: ${reqErr.message}`)
  console.log('Created approved share request')

  // 5. Tech rider
  const { data: rider, error: riderErr } = await supabase
    .from('tech_riders')
    .insert({ tour_id: tour.id })
    .select('id')
    .single()
  if (riderErr) throw new Error(`Rider insert: ${riderErr.message}`)
  console.log(`Created tech rider: ${rider.id}`)

  // 6. Rider sections — values chosen to trigger realistic conflicts
  const sections = [
    {
      section_key: 'tour_info',
      section_label: 'Tour Info',
      sort_order: 0,
      fields: {
        tour_manager: 'Jamie Raines · 555-0101 · jamie@tour.com',
        production_manager: 'Alex Mercer · 555-0102 · alex@tour.com',
        bus_count: '3',       // → triggers shore power missing check
        truck_count: '4 Semi / 1 Box',
      },
    },
    {
      section_key: 'stage_requirements',
      section_label: 'Stage Requirements',
      sort_order: 1,
      fields: {
        min_stage_width: "70'",   // → Red Rocks is ~65' wide — triggers critical stage width conflict
        min_stage_depth: "35'",   // → likely fine at Red Rocks, no conflict
        risers_needed: "(2) 8'×4' @ 8\" for keyboards and drums",
        upstage_black: true,      // → Red Rocks has natural rock backdrop — triggers warning
        dead_storage_needs: 'Full truck of empties, approximately 30 cases',
      },
    },
    {
      section_key: 'audio',
      section_label: 'Audio',
      sort_order: 2,
      fields: {
        foh_console: 'DiGiCo SD12 (tour carries)',
        monitor_console: 'DiGiCo SD9 (tour carries)',
        main_hang: 'L-Acoustics K2 (tour carries)',
        sub: 'L-Acoustics KS28 × 12 (tour carries)',
        house_consoles_removed: true,  // → triggers console removal warning
        venue_audio_requirements: 'Touring console tie-in required at FOH position. Venue to provide 96-channel tie-in snake from stage to FOH.',  // → triggers tie-in check
        required_channel_count: 48,
        required_monitor_mixes: 8,
      },
    },
    {
      section_key: 'lighting',
      section_label: 'Lighting',
      sort_order: 3,
      fields: {
        haze_allowed: true,   // → triggers haze policy check against Red Rocks
        haze_notes: 'Full-tour haze required throughout show. Fire watch on standby.',
        house_rig_struck: true,
        tour_ld: 'Taylor Voss',
      },
    },
    {
      section_key: 'power',
      section_label: 'Power',
      sort_order: 4,
      fields: {
        required_service_type: 'Three-phase',  // → triggers power service check if venue unclear
        lx_rigging_power: '(3) 400A 3-phase within 50′ DSR',
        audio_power: '(2) 200A 3-phase within 50′ DSL and DSR',
        video_power: '(1) 100A 3-phase at audio distro',
      },
    },
    {
      section_key: 'labor_defaults',
      section_label: 'Labor',
      sort_order: 5,
      fields: {
        forklift: 1,           // → triggers forklift check
        head_rigger: '1 · 1 · 1',
        up_riggers: 8,
        first_call_total: 18,
        first_call_breakdown: '8 LX · 6 Audio · 4 Video',
        load_out_total: 22,
      },
    },
  ]

  const { error: sectErr } = await supabase
    .from('tech_rider_sections')
    .insert(sections.map(s => ({ ...s, rider_id: rider.id })))
  if (sectErr) throw new Error(`Rider sections insert: ${sectErr.message}`)
  console.log(`Inserted ${sections.length} rider sections`)

  console.log('\n✅ Done. Test data seeded.')
  console.log(`\n  Tour ID:   ${tour.id}`)
  console.log(`  Show ID:   ${show.id}`)
  console.log(`  Rider ID:  ${rider.id}`)
  console.log(`\n  Advance sheet URL:`)
  console.log(`  /artist/tours/${tour.id}/shows/${show.id}/advance`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (process.argv.includes('--clean')) {
    await clean()
    return
  }
  await clean() // always clean first to avoid duplicates
  await seed()
}

main().catch(err => { console.error(err); process.exit(1) })
