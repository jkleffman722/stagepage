# StagePage Product Roadmap

This document is informed by the Tour PM agent's assessment of StagePage as of April 2026. Items are ordered by impact on the core use case: a working PM who needs to stop using Google Docs and email to run their tour.

---

## Priority Framework

- **P0 — Blocker**: StagePage is not a complete tool without this. PM still has to use something else.
- **P1 — Differentiator**: This is what makes StagePage worth paying for over a spreadsheet.
- **P2 — Trust**: This is what makes the data inside StagePage believable.
- **P3 — Expansion**: New workflow territory — valuable but not on the critical path.

---

## P0 — Blockers (Complete the Core Loop)

### ~~Day Sheet Generator~~ ✅ COMPLETE (Apr 2026)
**The PM's words:** *"The advance sheet is the input. The day sheet is what my crew holds in their hands. Until the day sheet exists, StagePage is a better place to store my advance info — it's not yet a tool that replaces anything."*

The advance sheet is already built. The day sheet is the output the PM actually distributes on show day. Without it, StagePage ends 80% of the way through the workflow and the PM re-opens Google Docs.

**What it needs to be:**
- One-page formatted document generated from the advance sheet
- Sections: all call times (load-in, crew call, soundcheck, doors, show start, curfew, load-out), full contact list (venue team + tour contacts), key logistics (dock address, shore power, parking), hot points summary
- Auto-populated from confirmed advance fields — fields without values are suppressed
- Editable before distribution (PM may want to add show-day-only notes)
- PDF download + shareable read-only link (same pattern as advance share)
- Already stubbed as a locked lifecycle stage in Routing — just needs to be unlocked and built

**Definition of done:** PM can go from a complete advance sheet to a distributed day sheet without opening any other application.

**Follow-up items surfaced by PM consultation:**
- ~~Add `foh_engineer` and `head_rigger` fields to the tech rider `tour_info` section so they appear in day sheet Tour Contacts~~ ✅ DONE (Apr 2026) — both fields added to `TECH_RIDER_SECTIONS` `tour_info`; surface in day-sheet page, print, and share views
- Consider a "day sheet generated" timestamp to mark the lifecycle stage `done` rather than perpetually `active`

---

### ~~Show-Level Notes / Communication Log~~ ✅ COMPLETE (May 2026)
**The PM's words:** *"The email thread that led to that confirmation? Still in Gmail. StagePage has no awareness of what communication has happened. The advance isn't just the data, it's the relationship and the conversation."*

Right now there's no place in StagePage to log unstructured information: phone call notes, follow-up reminders, anything that doesn't fit a specific field. PMs maintain this in email threads or a separate notes doc. That's a second system.

**What was built:**
- `ShowNotesLog` client component renders early on the advance sheet (before Hot Points) with a textarea + Add note button; notes display newest-first
- Append-only — no edit or delete. Each entry: timestamp · author name · note body
- ⌘↵ keyboard shortcut to submit; optimistic update (no page refresh)
- `show_notes JSONB NOT NULL DEFAULT '[]'` column on `show_advances` (migration 011)
- `addShowNote()` server action with ownership verification via show → tour chain
- Notes excluded from default print PDF; "Include internal notes (PM only)" checkbox in Share & Export popover (unchecked by default, appends `?notes=1` to print URL)
- Never visible on advance share page or day sheet — "— internal log, not shared" label inline on card

**Definition of done:** ✅ PM can log "Called Mark Campbell 3/15 — confirmed trim height is 42', he said they updated the rig last season. Follow up on motor count." and it lives in StagePage permanently with that show.

**Follow-up items surfaced by PM consultation:**
- Date format in note entries: show year only when it differs from current year (currently always shows full year)

---

## P1 — Differentiators (Make It Worth Paying For)

### Show Day View (Mobile-First)
**The PM's words:** *"On show day I'm not at a desk. I'm walking the dock in the dark at 6am. I need to pull up a single field fast. A show day view — just the hot points and contacts, big text, one tap from the home screen — would get more daily use than anything else in the product."*

The current advance sheet is a desktop tool. Show day is mobile. These are different needs.

**What it needs to be:**
- A dedicated `/show-day/[showId]` view, optimized for mobile
- Top card: venue name, date, dock address (tappable for Maps)
- Hot points grid: all 12, large text, confirmation badges visible
- Contacts list: every venue contact with tap-to-call / tap-to-text
- Day sheet call times if the day sheet has been generated
- Fast to load, works on spotty venue WiFi
- Accessible from the Dashboard show card with one tap

**Definition of done:** PM can walk a load-in dock and answer "what's the trim height?" and "who's the venue PM?" in under 5 seconds without scrolling.

---

### Advance Sheet Field Tailoring (Audience-Specific Share Links)
**Already in Known Gaps.** The PM agent confirmed this is real: *"Let department heads access just their relevant section."*

The LD doesn't need to see hospitality. The FOH engineer doesn't need to see labor. Sending the full advance to everyone creates noise and sometimes surfaces sensitive deal info.

**What it needs to be:**
- When generating a share link, PM can select which sections to include
- Presets: Full (all sections) / Audio & Stage / Lighting & Stage / Labor & Load-In / Contacts Only
- Custom selection (per-section checkboxes)
- The token encodes the section filter — no PM account needed to view

**Definition of done:** PM can send the LD a link that shows Stage, Rigging, Lighting, and Contacts — nothing else.

---

## P2 — Trust (Make the Data Believable)

### Venue Packet Change Notifications
**The PM's words:** *"If the venue PM updates their power section three weeks after I advanced the show, I need to know that. Silent updates are worse than no updates."*

`last_updated_at` exists on packets but there's no field-level change history and no alert when something changes after an advance is in progress.

**What it needs to be:**
- Track field-level change history on `packet_sections` (what changed, when, by whom)
- When a packet field changes after an advance has been started for that venue, flag it on the advance sheet — "Venue updated trim height on Apr 3 — was 40', now 38'. Confirm?"
- Email or in-app notification to the PM when a packet they've accessed changes
- On the advance sheet, show a "Packet updated since your last visit" banner with a diff

**Definition of done:** PM is never surprised at load-in by a venue change they would have seen if they'd been notified.

---

### Post-Show Reality Correction ("Advance said X, reality was Y")
**The PM's words:** *"Is there a way to flag a field as 'advance said X, reality was Y'? That institutional knowledge is incredibly valuable for the next PM who plays that venue."*

Currently there's no mechanism for a PM to record what they actually found on the day versus what the advance said. This is how the whole industry learns — and right now that knowledge dies in email threads.

**What it needs to be:**
- After show date passes, advance fields get an optional "Reality check" annotation
- PM can note: "Advance said 6 dock bays. Actual: 3 usable, 1 blocked by venue storage."
- These notes are visible to any future PM who accesses that venue's packet or advances the same venue
- Optionally: surface these notes back to the venue as suggested packet corrections

**Definition of done:** PM who plays a venue two years after another PM's tour can see what was real vs. what the packet said.

---

### Venue Packet Staleness Signal
**The PM's words:** *"The 'living document' is only as good as whoever seeded it, which is an AI extraction from a PDF that may itself be out of date."*

Venues need a reason to keep their packets current. Right now there's no visible accountability.

**What it needs to be:**
- Show `last_updated_at` prominently on the venue packet viewer (artist side and venue side)
- "Last verified by venue" vs "AI-extracted" distinction per section
- On the advance sheet, if a packet section hasn't been updated in 12+ months, show a warning: "Venue packet not updated in 14 months — verify before relying on"
- Prompt venues when a share request comes in and their packet is stale: "You have a pending request — your packet was last updated 18 months ago. Review before approving?"

**Definition of done:** PM can see at a glance whether they're working from fresh data or something that predates the last renovation.

---

## P3 — Expansion (New Workflow Territory)

### Promoter as a First-Class Object
**The PM's words:** *"The promoter rep is in every advance — deal type, settlement contact, settlement time. Promoters are a distinct party from the venue. Live Nation, Goldenvoice — they have standardized info that doesn't change show to show."*

Currently promoter info is a freeform field on the advance sheet. For national touring, the same promoter appears on 20 shows. That info should be stored once.

**What it needs to be:**
- Promoter profiles: name, primary contact, settlement contact, deal defaults
- Linkable to shows (same promoter across multiple dates on a tour)
- Auto-populate promoter contact fields on the advance sheet when linked
- Not a full "Promoter side" account — just a reference object the PM manages

---

### Venue History Across Tours
**The PM's words:** *"Track the history of a venue — what was the stage like last time, what changed."*

A PM returning to a venue they played two years ago has institutional knowledge that currently lives only in their head or old advance sheets.

**What it needs to be:**
- Show past advances for the same venue (across all tours, not just the current one)
- Highlight what's different in the current packet vs. the last advance
- "Notes from last time" surfaced at the top of the advance sheet when a venue is recognized

---

### Venue Adoption: Outreach Tools for Venues Without StagePage Accounts
**The PM's words:** *"The club in Omaha doesn't have a venue PM with a StagePage login. How does this work for venues that haven't adopted the platform?"*

This is the core network effects problem. StagePage's value scales with venue participation. Right now an unregistered venue is just a dead end.

**What it needs to be:**
- When a PM requests a packet from a venue not on StagePage, generate a pre-filled invite: "This tour is requesting your tech specs. Fill out your StagePage packet here — it takes 20 minutes and you can share it with every future tour."
- Lightweight venue onboarding flow triggered by the request (no full account required to fill out the packet — upgrade to manage it)
- Track "requested but unregistered" venues so the PM knows which venues are gaps

---

## Open Questions (Not Yet Buildable)

These questions came out of the PM agent review. They need answers before the relevant features can be designed.

1. **Venue incentive model** — What is the concrete reason a busy venue PM maintains their StagePage packet instead of emailing a PDF? Is it the reduced inbound request volume? Credibility? Does StagePage need to offer something to venue PMs directly (like tour history, rider storage, or crew scheduling)?

2. **Data authority** — When a PM confirms a field and the venue later updates it to a different value, whose data wins on the shared view? Does the PM's confirmation get flagged as potentially stale?

3. **Multi-PM tours** — Large tours have a PM and a Production Coordinator, sometimes department heads advancing their own sections. How does StagePage handle multiple people working the same advance? Is there a conflict model for simultaneous edits?

4. **Offline / show day reliability** — If StagePage is the single source of truth on show day, what happens when the venue WiFi is out and the cellular signal is one bar? Is there a cached / offline mode, or does the PDF export cover this?
