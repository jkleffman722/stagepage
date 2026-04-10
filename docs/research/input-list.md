# Input List (Channel List) — Research Reference

> **Purpose:** Define every field an input list contains so StagePage can build a structured form that replaces the Excel/spreadsheet workflow and integrates directly with the stage plot.

---

## What an Input List Is

The input list is a detailed spreadsheet listing every audio source that needs to be connected to the mixing console. It is the **technical/electrical counterpart to the stage plot** — the stage plot shows WHERE things are, the input list shows HOW to connect them.

It serves multiple audiences simultaneously:
- **FOH engineer:** Knows every channel, what mic to use, what settings to apply
- **Monitor engineer:** Knows which inputs feed which monitor mixes
- **Stage crew:** Knows how to run cable and patch the stage box
- **Venue production:** Can prepare the console and equipment in advance

---

## Standard Columns (Full Reference)

| # | Column | Purpose | Example |
|---|---|---|---|
| 1 | **Channel #** | Console input channel number | 1, 2, 3... |
| 2 | **Stage Box Input** | Which stage box and input slot | SB-A-1, SB-B-4 |
| 3 | **Source / Instrument Name** | What the input is | Kick In, Snare Top, Lead Vocal |
| 4 | **Input Type** | Microphone (dynamic/condenser/ribbon) or DI | Dynamic mic, Condenser, Active DI |
| 5 | **Mic/DI Model (preferred)** | Specific make and model | Shure SM58, Neumann U87, Radial J48 |
| 6 | **Alternate Model** | Acceptable substitute | AKG D112 (alt for kick) |
| 7 | **Phantom Power** | 48V required? | Yes / No |
| 8 | **Pad** | Input attenuation needed? | -20dB / None |
| 9 | **Ground Lift** | Break pin 1 to kill hum? | Yes / No / As needed |
| 10 | **Polarity / Phase** | Inverted? | Normal / Inverted |
| 11 | **Mic Stand Type** | Stand style needed | Tall boom (round base), Short boom, Clip, Headset |
| 12 | **Stage Location** | Where on stage | DSL, DSC, DSR, USL, USC, USR |
| 13 | **DI Required** | Direct box needed? | Yes (active) / Yes (passive) / No |
| 14 | **Sub-snake Assignment** | Which breakout snake | Drums sub-snake A, Keys sub-snake B |
| 15 | **Monitor Mix Assignments** | Which mixes receive this input | Mix 1, Mix 3 / All mixes / Drums Mix only |
| 16 | **Equipment Ownership** | Who provides this gear | House / Tour / Rental |
| 17 | **Cable Color** | Color code for fast identification | Red (drums), Blue (bass), Yellow (guitars), Green (vocals) |
| 18 | **Notes / Comments** | Everything else | "Ribbon mic — DO NOT enable phantom"; wireless freq; backup plans |

Not every tour uses all columns. A small act may only need columns 1, 3, 5, 7, 11, 12, 15.

---

## Standard Channel Ordering Convention

This ordering is so universal that experienced sound crew can patch drums without reading the list carefully. Never deviate without reason.

### Drums (Ch 1–12)
1. Kick drum — inside mic
2. Kick drum — outside mic
3. Snare — top mic
4. Snare — bottom mic
5. Hi-hat
6. Tom 1 (high tom)
7. Tom 2 (mid tom)
8. Tom 3 (floor tom)
9. Ride cymbal
10. Overhead — left
11. Overhead — right
12. Spare / room mic

### Bass (Ch 13–14)
13. Bass — DI
14. Bass — amp mic (optional)

### Guitars (Ch 15–20)
15. GTR 1 — DI
16. GTR 1 — amp mic
17. GTR 2 — DI
18. GTR 2 — amp mic
19. Acoustic guitar
20. Spare

### Keys (Ch 21–24)
21. Keys 1 — left
22. Keys 1 — right
23. Keys 2 — left
24. Keys 2 — right

### Horns / Additional Instruments (Ch 25–28)
25. Saxophone
26. Trumpet
27. Trombone
28. Additional

### Vocals (Ch 29–36+)
29. Lead vocal
30. Harmony vocal 1
31. Harmony vocal 2
32. Additional vocals...

### Backing Tracks / Playback (last channels)
- Click track (usually last, feeds drummer's IEM)
- Stereo playback L/R

**Why this order:**
- Consoles are laid out in banks of 8 — instruments of the same type stay in one bank
- Stereo pairs should start on odd channels (1–2, 3–4) for ganging on older desks
- Leave 1–2 spare channels; last-minute additions are inevitable

---

## FOH Input List vs. Monitor Input List

They use the same physical inputs from stage. The difference is what the engineer does with them.

| | FOH Input List | Monitor Input List |
|---|---|---|
| **Purpose** | Mix for the audience | Mix for performers on stage |
| **Focus** | Main outputs | Aux sends / monitor buses |
| **Key columns** | Channel, source, mic type, phantom, EQ notes | Channel, source, which monitor mixes it feeds |
| **Format** | Same spreadsheet, separate columns | Same spreadsheet, monitor mix columns added |

In practice, both are on the same spreadsheet. The FOH engineer reads the left columns; the monitor engineer reads the right columns.

---

## Monitor Mix Assignments

### How Many Mixes

| Show Size | Typical Mixes |
|---|---|
| Solo acoustic | 1–2 |
| 4-piece band | 3–4 |
| 8–10 piece | 5–6 |
| Large touring act | 8–10+ |
| Orchestra/festival | 10+ |

### Naming Conventions

Option 1 — by performer/role:
- Drums Mix, Bass Mix, Keys Mix, Lead Vocal Mix, Harmony Vocal Mix

Option 2 — numbered with description:
- Mix 1: Drums | Mix 2: Bass/Keys | Mix 3: Lead Vocal | Mix 4: Horns

### In the Input List
The "Monitor Mix Assignments" column specifies which mixes each input feeds:

| Source | Monitor Mix |
|---|---|
| Kick In | All mixes |
| Snare Top | Drums Mix, Bass Mix |
| Lead Vocal | Lead Vocal Mix, Harmony Mix |
| Backing Vocals | NOT in GTR mix (distracting) |
| Click Track | Drums Mix only |

### Additional Monitor Notes Column
Capture level preferences per mix:
- "Kick: high in drummer mix, moderate in bass mix, low in guitar mix"
- "Lead vocal: very high in their own mix, moderate in backup mix"
- "Drummer prefers click in left ear, kick drum in right ear"

---

## Phantom Power, Pad & Mic-Pre Settings

### Phantom Power (48V)

| When Needed | When NOT Needed |
|---|---|
| Condenser microphones | Dynamic mics (SM58, kick mics, etc.) |
| Active DI boxes | Passive DI boxes |
| Most headset/lav mics | Ribbon mics (WILL DAMAGE THEM) |

**Most critical note in the comments column:** `"RIBBON MIC — DO NOT ENABLE PHANTOM POWER"`

### Pad (-dB Attenuation)
- Reduces input level when signal is too hot for the preamp
- Common settings: -10dB, -15dB, -20dB
- Note in list: "Likely needs -20dB pad" for loud sources
- Common scenarios: kick drum mics, very loud guitar amps, keyboard line-level outputs

### Ground Lift
- Disconnects pin 1 on XLR to break ground loops that cause hum
- Note: "Ground lift: engage if hum present" (especially on DI boxes on long cable runs)

### Polarity / Phase
- Some inputs need inversion — most commonly when two mics cover same source (kick in/out, snare top/bottom)
- Note: "Check phase during soundcheck" for known dual-mic sources
- Engineer inverts as needed during soundcheck

### High-Pass Filter (HPF)
- Cuts low-frequency rumble below ~80–100Hz
- Almost always engaged for vocals and guitars
- Can note in comments but most engineers apply automatically

---

## Splits and Patches

### Signal Splits
When one source needs to go to multiple destinations:
- Kick drum → FOH console AND drummer's monitor mix
- Lead vocal → main output AND broadcast desk
- Click track → drummer's IEM AND bass player's wedge

Document in "Notes" column: "Split to Drums Mix 2" or "Feed to FOH and broadcast desk"

### Patching
The complete routing from stage to console:

```
Stage box → Snake cable → Console inputs
```

Document:
- Which stage box handles which channel ranges ("Stage Box A: Ch 1–16")
- Which sub-snakes plug into which stage box inputs
- Snake cable label ("Snake A runs to FOH position, 150 ft")

### Sub-Snakes
Smaller breakout snakes for dense areas:
- Drums sub-snake: 12 inputs → feeds Stage Box A, inputs 1–12
- Keys sub-snake: 8 inputs → feeds Stage Box A, inputs 21–28

---

## Input List by Ensemble Size

| | Solo Act | 4-Piece Band | 8–10 Piece | Large Tour |
|---|---|---|---|---|
| **Total inputs** | 2–4 | 12–15 | 24–32 | 48–64+ |
| **Monitor mixes** | 1–2 | 3–4 | 5–6 | 8–10+ |
| **Pages** | Half a page | 1–2 | 2–3 | 4–6+ |
| **Wireless coordination** | Rarely | Occasionally | Often | Always |
| **Sub-snakes** | No | Maybe | Yes | Multiple |

---

## Notes Column: What Goes There

The notes column captures everything that doesn't fit elsewhere:

**Microphone specifics:**
- "Shure SM58 with clip" / "Beta 87A on boom arm"
- "Wireless handheld: Sennheiser EW100 G3, ch 38, 566.250 MHz"
- "Condenser — 48V phantom required"

**Signal level:**
- "Very hot output — likely needs -20dB pad"
- "Quiet source — use full preamp gain"
- "Keyboard runs at +4dBu line level — pad recommended"

**Critical warnings:**
- "RIBBON MIC — DO NOT USE PHANTOM POWER"
- "Do NOT gate — musician uses natural dynamics"
- "Sensitive to interference — run cable away from power"

**Monitor preferences:**
- "Kick: loud in drummer mix, moderate in bass"
- "Backing vocals: NOT in guitarist mix (distracting)"

**Equipment responsibility:**
- "House wireless system" / "Artist provides own mic — bring SM58 backup"
- "Rental from SLS Audio, invoice #4521"

**Backups:**
- "Primary: SM58. Backup: Beta 58A (slightly different tone)"
- "Wireless pack prone to battery issues — have spare ready"
- "If snare mic fails, blend top/bottom"

**Environmental:**
- "Long cable run (150 ft) — ground lift may be needed"
- "Outdoor show — waterproof mic recommended"

---

## Connection to Stage Plot

Every channel in the input list must correspond to a labeled position on the stage plot. The channel number should appear next to its mic symbol on the plot.

**Color coding (cable + plot + list should all match):**
- Red = Drums (Ch 1–12)
- Blue = Bass/Keys (Ch 13–24)
- Yellow = Guitars (Ch 15–20)
- Green = Vocals (Ch 29+)

When either document is updated, the other must be updated to match. Both carry the same version number and date.

---

## What the PM Provides vs. What Engineers Return

### PM Provides to Engineers
- Complete input list (channels, mic models, stage locations, phantom, monitor assignments)
- Stage plot with channel numbers labeled
- Tech rider (console requirements, outboard gear, monitor system type)
- Musician preferences and special requirements
- Equipment the tour brings vs. expects from venue

### Engineers Return to PM
- Confirmation the console can accommodate the channel count and mix count
- Any necessary compromises ("We can do 4 mixes, not 6")
- Questions on microphone models or DI types
- Post-soundcheck notes: what worked, what to change, optimized patch plan for next venue
- RF frequency notes for interference issues

---

## Current Tools & Their Gaps

| Tool | Strengths | Gaps |
|---|---|---|
| Excel / Google Sheets | Free, flexible, universal | No templates; no validation; no stage plot integration |
| AUDIOPATCH | Purpose-built, professional output | Subscription cost; not integrated with stage plot or rider |
| RiderMaker | Stage plot + input list in one tool | Input list detail is basic; monitor visualization weak |
| RevolutionStagePlot Mobile | Good on-site mobile use | Mobile-only; limited detail |
| PDF + Excel (most common) | Maximum flexibility | Completely manual; zero cross-referencing; error-prone |

**The universal gap:** No tool integrates the input list with the stage plot, validates consistency between them, or generates a complete advance package with both documents in sync.

---

## Most Common Soundcheck Problems (That a Good Input List Prevents)

| Mistake | Impact |
|---|---|
| Missing instruments from list | Channels unassigned at soundcheck; cable must be re-run |
| No monitor mix assignments | Monitor engineer guessing; musicians can't hear themselves |
| Phantom power on ribbon mic | Mic damaged; replacement needed |
| No stage location on inputs | Cables patched to wrong position |
| Vague mic specs ("condenser") | Wrong mic grabbed; wrong tone |
| No wireless frequency listed | RF interference during show |
| No spare channels | No flexibility when band adds/changes gear |
| No equipment ownership noted | Missing or duplicate gear at load-in |
| FOH and monitor lists out of sync | Engineers work against each other |
| Inconsistent naming | "Vocal 1" vs. "Lead Vocal" — crew confused mid-soundcheck |

---

*Last updated: 2026-04-09*
