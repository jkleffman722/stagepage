# StagePage — Changelog

Running build log. One entry per shipped feature, newest first. Updated by the product-builder on every ship step.

Format:
```
## [Feature Name] — Mon YYYY
**Roadmap:** P0 / P1 / P2 / P3
**Spec:** docs/specs/[feature].md (or "pre-spec era")
**Summary:** What was built.
**Follow-ups added:** Any items surfaced by PM consultation that went on the roadmap.
```

---

## Show-Level Notes / Communication Log — May 2026
**Roadmap:** P0
**Spec:** pre-spec era
**Summary:** Append-only internal note log per show advance. `ShowNotesLog` client component with ⌘↵ shortcut and optimistic update; `addShowNote()` server action; `show_notes JSONB` column on `show_advances` (migration 011). Notes excluded from share/print by default; optional via "Include internal notes" checkbox.
**Follow-ups added:** Date format in note entries — show year only when it differs from current year.

---

## Day Sheet Generator — Apr 2026
**Roadmap:** P0
**Spec:** pre-spec era
**Summary:** Operational show-day document at `/day-sheet`. Day-of notes (amber, autosaving), call times table (full order from crew access → must clear by), venue + tour contacts, venue & load-in, key logistics. Print view at `/day-sheet/print` (two-column, hard curfew amber, `** UNCONFIRMED **` for critical unconfirmed fields). Share link at `/share/day-sheet/[token]` isolated from advance tokens via `type` column (migration 010).
**Follow-ups added:** `foh_engineer` and `head_rigger` fields added to tech rider `tour_info` section; both surface in day sheet page, print, and share views.

---

## Tech Rider + Input List PDF Import — Apr 2026
**Roadmap:** P0 (part of core loop)
**Spec:** pre-spec era
**Summary:** `RiderImportButton` / `RiderImportModal` — upload PDF → Claude Haiku extracts fields with confidence levels. `field_sources JSONB` on `tech_rider_sections` (migration 007) tracks per-field provenance. Confidence badges persist on rider page; cleared on manual save.
**Follow-ups added:** Input list PDF import not yet built.

---

## Routing Sheet Import — Apr 2026
**Roadmap:** P0 (core loop)
**Spec:** pre-spec era
**Summary:** `RoutingImportModal` accepts plain text, CSV, XLSX/XLS, or PDF. Claude Haiku fuzzy-matches venues against DB. Preview with confidence badges. Bulk import with automatic share requests.
**Follow-ups added:** None.

---

## Advance Sheet + Confirmation Tracking — Apr 2026
**Roadmap:** P0 (core loop)
**Spec:** pre-spec era
**Summary:** Full advance sheet with hot points, source badges, conflict panel, pre-advance checks, field request queue, confirmation tracking (`field_confirmations JSONB`, migration 009), share/export. Hot points progress bar.
**Follow-ups added:** Field tailoring on share links (P1).

---

## Show Notes / Field Requests / Share Requests — Apr 2026
**Roadmap:** P0 (core loop)
**Spec:** pre-spec era
**Summary:** Field request queue from advance sheet to venue packet. Share requests workflow (approve/deny/revoke). Advance share tokens (migration 006).
**Follow-ups added:** None.
