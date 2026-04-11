# Show Advance Sheet — Research Reference

> **Source:** Real-world advance sheet from Goose's touring production (ExploreAsheville.com Arena, 4/10/2026) + blank Goose template. Provided by touring PM Taylor Wettlaufer via Jake's partner.
>
> **Purpose:** This document IS the product's north star. Every other document StagePage builds (tech rider, stage plot, input list, venue tech packet) should be designed with "how does this feed into the advance sheet?" in mind.

---

## What the Advance Sheet Is

The advance sheet is the **master coordination document for a single show**. It is assembled by the touring PM per show, typically 1–2 weeks out, by pulling together:

1. **Venue data** — filled in by the venue after being asked
2. **Tour data** — pre-filled or carried over from previous shows (the PM's standing info)
3. **Show-specific operational data** — labor numbers, budgets, timing, logistics unique to this show

It is **not** the tech rider. The tech rider is what the tour sends at the start of the advance. The advance sheet is what the PM creates *through* the advancing process — it's the resolved, confirmed, operational picture of the show.

The Goose template even says at the bottom:
> *"With this document should be the tour stage plot, rigging plot and general rider. If you have not received this, please reach out to Production Manager."*

So the advance sheet travels **alongside** the tech rider, stage plot, and input list — but it is a separate, per-show document.

---

## What StagePage Should Auto-Generate

| Data Source | Where It Comes From in StagePage |
|---|---|
| Venue contacts | Venue tech packet → Contacts section |
| Stage dims, trim height, dock info | Venue tech packet → Stage / Load-in sections |
| Power locations and amperage | Venue tech packet → Power section |
| Audio/lighting capabilities | Venue tech packet → Audio / Lighting sections |
| Hospitality (dressing rooms, showers, catering) | Venue tech packet → Hospitality section |
| Tour contacts (TM, PM, PA, Merch) | Tour profile / tour settings |
| # of buses / trucks | Tour profile |
| Labor defaults (crew chief, riggers, etc.) | Tour tech rider defaults |
| Power requirements by dept | Tour tech rider → Power section |
| What audio system tour is carrying | Tour tech rider → Audio section |
| Show schedule events + durations | Tour tech rider defaults + per-show timing |
| Labor budget | Per-show input |
| Catering budget | Per-show input |
| Security Q&A | Per-show, venue fills in |

**The PM should only have to fill in what's genuinely different show-to-show.** Everything else populates automatically.

---

## Complete Field Reference

### Header / Show Identification

| Field | Filled By | Notes |
|---|---|---|
| Artist name | Tour (auto) | |
| Show date | PM (per show) | |
| Venue name | Venue (auto) | |
| Address | Venue (auto) | |
| Capacity | Venue (auto) | |
| Age restrictions | Venue | |
| Time zone | Venue (auto from location) | |
| Parking summary | Venue (auto from tech packet) | Quick reference |

---

### Section: Venue Team

| Field | Filled By |
|---|---|
| Production Manager (name, phone, email) | Venue |
| Operations Manager (name, phone, email) | Venue |
| Hospitality Contact (name, phone, email) | Venue |
| Security Contact (name, email) | Venue |
| Promoter / Rep | PM |
| Settlement contact + email | PM |
| Deal type | PM |
| Deal notes | PM |

---

### Section: Key Artist Contacts & Detail Summary

These are **pre-filled from tour profile** — the PM shouldn't retype these per show.

| Field | Filled By |
|---|---|
| Tour Manager (name, phone, email) | Tour (auto) |
| Production Manager (name, phone, email) | Tour (auto) |
| Production Assistant (name, phone, email) | Tour (auto) |
| Tour Merch (name, phone, email) | Tour (auto) |
| Lead Driver (name, phone) | Tour |
| # of Buses | Tour (auto, e.g. "3 Buses") |
| # of Trucks | Tour (auto, e.g. "4 Semi / 1 Box") |
| Coming From | PM (per show) |
| Estimated Arrival | PM (per show) |
| Estimated Departure | PM (per show) |
| Arrival Notes | PM (per show) |

---

### Section: General Show Hot Points

This is a **quick-reference box** at the top of the document — the 10 things a PM needs to scan first. It pulls from other sections automatically.

| Field | Source |
|---|---|
| Stage Dims | Venue tech packet → Stage |
| Wing Space | Venue tech packet → Stage |
| Push Details (load-in path) | Venue tech packet → Load-in |
| Docks (count, type) | Venue tech packet → Load-in |
| Indoor / Outdoor | Venue tech packet |
| Trim Height | Venue tech packet → Stage |
| SPL Limit | Venue tech packet → Audio |
| Video Tie-In | Venue tech packet → Video |
| Internet Speed | Venue tech packet → Hospitality |

---

### Section: Merch

| Field | Filled By |
|---|---|
| Split points (% split) | PM / deal |
| Who sells (venue or tour) | PM / deal |
| Local merch contact | Venue |
| Shipping address / instructions | Venue |
| Merch notes | PM |

---

### Section: Show Schedule

Three-column layout: **Load In | Show Day #1 | Show Day #2 / Load Out**

Each event has: Event name · Start time · Stop time

#### Load-In Column
| Event | Notes |
|---|---|
| Arrival | When trucks arrive |
| Venue Access | When crew can enter |
| Breakfast | Crew meal window |
| Walk and Chalk | PM + venue walkthrough |
| LX / PA In | ~3.5 hrs |
| Backline / Video In | ~3 hrs |
| 1st Hand Cut | When first crew wave is released |
| Lunch | Crew meal window |
| Line Check | |
| Fire watch starts | If haze is used |
| Sound Check | ~90 min |
| Dinner | Crew/artist meal window |
| Security Meeting | |

#### Show Day Column
| Event | Notes |
|---|---|
| Sound Check | If 2-day run |
| Dinner | |
| VIP Doors | ~30 min before GA |
| GA Doors | |
| Ticketed Start Time | |
| Set #1 | Duration noted, e.g. 75m |
| Set Break | e.g. 30m |
| Set #2 | e.g. 75m |
| Encore | e.g. 30m |
| Curfew | |
| End of Night Routine | |
| Venue Clear | |
| Load Out | Start / end |
| Backstage Curfew | |
| Departure | Next city noted |

#### Show Day #2 / Load Out Column
Same events — used for 2-night runs.

#### Schedule Notes
- Load In / Early Day Notes
- Mid Day / Day #1 Notes
- Day #2 / Load Out Notes
- "Is there a Curfew? How is it enforced?"

---

### Section: Labor Needs

Three-column layout: **Load In | Show Call | Load Out**

Each position has: Role · Number · Call Time

#### Specific Positions (with Goose defaults)
| Position | Load In | Show Call | Load Out |
|---|---|---|---|
| Crew Chief | 1 | 1 | 1 |
| Electrician | 1 | 1 | 1 |
| Head Rigger | 1 | 1 | 1 |
| Up Riggers | 8 | — | 8 |
| Down Riggers | 4 | — | 4 |
| Loaders | 4 | — | 4 |
| Forklifts | 1 | — | 1 |
| House Lights | — | 1 | — |
| House Audio | — | — | — |
| Stagehands | — | See note | — |
| Camera Ops | — | — | — |
| Cable Pager | — | — | — |

#### General Hands (broken into dept + call waves)
**1st Call:** Total count + breakdown by department (Lighting, Audio)
**2nd Call:** Additional hands (Audio, Backline, Video)
**Load Out:** Full count + dept breakdown (Lighting, Audio, Backline, Video)

#### Labor Notes
- Load In Notes (freeform)
- Show Call Notes (e.g. "No stagehands unless outdoor — then min 2")
- Load Out Notes (e.g. "All hands on site 30 min before show end")

#### Labor Financials
- Labor Budget (e.g. $15,000)
- Labor Estimate (running estimate, e.g. "$20.9k — look at cutting")
- Labor Min Call (e.g. "4hr min, 1.5× after midnight")
- Feeding Rules (e.g. "feed after 5")

---

### Section: General Production Details

Six subsections in a 3-column grid layout.

#### Stage & Labor
| Field | Notes |
|---|---|
| Dimensions | Auto from venue tech packet |
| SL / SR Wings | Auto from venue tech packet |
| Load-in Path | Auto from venue tech packet |
| Dead Storage | Venue |
| Labor Budget | PM (per show) |
| Labor Estimate | PM (per show) |
| Notes | |

#### Rigging
| Field | Notes |
|---|---|
| High Steel | Venue |
| Height to Grid | Auto from venue tech packet |
| Grid Spacing | Venue |
| Weight Limitations | Venue (auto from tech packet) |
| Proscenium Height | Venue (auto) |
| Proscenium Width | Venue (auto) |
| Notes | |

#### Power (structured table)
Three columns: Department · Power Needed · Location

| Department | Tour Default | Location |
|---|---|---|
| Rigging / LX | (3) 400A + (1) 200A 3-phase | USR |
| Video | — | Audio Distro |
| Audio | (2) 200A 3-phase | USL / USR |
| Extra Feeder Req | | |

Note: "All 3-phase 240V within 100' of location. Cable runs in public areas to be matted."

#### Barricade
| Field | Notes |
|---|---|
| Distance from DSE to barricade | Venue |
| Barricade type | Venue (e.g. Mojo) |
| Breaks needed | |
| Production in pit | Tour default (e.g. "Cam op with shoulder camera") |

#### Staging & Risers
| Field | Notes |
|---|---|
| Stage location (indoor/outdoor) | Venue |
| Risers needed | Tour default (e.g. "(1) 8'×8' @ 16"") |
| Wings / screens | Venue |
| Is there an upstage black | Venue (e.g. "90'×45' US curtain in house — $3,050 in deal") |

#### Heavy Equipment — Forklift
| Field | Notes |
|---|---|
| Qty needed | Venue |
| Weight capacity | Venue (e.g. 5,000 lbs) |
| Extensions? | Venue |
| Notes | |

---

### Section: Lighting, FOH, Audio

Three-column layout.

#### Lighting
| Field | Notes |
|---|---|
| House rig struck? | Tour requirement — auto from tech rider |
| Haze restrictions | Venue (with cost, e.g. "$105/hr firewatch") |
| CO2 request | Tour default (e.g. "6 tanks 20lb non-syphon") |
| House LX contact | Venue |
| Tour LD | Tour (auto) — Andrew Goedde |
| Notes | |

#### FOH
| Field | Notes |
|---|---|
| Distance from DSE | Auto from venue tech packet |
| Size | Auto from venue tech packet |
| Covering (retractable?) | Venue |
| Snake path | Venue (e.g. "SR along bleachers, 300' from mons") |
| Lighting riser | Venue (e.g. "16×8×20"") |
| Camera riser | Venue / Tour (e.g. "8×4×5' center") |
| Notes | |

#### Audio
| Field | Notes |
|---|---|
| Main hang | Tour (auto from tech rider, e.g. "Cohesion CO10") |
| Sub | Tour (auto, e.g. "Cohesion CP218") |
| Side / front fills | Tour (auto, e.g. "Cohesion CP6") |
| Tie-in connection | Venue |
| House consoles (must be removed?) | Tour requirement |
| SPL limit | Venue (auto from tech packet) |
| Notes | |

---

### Section: Video Details

Two subsections side by side.

#### Video & Streaming
| Field | Notes |
|---|---|
| Streaming platform | Tour (auto — "Nugs") |
| Video world location | PM (per show) |
| Broadcast location | PM (per show) |
| Ethernet drop location | Venue |
| TVs in venue to tie in? | Venue |
| Internet speed | Venue (auto from tech packet, requirement: "1Gbps up") |
| House IT contact | Venue |
| Notes | |

#### House IMAG
| Field | Notes |
|---|---|
| IMAG screens | Venue (auto) |
| System type | Venue (auto) |
| In-house cams / ops | Venue |
| Video tie location | Venue |
| Video tie-in notes | Venue |
| House video contact | Venue |
| Notes | |

---

### Section: Parking
*(Separate from venue tech packet load-in — focused on day-of logistics)*

| Field | Notes |
|---|---|
| # of docks available | Venue (auto from tech packet) |
| # of trucks (tour) | Tour (auto) |
| Truck parking info | Venue (per-show logistics) |
| # of buses | Tour (auto) |
| Bus parking info | Venue |
| Earliest arrival | PM (per show) |
| Latest departure | PM (per show — next city) |
| Shore power (# connections) | Venue (auto from tech packet) |
| Other parking availability | Venue |
| Notes | |

---

### Section: Non-Technical / Back of House

#### Backstage
| Field | Notes |
|---|---|
| # of dressing rooms | Venue (auto) |
| # of production offices | Venue (auto) |
| # of showers | Venue (auto) |
| Laundry on site? | Venue (auto) |
| Bath towels needed | Tour default (50) |
| Stage towels needed | Tour default (10) |
| Hard line drop in production office? | Venue |
| Tabling needs | Tour default ("(3) 6' tables with (2) chairs each in lobby") |

#### Hospitality
| Field | Notes |
|---|---|
| Catering rider | Tour (link to document) |
| Catering area | Venue |
| Kitchen on site? | Venue |
| Aftershow food cash needs | Tour default ($400) |
| Refrigerators in dressing rooms? | Venue |
| Warmer available? | Venue |
| Catering budget | PM (per show, e.g. $7,500) |
| Hospitality notes | Venue (e.g. "Hospo preshop is $150 flat") |

#### Venue-Provided Runner
| Field | Notes |
|---|---|
| # runners needed | PM (per show, e.g. 2 — split) |
| Vehicle type | Venue (e.g. 15-passenger van) |
| Can runners drive personnel? | Venue |
| Call time | PM |
| Cut time | PM |
| Restrictions | Venue (e.g. 12 hrs max) |
| Runner notes | PM (e.g. "$275 for 12 hrs, $30/hr after") |

---

### Section: General Advance Notes

Freeform notes field. Goose's default:
> "With this document should be the tour stage plot, rigging plot and general rider. If you have not received this, please reach out to Production Manager."

---

### Section: Security Information

Structured Q&A — venue fills in answers to tour's standing security questions.

| Question | Who Answers |
|---|---|
| What security protocols are in place at main entrances? | Venue |
| Is there armed security personnel on-site? | Venue |
| Will there be uniformed police officers on-site? | Venue |
| Are bag inspections mandatory at entry? | Venue |
| In an emergency, where should the artist and team relocate? | Venue |
| In a venue-wide emergency, who holds ultimate authority? | Venue |
| If a show needs to be paused, who is authorized to make the announcement? | Venue |

---

### Section: Additional Venue Notes

> "Anything that the above didn't cover that is vital to understand in the advance?"

Freeform. Includes shipping address, load-in restrictions, any deal-specific notes.

---

## Key Design Insights for StagePage

### 1. Hot Points is a critical UX pattern
The "General Show Hot Points" box at the top — stage dims, wing space, push details, docks, trim height, SPL limit, internet speed — is a quick-reference summary that a PM scans first. StagePage should auto-populate this box from the venue's tech packet the moment a show is advanced.

### 2. Tour data is almost entirely pre-filled
Tour Manager, PM, PA, Merch contact, # of buses/trucks, audio system (what they carry), labor defaults, power requirements, CO2 request, towel counts, catering defaults — all of this is the same show to show. The PM should set it once on the tour and never retype it.

### 3. Labor is the most operationally complex section
The 3-column labor grid (Load In / Show Call / Load Out) with dept breakdowns and call times is the most detailed part of the advance. The PM needs specific crew counts per phase, per department, per time.

### 4. Power is specified by department, not just total
Unlike the venue tech packet (which lists total available), the advance sheet specifies power **per department** (Rigging/LX, Video, Audio) with specific amperage and location. This is the tour's requirement vs. the venue's supply.

### 5. The schedule drives everything
The 3-column show schedule is the backbone of the advance. Every labor call, every meal break, every curfew flows from it. Building a good schedule UI is essential.

### 6. Budget fields are per-show
Labor budget, labor estimate, catering budget, aftershow cash, runner budget — these are negotiated and tracked per show, not per tour. They also inform settlement after the show.

### 7. Security is a standing Q&A, not a freeform field
The security section has the same questions every show — only the answers change. This is a perfect candidate for a structured form.

---

*Source: Goose advance sheet (4.10 Asheville) + Goose blank template*
*Last updated: 2026-04-11*
