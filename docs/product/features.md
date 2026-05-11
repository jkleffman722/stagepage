# StagePage — Feature Inventory

What's been built. Updated by the product-builder after every shipped feature. For technical patterns and data model, see `architecture.md`.

---

## Auth & Onboarding
- Supabase Auth (email/password), role selection at signup (`venue` or `artist`)
- Venue onboarding form
- Multi-venue support per account — cookie-based active venue switching (`spv` cookie) with sidebar dropdown

---

## Venue Side (`/venue/`)

- **Dashboard** — stats overview
- **Technical Packet** — full section editor (`PacketSectionEditor`) with field-level anchor navigation, confidence badges, publish/unpublish toggle
- **Packet Create** — guided creation flow
- **Share Requests** — approve/deny/revoke artist access (tabs: pending / approved / past)
- **Field Requests** — when a PM flags missing fields from the advance sheet, they appear on the venue packet page with blue highlighting on blank fields, anchor links directly to the field, and a "Mark as addressed" action per request (`MarkRequestAddressed`)
- **Documents** — attachment management (`DocumentManager`)
- **Settings** — venue profile settings (`VenueSettingsForm`)

---

## Artist Side (`/artist/`)

### Dashboard
PM work queue: upcoming shows across all tours, sorted by date proximity and grouped into 3 horizons (Next 7 days / 8–30 days / Beyond 30 days). Each show card displays a health indicator (critical / warning / in progress / ready / no venue) and a single context-aware CTA. Health computed from: venue assigned → packet status → advance started → advance completeness.

### Routing (`/artist/routing`)
Flat chronological list of all shows across all tours — the primary show management view.
- All shows sorted by date, split into Upcoming / Past sections
- Tour filter chips with `⋯` context menu linking to that tour's Tech Rider and Input List
- `+ New tour` chip opens inline tour creation modal
- **Import Routing Sheet** (`RoutingImportModal`) — paste/upload toggle. Accepts plain text, CSV, XLSX/XLS (SheetJS), or PDF (base64 → Claude Haiku document API). Claude fuzzy-matches venues against DB (0.75=high / 0.45=low), shows preview with confidence badges, lets PM exclude shows, then bulk-imports with automatic share requests for matched venues.
- **Add Show** button — tour selector + date picker modal
- **Expandable lifecycle panel** — 4-stage horizontal stepper per show row:
  1. **Venue** — assigned or actionable link to assign
  2. **Tech Packet** — done / pending / denied / revoked / not requested, with action link and PDF attachment downloads
  3. **Advance Sheet** — locked until packet steps complete; not started / in progress (field count) / done
  4. **Day Sheet** — unlocks as soon as an advance record exists
- **Next-action status label** — specific instruction rather than vague health state: "Assign a venue" / "Request venue tech packet" / "Waiting on packet approval" / etc.
- **Confirmation progress** — compact progress bar + `X/12` count inline on show row; expanded panel shows `X/12 confirmed`; turns emerald at 12/12
- **Primary contact** — inline below city/state; pulls `production_manager` from packet contacts if approved, falls back to venue owner profile
- Trash icon with confirm step; FK cascade cleans up `share_requests`

### Tech Rider (`/routing/[tourId]/rider`)
Structured tour-level technical requirements across 11 sections (Tour Info, Stage Requirements, Audio, Lighting, Power, Labor Defaults, Video, Hospitality, Backline, Production Notes, IEM/Wireless).
- **PDF import** (`RiderImportButton` / `RiderImportModal`) — upload PDF → Claude Haiku extracts fields with confidence levels. Preview shows 3-column summary (Extracted / Not found / Review needed).
- **Confidence badges** — red "Low confidence — verify" for flagged fields, amber "Review" for medium; cleared on manual save
- **Manual entry label** — "Manually entered on MM/DD/YYYY" for PM-typed fields since last import
- **`field_sources` JSONB** on `tech_rider_sections` — per-field provenance: `{ type: 'imported', confidence: 'low'|'medium', importedAt }` or `{ type: 'manual', enteredAt }`
- **PDF download** — `.../rider/print` auto-triggers `window.print()`

### Input List (`/routing/[tourId]/input-list`)
Channel-by-channel editor (channel number, source name, input type, mic/DI model, 48V phantom, stage location, monitor mixes, notes). Auto-syncs channel + mix counts back to tech rider on save. PDF download at `.../input-list/print`.

### Show Advance (`/routing/[tourId]/shows/[showId]/advance`)
The single destination for all advance work. Auto-populates from venue packet + tech rider + input list.
- **Hot Points** — 12 critical fields at top (stage dims, trim height, curfew, union, power service, etc.)
- **Source badges** — every field labeled: Venue Packet (blue) / Tech Rider (violet) / Input List (amber) / Show (gray)
- **Conflict panel** (`src/lib/conflicts.ts`) — automated detection of rider vs. venue conflicts, grouped by severity (critical / warning / missing). 10 rules covering stage dims, power phase, curfew, haze, consoles, forklift, shore power, upstage black.
- **Pre-Advance Checks** — 24 curated critical items (power, audio, lighting, schedule, labor, load-in, production), side-by-side rider vs. venue values
- **Field request queue** — PM hovers any blank venue packet field and clicks "+ Request" to queue it. Sticky bar at bottom to review, add note, and send batch request to venue.
- **Confirmation tracking** — "Confirm" button on any field with a value. Popover logs: method (Phone / Email / In-person / Text / Other) + optional note. Saves to `field_confirmations` JSONB on `show_advances`. Confirmed fields show persistent green badge. `FieldConfirmation` shape: `{ confirmedAt, confirmedBy, method, note? }`. Keys use `section.field_key` for packet/rider fields and flat `field_key` for advance-level fields.
- **Hot Points progress** — live `X/12 confirmed` bar in Hot Points header; turns emerald at 12/12
- **Share & Export** (`ShareAdvanceButton`) — PDF download (`.../advance/print`) and shareable token link (`/share/[token]`). Share is read-only, no account required, revocable.
- **Schedule fields** — `load_in_call`, `crew_call`, `support_soundcheck`, `opener_set_time`, `doors_time`, `show_start_time`, `set1_duration`, `set_break`, `set2_duration`, `encore_duration`, `curfew_time`

### Show Notes / Communication Log
Append-only internal log per show. Visible on advance sheet before Hot Points. Never on share page or day sheet.
- `ShowNotesLog` component — textarea with ⌘↵ shortcut; notes display newest-first; optimistic update
- `addShowNote(advanceId, body)` server action — appends to `show_notes` JSONB array; verifies ownership via show → tour chain
- `ShowNote` shape: `{ id, body, created_at, created_by_name }`
- Print: excluded by default; "Include internal notes (PM only)" checkbox in Share & Export popover appends `?notes=1`
- "— internal log, not shared" label inline on card header

### Day Sheet (`/routing/[tourId]/shows/[showId]/day-sheet`)
Operational show-day document generated from advance data.
- **Day-of Notes** — amber-highlighted autosaving textarea at top. Saves to `show_advances.fields.day_sheet_notes`. Renders in print + share views.
- **Call Times table** — most prominent section. Full order: Earliest Crew Access, Load-In Call, Crew Call, Load-In Window, Soundcheck, Support Soundcheck, Opener Set, Doors, Show Start, Set 1/Break/Set 2/Encore, Show End, Hard Curfew (amber ⚠), Load-Out, Must Clear By. Empty entries suppressed.
- **Show Info** — Promoter/Rep, Settlement Contact, Deal Type
- **Venue + Tour Contacts** — side-by-side
- **Venue & Load-In** — address, dock bays/height, access notes, truck/bus parking, dead case storage, shore power
- **Key Logistics** — union + min stagehands, meal break rules, power service, SPL limit
- **Print** — compact two-column page at `/day-sheet/print`. Hard curfew amber. Confirmed fields show ✓ date; unconfirmed critical fields show `** UNCONFIRMED **`.
- **Share link** — token at `/share/day-sheet/[token]`. Mobile-first, read-only, no account required. `type: 'day_sheet'` in `advance_shares` — isolated from advance tokens.

### My Packets (`/artist/packets`)
Browse venue packets the artist has been granted access. Full structured viewer with search, PDF downloads, contact info.

---

## Navigation

- Sidebar: **Dashboard** → **Routing** → **Settings**
- `/shows/[showId]` redirects directly to `/shows/[showId]/advance`
- Advance sheet, tech rider, input list all back-nav to `/artist/routing`
- Tech rider and input list reachable via `⋯` context menu on tour filter chips

---

## Conflict Detection (`src/lib/conflicts.ts`)

Rule-based engine comparing tour tech rider vs. venue packet. Produces `Conflict[]` with `id`, `severity` (critical / warning / missing), `category`, `label`, `riderValue`, `venueValue`, `message`.

10 rules: stage width, stage depth, power phase (3-phase detection across 6 fields, handles written forms + Unicode phase symbols), hard curfew (always missing if empty), haze policy, console tie-in, house console removal, forklift, shore power, upstage black.

---

## Supabase Migrations

| Migration | Description |
|---|---|
| `schema.sql` | Base tables |
| `002_tech_rider.sql` | Tech rider tables |
| `003_input_list.sql` | Input list |
| `004_show_advance.sql` | Show advance fields (ON DELETE CASCADE) |
| `005_packet_field_requests.sql` | PM → venue field request workflow (show_id ON DELETE SET NULL) |
| `006_advance_shares.sql` | Shareable advance links (token-based, public read, revocable) |
| `007_rider_field_sources.sql` | `field_sources JSONB` on `tech_rider_sections` |
| `008_fix_show_fk_cascades.sql` | `share_requests.show_id` FK to use ON DELETE SET NULL |
| `009_field_confirmations.sql` | `field_confirmations JSONB NOT NULL DEFAULT '{}'` on `show_advances` |
| `010_advance_share_type.sql` | `type TEXT NOT NULL DEFAULT 'advance'` on `advance_shares` |
| `011_show_notes.sql` | `show_notes JSONB NOT NULL DEFAULT '[]'` on `show_advances` |

---

## Known Gaps

1. **Advance sheet field tailoring** — share link exposes all populated fields; should be configurable by audience (LD gets lighting, FOH gets audio). Roadmap: P1.
2. **Show Day View (mobile-first)** — current advance sheet is desktop. Roadmap: P1.
3. **Vercel deployment** — all work is on localhost only.
4. **Calendar** — placeholder exists, not built.
5. **Tech rider import for input list** — PDF import built for tech rider only; input list has no import flow.
