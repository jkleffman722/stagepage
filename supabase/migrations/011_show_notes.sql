-- Append-only communication log per show advance.
-- Each entry: { id, body, created_at, created_by_name }
ALTER TABLE show_advances
  ADD COLUMN IF NOT EXISTS show_notes JSONB NOT NULL DEFAULT '[]';
