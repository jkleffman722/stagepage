-- ============================================================
-- Migration 006: Advance share links
-- Run this in the Supabase SQL editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS advance_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advance_id UUID REFERENCES show_advances(id) ON DELETE CASCADE NOT NULL,
  show_id UUID REFERENCES shows(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_by UUID REFERENCES profiles(id) NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advance_shares_token ON advance_shares(token);
CREATE INDEX IF NOT EXISTS idx_advance_shares_advance_id ON advance_shares(advance_id);

ALTER TABLE advance_shares ENABLE ROW LEVEL SECURITY;

-- Owner can manage their own share links
CREATE POLICY "advance_shares_owner" ON advance_shares
  FOR ALL USING (created_by = auth.uid());

-- Anyone can read a share link by token (for the public share page)
CREATE POLICY "advance_shares_public_read" ON advance_shares
  FOR SELECT USING (true);
