-- ============================================================
-- Migration 004: Show advance per-show fields
-- Run this in the Supabase SQL editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS show_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID REFERENCES shows(id) ON DELETE CASCADE,
  fields JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(show_id)
);

CREATE INDEX IF NOT EXISTS idx_show_advances_show_id ON show_advances(show_id);

ALTER TABLE show_advances ENABLE ROW LEVEL SECURITY;

-- Tour owner can read/write advances for their shows
CREATE POLICY "show_advances_owner" ON show_advances
  FOR ALL USING (
    show_id IN (
      SELECT s.id FROM shows s
      JOIN tours t ON t.id = s.tour_id
      WHERE t.profile_id = auth.uid()
    )
  );
