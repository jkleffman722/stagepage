# StagePage — Architecture Reference

Stable technical reference. Update only when the data model, stack, or critical patterns change. For feature inventory, see `features.md`.

---

## What It Is

StagePage replaces the static venue tech packet PDF with a living, structured document — maintained by the venue and shared with artists on demand. Venues maintain one source of truth; artists get instant access to the exact data they need for advancing a show.

---

## The Two Sides

**Venue** — Creates a profile, builds their technical packet (structured fields across 11 sections), and manages access. When an artist requests access, the venue approves it. Always current — no more re-sending PDFs.

**Artist / Tour PM** — Creates tours and shows, requests access to venue packets, and uses the data to build their advance sheet. Sees structured fields, not PDFs. Can flag missing fields directly to the venue.

---

## Data Model

```
profiles (role: venue | artist)
  └── venues (many per profile)
        └── technical_packets (one per venue)
              └── packet_sections (11 sections, JSONB fields)
              └── packet_attachments (PDFs, floor plans)
        └── share_requests (pending | approved | denied | revoked)
              show_id nullable FK → shows (ON DELETE SET NULL)
        └── packet_field_requests (fields an artist has flagged as needed)

profiles (artist)
  └── tours
        └── shows (venue + date)
              └── show_advances (per-show advance fields + field_confirmations JSONB + show_notes JSONB, ON DELETE CASCADE)
              └── advance_shares (shareable read-only links, token-based, ON DELETE CASCADE)
        └── tech_riders (one per tour)
              └── tech_rider_sections (JSONB fields + field_sources JSONB)
        └── input_lists (one per tour)
              └── input_list_channels
```

---

## Technical Packet — Field Schema

11 sections, ~140 total fields, stored as JSONB in `packet_sections`:

| Section | Key Fields |
|---|---|
| Contacts | Production Manager, GM, Advance Contact, House Engineers |
| Show Schedule | Curfew, crew access windows |
| Stage | Dimensions, height, trim, fly system, rigging points |
| Audio | FOH/monitor consoles, PA system, IEM, wireless |
| Lighting | Console, fixture inventory, follow spots, haze |
| Video | LED wall, cameras, switcher |
| Power | Service type, available load, panel locations, shore power |
| Backline | DJ gear, rental contacts |
| Load-In & Parking | Dock specs, truck/bus parking, shore power |
| Crew & Labor | Union affiliation, mandatory crew, meal breaks |
| Hospitality | Dressing rooms, catering, WiFi, production office |

---

## Stack

- **Framework:** Next.js 16.2 (App Router, server components + server actions)
- **UI:** Tailwind CSS v4, shadcn built on `@base-ui/react` v4
- **Backend:** Supabase (Postgres + Auth + Storage + RLS)
- **AI:** Anthropic SDK — Claude Haiku for routing sheet parsing, venue PDF extraction, and tech rider PDF import; Sonnet for vision/hybrid PDF mode
- **PDF:** `pdfjs-dist` (text extraction), `pdf-to-img` (page rendering), `sharp` (compression); `window.print()` for in-app PDF export
- **Deployment:** Vercel (not yet deployed — currently localhost)

---

## Key Next.js 16 / shadcn Gotchas

- `middleware.ts` → renamed to `proxy.ts`, exported function named `proxy`
- No `asChild` on Button — use `buttonVariants()` directly on `<Link>`
- Select `onValueChange` receives `(value: string | null, eventDetails)` — handle null
- `cookies()` is async in Next.js 16 — must `await cookies()`
- Service role Supabase client: use `@supabase/supabase-js` `createClient` directly (not `@supabase/ssr`) with `SUPABASE_SERVICE_ROLE_KEY`
- Supabase join typing: `show.venues` may be returned as array — use `Array.isArray(show.venues) ? show.venues[0] : show.venues`

---

## Critical: share_requests Approval Query Pattern

The routing sheet import creates a **new** `share_requests` row (status `pending`) for every matched venue — even if an approved row already exists. There can be multiple rows per `(venue_id, requester_profile_id)` at different statuses.

**Never query by recency.** A recency query returns the newest `pending` row and appears to revoke the artist's access.

**Always filter by `status = 'approved'`:**
```js
supabase
  .from('share_requests')
  .select('status')
  .eq('venue_id', venueId)
  .eq('requester_profile_id', user.id)
  .eq('status', 'approved')
  .limit(1)
  .maybeSingle()
```

Used in: `advance/page.tsx`, `advance/print/page.tsx`, `packets/[venueId]/page.tsx`.

---

## Critical: advance_shares Type Isolation

`advance_shares` has a `type` column (`'advance'` | `'day_sheet'`). Tokens are never reused across types — prevents a day sheet recipient from navigating to the full advance.

**Always filter by type:**
```js
// Advance share
supabase.from('advance_shares').select('token')
  .eq('advance_id', advanceId).eq('created_by', user.id).eq('type', 'advance')

// Day sheet share
supabase.from('advance_shares').select('token')
  .eq('advance_id', advanceId).eq('created_by', user.id).eq('type', 'day_sheet')
```

Guard both share pages against wrong token types:
- `/share/[token]/page.tsx` — calls `notFound()` if `share.type === 'day_sheet'`
- `/share/day-sheet/[token]/page.tsx` — calls `notFound()` if `share.type === 'advance'`

---

## Seed Data & Test Accounts

- **Admin account:** `admin@admin.com` / `Admin1234` — 25 real venue tech packets seeded via extraction pipeline
- **Test artist:** `admin1@admin1.com` / `Admin1234` — approved share request for Red Rocks, seeded test tour (Aug 27, 2026 show)
- **Test routing sheet:** `data/test/test-routing-sheet.csv` — 25 shows across all seeded venues, Jun–Aug 2026

---

## Print / PDF Export Pattern

All four document types use the same pattern: a `../print` server route renders a clean print-formatted layout, and `PrintTrigger` (client component) auto-calls `window.print()` after a 400ms delay. The sidebar is hidden in print via `print:hidden`. No external PDF library needed.

- Tech Rider → `/routing/[tourId]/rider/print`
- Input List → `/routing/[tourId]/input-list/print`
- Advance Sheet → `/routing/[tourId]/shows/[showId]/advance/print`
- Day Sheet → `/routing/[tourId]/shows/[showId]/day-sheet/print`

---

## PDF Extraction Pipeline (`scripts/seed-venues.ts`)

- Local text extraction via `pdfjs-dist` (per-page, free)
- Three-mode routing: **Text** (rich PDF), **Hybrid** (text + images), **Vision** (scanned/image-only)
- Claude Haiku for extraction (~$0.005/venue)
- Image compression via `sharp` (under Claude's 5MB/image limit)
- Preview mode (`--preview`) with field coverage report before writing to Supabase
