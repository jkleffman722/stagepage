# Spec: [Feature Name]

**Roadmap priority:** P0 / P1 / P2 / P3
**Roadmap item:** [exact text from roadmap.md]
**Status:** `draft` | `approved` | `in-progress` | `shipped` | `abandoned`
**Created:** YYYY-MM-DD
**Last updated:** YYYY-MM-DD

---

## Problem Statement

[1–2 sentences. What pain does this solve, for whom, and when does it occur?]

---

## User Story

> As a [role], I want to [action] so that [outcome].

---

## Scope

**In:**
- [What this feature includes]

**Out:**
- [What this feature explicitly does NOT include — prevents scope creep]

---

## UX Flow

1. [User does X]
2. [System responds with Y]
3. [User sees Z]

[Be concrete. Name the routes, components, and data involved.]

---

## Data Model Changes

[New tables, columns, migrations — or "None"]

```sql
-- Example migration
ALTER TABLE show_advances ADD COLUMN ...;
```

Migration file: `supabase/migrations/0NN_[name].sql`

---

## Components

**New:**
- `ComponentName` (`src/components/[artist|venue|shared]/ComponentName.tsx`) — purpose

**Modified:**
- `ComponentName` — what changes and why

**Server actions:**
- `actionName()` (`src/app/actions/[file].ts`) — what it does

---

## Acceptance Criteria

- [ ] [Specific, testable behavior 1]
- [ ] [Specific, testable behavior 2]
- [ ] TypeScript compiles without errors (`npx tsc --noEmit`)
- [ ] No ESLint errors (`next lint`)
- [ ] New route(s) return non-500 on dev server

---

## PM Agent Notes

[Key feedback from pre-build consultation. What did the PM say was essential? What edge cases did they flag? What would make this useless?]

---

## Technical Notes

[Patterns to follow from architecture.md. Gotchas specific to this feature. Anything that would trip up a builder coming in cold.]

---

## Open Questions

- [ ] [Anything unresolved before building can start]

---

## Post-Build PM Feedback

[Filled in after build. What did the PM say? What was adjusted?]
