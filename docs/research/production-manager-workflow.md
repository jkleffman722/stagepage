# Production Manager Workflow — Research Reference

> **Purpose:** This document defines the core user, their workflow, and their pain points. All StagePage product decisions should be evaluated against this reference.

---

## Who We're Building For

The **Production Manager (PM)** owns everything technical for a live music tour. They are responsible for all audio, lighting, staging, video, power, transportation logistics, and crew coordination — from truck arrival to load-out. They are the boss of the crew.

On mid-size tours (our primary target user), the PM:
- Manages 8–15 crew members
- Handles 4–6 shows per week
- Runs a formal advancing process that begins 2–4 weeks before each show
- Still relies almost entirely on email + spreadsheets + PDFs

On small tours, one person does all of this while also mixing sound, possibly driving.
On large tours, the PM oversees 30–80+ crew and starts advancing 6–8 weeks out with pre-site visits.

---

## The Core Workflow: Advancing

**Advancing** is the structured back-and-forth process between the tour and each venue before a show. It is the PM's most critical and most broken workflow.

### What the Tour Sends to the Venue

| Document | What It Contains |
|---|---|
| **Tech Rider** | All technical requirements: PA system specs, console preferences, power needs, lighting requirements, staging dimensions, crew needs |
| **Stage Plot** | Visual diagram showing exact positions of all band members, instruments, amps, monitors, mic stands, DI boxes on stage |
| **Input List (Channel List)** | Every audio source, which console channel it maps to, mic/DI type, phantom power needs, monitor mix assignments |
| **Hospitality Rider** | Food, beverages, green room requirements for band and crew |
| **Backline Rider** | Specific gear specs: amp make/model/power handling, drum kit requirements, keyboard staging |

### What the Venue Sends Back

| Document | What It Contains |
|---|---|
| **Venue Tech Packet** | PA system specs, console make/model, stage dimensions, rigging capability, power specs, load-in logistics, green room info |

### The Advancing Timeline

- **3–4 weeks out:** PM sends the full document package to the venue
- **2 weeks out:** Venue responds with their tech packet; PM reviews and flags conflicts
- **1 week out:** Follow-up emails to resolve conflicts, confirm timeline
- **2–3 days out:** Final day sheet created and distributed to all crew
- **Day of:** PM arrives 6–8 AM, walkthrough, load-in at 9–11 AM, soundcheck 3–5 PM, show, load-out

---

## The Day Sheet

The day sheet is the single source of truth for the entire touring party on show day. The PM assembles it manually from all advancing information. It contains:

- Crew call times (load-in, soundcheck, doors, showtime, curfew)
- Transportation details and hotel info
- Key venue contacts
- Department-specific notes
- Timeline from arrival through load-out

**Current problem:** Assembled manually from scattered email threads. No standard tool creates it automatically.

---

## Current Toolset (and Why It's Broken)

| Tool | Used For | Why It Fails |
|---|---|---|
| Email | All advancing communication | Fragmented threads; no status tracking; info buried; version hell |
| PDF attachments | Tech rider, stage plot, input list | Static documents; no confirmation of receipt; easy to send wrong version |
| Excel/Google Sheets | Budget, day sheets, expense tracking | Version conflicts; manual data entry; no real-time visibility |
| WhatsApp/Slack | Crew coordination | Fragmented; parallel to email; info not structured |
| Master Tour (Eventric) | Tour management (some users) | Covers logistics and itineraries well; doesn't solve advancing |
| Stage Plot Pro | Stage plot creation | Free tool; creates the visual but not connected to other documents |
| AUDIOPATCH | Input list creation | Specialized; not integrated with advancing workflow |

**The core problem:** No tool connects these documents to the workflow. Everything is created in isolation, emailed around, and manually tracked.

---

## The Biggest Pain Points (Priority Order)

1. **Email as the source of truth** — Critical information buried in threads with no status tracking. The PM has no way to know if a venue has seen, reviewed, or confirmed anything.

2. **No confirmation tracking** — Has the venue received the tech rider? Have they flagged any conflicts with power specs? Did they confirm the load-in time? All managed in the PM's head.

3. **Version control on documents** — Multiple versions of the tech rider, stage plot, and input list floating around. Venues may work from an outdated document and neither party realizes it until show day.

4. **Manual day sheet assembly** — The PM pulls confirmed info from email threads into a new document every show. For a 4–6 show week, this is hours of redundant manual work.

5. **No conflict detection** — When the venue's house PA doesn't match what the tech rider requires, or when stage dimensions conflict with the stage plot, there's no systematic way to catch this before show day.

6. **Settlement and budget** — Expenses logged on phones/paper or not at all; reconciliation takes hours post-show because data wasn't tracked during the tour.

---

## What a Great Solution Looks Like

> StagePage's opportunity: become the central platform for the advancing workflow — where both tour and venue maintain their information, the structured back-and-forth happens, and confirmed data automatically generates the day sheet.

### For the Production Manager (Artist side):
- Store and version-control their documents (tech rider, stage plot, input list) in one place
- Send the full advance package to venues directly from the platform
- See at a glance: which venues have responded, what's confirmed, what has conflicts
- Auto-generate the day sheet from confirmed advancing data
- Track budget and expenses per show

### For the Venue (Venue side):
- Maintain their tech packet (already built) so it's always current
- Receive advance requests and respond in a structured form (not email)
- Flag conflicts against the tour's requirements automatically
- No more PDF attachments — live, versioned documents

### The Combined Value:
- Both parties work from the same system
- Conflicts surface early, not on show day
- Day sheets generate themselves from confirmed data
- The PM's week goes from "5 apps, 3 spreadsheets, and 40 emails per show" to one dashboard

---

## Scale Reference

| Tour Size | Crew | Venues/Week | Advance Lead Time | Tools Today |
|---|---|---|---|---|
| Small (club/van tour) | 2–4 people | 5–7 | 1 week, informal | Email + phone |
| **Mid (our target)** | **8–15 people** | **4–6** | **3–4 weeks, formal** | **Email + sheets + PDFs** |
| Large (arena/stadium) | 30–80+ people | 4–6 | 6–8 weeks + site visits | Master Tour + dedicated staff |

---

*Last updated: 2026-04-09*
