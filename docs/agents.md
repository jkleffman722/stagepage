# StagePage — Build System

Four slash commands run the StagePage build process. All must be run from within the `stagepage/` project directory so their `@` context includes resolve correctly.

---

## Canonical Workflow

```
/spec [feature]          ← write the spec, consult PM, save as draft
  ↓
review docs/specs/[feature].md
  ↓
set Status: approved
  ↓
/product-builder [feature]   ← spec-gated build → quality check → PM review → ship
```

Never run `/product-builder` without an approved spec. That's the gate.

---

## The Four Skills

### `/spec [feature]`

**Purpose:** Write a rigorous, buildable feature spec before any code exists.

**Steps it runs:**
1. Find the feature in the roadmap (closest match if ambiguous — confirms with user)
2. Read all existing code relevant to the feature (components, routes, data it touches)
3. Consult `/pm-agent` — what does this need to feel like? What would make it useless?
4. Write the complete spec at `docs/specs/[feature-slug].md` using `docs/specs/_template.md`
5. Set `Status: draft` and tell you to review

**Output:** `docs/specs/[feature-slug].md` at `Status: draft`

**Context it loads:** `docs/product/features.md`, `docs/domain/tour-pm-domain.md`, `docs/product/roadmap.md`

---

### `/product-builder [feature]`

**Purpose:** Build an approved spec end-to-end — code, quality gates, PM validation, docs, commit.

**The 10-step loop:**
1. **Select** — from args or highest-priority unbuilt roadmap item
2. **Spec check** — gates on `Status: approved`; stops with instructions if not found or still draft
3. **Research (parallel)** — reads spec + all named files simultaneously
4. **Build** — implements exactly what the spec says, following all codebase patterns
5. **Quality check** — `npx tsc --noEmit` + `next lint` + `curl :3000/[route]` — all three must pass
6. **PM post-build consultation** — concrete description → honest "does this solve it?" feedback
7. **Adjust** — fixes every PM-flagged issue; re-runs quality gates
8. **Commit** — structured git commit with roadmap reference
9. **Ship** — updates `features.md` + `changelog.md` + `roadmap.md` + spec `Status: shipped`
10. **Repeat** — next item unless stopped

**Context it loads:** `docs/product/architecture.md`, `docs/product/features.md`, `docs/domain/tour-pm-domain.md`, `docs/product/roadmap.md`

---

### `/pm-agent`

**Purpose:** A Tour PM who thinks from the perspective of someone opening this app at 7am before a load-in — not a product manager.

**When to use:**
- Independently, to pressure-test a product decision before you've written a spec
- Via `/spec` (pre-spec consultation) — auto-invoked
- Via `/product-builder` (post-build validation) — auto-invoked

**Ask specific questions.** Vague questions get vague answers. Ground every question in a concrete show-day scenario.

**Context it loads:** `docs/product/features.md`, `docs/domain/tour-pm-domain.md`

---

### `/status`

**Purpose:** Fast project snapshot — what's built, what's next, what's stale.

**Checks (run in parallel):**
- Last 10 git commits
- Next unbuilt item at each priority level (P0, P1, P2)
- Changelog freshness vs. last commit date (flags if stale by >1 day)
- Open TODOs/FIXMEs in `src/`
- Pending specs in `docs/specs/`
- Dev server health at `:3000`

**Output:** ≤30 lines. No fluff.

---

## Spec Lifecycle

```
draft → approved → in-progress → shipped
                              ↘ abandoned
```

- `draft` — written, not reviewed
- `approved` — reviewed, ready to build (gates `/product-builder`)
- `in-progress` — set by product-builder at start of Step 4
- `shipped` — set by product-builder at Step 9 after all docs updated
- `abandoned` — set manually when a feature is deprioritized or superseded

---

## Rollback

If a build ships something broken:

```bash
git log --oneline -5          # find the bad commit
git revert [commit-hash]      # creates a new revert commit, never rewrites history
```

Then reset the spec `Status: approved` and re-run `/product-builder [feature]`.

---

## Key Files

| File | Purpose | Updated by |
|------|---------|-----------|
| `docs/product/architecture.md` | Tech stack, data model, critical patterns, migrations | Manually when stack changes |
| `docs/product/features.md` | What's built — every component, route, behavior, known gap | `/product-builder` on every ship |
| `docs/product/changelog.md` | Running build log, newest-first | `/product-builder` on every ship |
| `docs/product/roadmap.md` | Prioritized feature list (P0–P3), completed items, follow-ups | `/product-builder` on every ship |
| `docs/domain/tour-pm-domain.md` | PM workflow domain knowledge — how advancing actually works | Rarely; only when domain understanding deepens |
| `docs/specs/` | One spec file per feature | `/spec` creates, `/product-builder` updates status |
| `docs/specs/_template.md` | Spec format | Don't modify unless updating the process itself |
