# Technical Rider — Research Reference

> **Purpose:** Define every field and section a tech rider contains so StagePage can build a structured form that replaces the PDF/Word doc workflow.

---

## What a Tech Rider Is

A tech rider is the touring act's complete set of technical requirements sent to the venue 2–4 weeks before a show. It is the PM's primary document in the advancing process. It tells the venue exactly what the tour needs and asks the venue to confirm what they can provide.

**Key principle:** The tech rider is not a wish list — it is a specification. Items marked REQUIRED are non-negotiable. Everything else has acceptable alternatives.

---

## Document Metadata (Header)

Every rider must include:

| Field | Notes |
|---|---|
| Artist / Band Name | |
| Tour Name | |
| Version Number | e.g. "v2.1" — critical for version control |
| Last Updated Date | Venues must know which version they have |
| Show Type | Full production / stripped-down / festival set |
| Traveling Party Size | Number of people on tour |
| Primary Contact | Name, phone, email (PM or Tour Manager) |
| Secondary Contact | Backup contact |

---

## Section 1: Front-of-House (FOH) Audio

### PA System
| Field | Example |
|---|---|
| PA System Type | Stereo line array |
| Minimum SPL | 110 dB(A) at furthest audience position |
| Preferred FOH Console (1st choice) | DiGiCo SD10, 48 channels minimum |
| Preferred FOH Console (2nd choice) | Yamaha CL5 |
| Preferred FOH Console (3rd choice) | A&H dLive or equivalent |
| Number of FOH Graphic EQs needed | 4 × 31-band |
| Outboard gear required | List each: reverb, delay, compression, etc. |
| Snake: stage to FOH (ft) | 150 ft |
| Stage box type | Analog XLR / Digital |
| Number of stage box inputs | 24 |
| Subwoofer requirement | Yes/No — quantity and placement |
| Side fills required? | Yes if venue wider than 80 ft |

### Requesting From Venue
- Available FOH console make/model
- Available PA system make/model and power handling
- Available snake infrastructure
- Available outboard gear inventory
- Backup/house PA specs if touring system unavailable

---

## Section 2: Monitor System

| Field | Example |
|---|---|
| Primary monitoring method | Floor wedges / IEM / Hybrid |
| Number of independent monitor mixes | 6 |
| Monitor console (if touring) | Yamaha PM5D |

### If Floor Wedges
| Field | Example |
|---|---|
| Number of wedges needed | 8 |
| Amp power per wedge | 400W minimum |
| Driver configuration | 2-way, 12" woofer |
| Dedicated monitor engineer? | Yes / No |

### If IEM
| Field | Example |
|---|---|
| Wireless IEM system frequency band | UHF preferred |
| Number of IEM packs/receivers | 5 |
| Dedicated monitor console? | Yes / No |

### Monitor Mix Descriptions
List each mix and its contents:

| Mix # | Contents |
|---|---|
| Mix 1 | Kick, Snare, Bass, Click Track |
| Mix 2 | Lead Vocal, Acoustic Guitar, Keys |
| Mix 3 | Electric Guitar, Bass, Drums |
| Mix 4 | Drums overhead + room |
| ... | ... |

---

## Section 3: Input List (Channel List)

The input list is a table that lives alongside the tech rider. See `input-list.md` for full field breakdown.

Standard column order:
1. Channel Number
2. Input Name/Description
3. Microphone Model (preferred)
4. Alternate Microphone
5. Stand/Clip Type
6. Stage Location (DSL, DSC, DSR, USL, USC, USR)
7. DI Required (Yes/No, active/passive)
8. Sub-snake Assignment
9. Phantom Power (Yes/No)
10. Monitor Mix Assignments
11. Notes

**Standard channel ordering convention:**
- Ch 1–8: Drums (kick, snare, hi-hat, toms, overheads)
- Ch 9: Bass
- Ch 10–12: Keys
- Ch 13–14: Guitar(s)
- Ch 15–18: Vocals (lead, harmonies)
- Ch 19–20: Loops/Samples
- Ch 21+: Effects returns, spares

---

## Section 4: Backline

For each item, specify: touring provides vs. venue rents.

### Drums
| Field | Example |
|---|---|
| Kit size | 5-piece |
| Kick drum | 22×18 |
| Snare | 14×5.5 |
| Toms | 10×8, 16×15 |
| Kick pedal | Artist provides own |
| Cymbals | Artist provides own |
| Drum throne | Venue provides |
| Brand preference | Pearl, DW, or equivalent professional |

### Guitar Amplification
| Field | Example |
|---|---|
| Head make/model | Marshall 1959 100W (or equivalent tube amp) |
| Cabinet | Marshall 4×12 |
| Quantity | 2 heads + 2 cabs |
| Who provides | Venue rents |

### Bass Amplification
| Field | Example |
|---|---|
| Head | Ampeg SVT-III Pro |
| Cabinet configuration | 2×10 + 1×15 |
| Who provides | Venue rents |

### Keyboards/Other
| Field | Example |
|---|---|
| Keys spec | 88 weighted, keyboard stand |
| Who provides | Touring / Venue |

---

## Section 5: Lighting

| Field | Example |
|---|---|
| Lighting complexity | Minimal / Intermediate / Full production |
| Touring rig? | Yes / No |
| Preferred console | Chamsys MagicQ / ETC Ion |
| Can cue file load to house console? | Yes / No |
| Minimum truss positions needed | 2 FOH, 2 overhead |
| Fixtures needed from venue | List type + quantity |

### Requesting From Venue
- Available console type and software version
- Truss positions + load capacity (lbs)
- Available fixture inventory (moving heads, wash lights, LED panels)
- Available dimmer/distribution gear
- Rigging points and weight ratings
- Power available for lighting

---

## Section 6: Video / Projection (if applicable)

| Field | Example |
|---|---|
| Video source | Laptop / Media server (Resolume/Watchout) |
| Display type | LED wall / Projection / Both |
| Screen dimensions | 20ft × 12ft, 16:9 |
| Resolution | 1080p / 4K |
| Frame rate | 30fps / 60fps |
| File formats | MP4, MOV, ProRes |
| Connection type | HDMI / SDI / DisplayPort |
| Projector brightness (if outdoor) | 20,000+ lumens |
| Video technician required? | Yes / No |
| Redundancy/backup source? | Yes / No |

---

## Section 7: Stage Dimensions & Setup

| Field | Example |
|---|---|
| Minimum stage width | 24 ft |
| Minimum stage depth | 18 ft |
| Minimum ceiling height | 14 ft clear |
| Stage surface type | Plywood / Sprung floor |
| Risers needed | Yes — 2× 8ft×4ft, 16" high |
| Wing/offstage space (SL) | 8 ft minimum |
| Wing/offstage space (SR) | 8 ft minimum |
| Dance/movement space | Note if required |

See `stage-plot.md` for the visual component.

---

## Section 8: Power & Electrical

| Field | Example |
|---|---|
| Voltage | 120V (US) / 230V (international) |
| Phase | Single / Three-phase |
| Total amperage required | 100A minimum |
| Total power draw | 18,000 watts |
| Number of circuits needed | 6 minimum |
| Outlet types | 20A standard + 30A twist-lock |
| Cable run distance (stage to panel) | 50 ft |
| Generator required? | Yes / No |
| UPS for console? | Yes / No |

### Requesting From Venue
- Breaker panel location and available amperage
- Available outlet types and positions
- Backup generator availability
- Electrical tie-in points

---

## Section 9: Load-In & Logistics

| Field | Example |
|---|---|
| Load-in duration estimate | 2 hours |
| Number of vehicles | 1 tour bus + 1 truck |
| Truck dimensions | 28ft box truck |
| Dock access required? | Yes / No |
| Forklift/pallet jack needed? | Yes / No |
| Overnight bus parking? | Yes — 2 buses |
| Merch area required | 10ft × 6ft, 2 × 20A outlets |
| VIP/meet-and-greet area | Yes — separate space from green room |

### Requesting From Venue
- Loading dock dimensions and availability
- Vehicle parking near loading area
- Forklift availability
- Weather protection during load-in

---

## Section 10: Personnel & Labor

### Touring Crew (for venue awareness)
List key roles traveling: PM, FOH engineer, monitor engineer, lighting director, stage manager, drum tech, guitar tech.

### Local Labor Required From Venue

| Role | Qty | Duration | Notes |
|---|---|---|---|
| General stagehands (load-in) | 6 | Load-in + setup | Experienced with live production |
| Stagehands (load-out) | 6 | Strike | |
| House FOH engineer | 1 | Show day | If touring engineer needs local assist |
| Spotlight operator | 2 | Show only | If applicable |
| Rigger/climber | 1 | Load-in | If truss rigging required |

| Field | Value |
|---|---|
| Labor cost responsibility | Touring pays / Venue pays / Split |
| Union required? | IATSE / Local / Non-union |

---

## Section 11: Show Schedule

| Field | Example |
|---|---|
| Load-in start | 10:00 AM |
| Sound check start | 3:00 PM |
| Sound check duration | 90 minutes |
| Doors open | 7:00 PM |
| Show start | 8:00 PM |
| Set duration | 90 minutes |
| Curfew | 11:00 PM |
| Venue must be clear by | 1:00 AM |

---

## Section 12: Safety & Compliance

| Field | Notes |
|---|---|
| Pyrotechnics | Yes/No — permits and insurance required if yes |
| Haze/fog machines | Note fire code requirements |
| Laser effects | Safety requirements + legal restrictions |
| Rigging | Load calculations and permits required |
| Fire/emergency exits | Must remain unobstructed at all times |
| Electrical compliance | NEC (US) or local equivalent |

---

## Rider by Tour Scale

| | Small (Club) | Mid-Size (Theater) | Arena/Large |
|---|---|---|---|
| Channels | 8–12 | 16–24 | 32–48+ |
| Monitor mixes | 1–2 | 4–6 | 8–12+ |
| Console | Basic analog OK | Yamaha QL/CL or equivalent | DiGiCo, Yamaha CL, Avid |
| Stage width | 10–15 ft | 20–30 ft | 40–60+ ft |
| Power | 20A circuits | 50–100A | 200A+ |
| Stagehands | 0–2 | 3–4 | 8–12+ |
| Load-in | 30–45 min | 1.5–2.5 hrs | 4–6+ hrs |
| Rider length | 1–2 pages | 2–4 pages | 4–10+ pages |

---

## Most Common Mistakes (Fields to Never Omit)

1. **No version number/date** — venue uses outdated rider
2. **Missing contact info** — venue can't reach PM to clarify
3. **Vague mic specs** — "condenser mic" instead of "Neumann U87, alt: AKG C414"
4. **Power in watts only** — need voltage + phase + amps + circuit count
5. **No stage location on inputs** — cables can't be laid correctly
6. **Monitor mix contents not listed** — engineer doesn't know what goes where
7. **No alternatives for console** — if preferred console isn't available, no plan B
8. **Backline responsibility unclear** — "who rents the amp?" unresolved until show day
9. **No input count on snake** — venue runs wrong snake
10. **Hospitality mixed in** — catering requests distract from technical clarity

---

*Last updated: 2026-04-09*
