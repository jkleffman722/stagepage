-- Add per-field confirmation tracking to show_advances.
-- field_confirmations is a JSONB map of field_key → FieldConfirmation.
-- Field keys follow the same convention as the advance sheet:
--   packet/rider fields: "section_key.field_key"  (e.g. "schedule.hard_curfew")
--   show-level fields:   "field_key"              (e.g. "promoter_rep")

ALTER TABLE show_advances
  ADD COLUMN IF NOT EXISTS field_confirmations JSONB NOT NULL DEFAULT '{}'::jsonb;
