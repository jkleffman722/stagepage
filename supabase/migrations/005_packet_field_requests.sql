-- ============================================================
-- Migration 005: PM → venue field requests
-- Run this in the Supabase SQL editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS packet_field_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  requester_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  show_id UUID REFERENCES shows(id) ON DELETE SET NULL,
  -- Array of "section_key.field_key" strings, e.g. ["power.service_type", "load_in.dock_height"]
  requested_fields JSONB NOT NULL DEFAULT '[]',
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'addressed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_field_requests_venue_id ON packet_field_requests(venue_id);
CREATE INDEX IF NOT EXISTS idx_field_requests_status ON packet_field_requests(status);

ALTER TABLE packet_field_requests ENABLE ROW LEVEL SECURITY;

-- Venue owner can read and update requests for their venue
CREATE POLICY "venue_read_field_requests" ON packet_field_requests
  FOR SELECT USING (
    venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid())
  );

CREATE POLICY "venue_update_field_requests" ON packet_field_requests
  FOR UPDATE USING (
    venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid())
  );

-- Artists can create requests for venues linked to their shows
CREATE POLICY "artist_create_field_requests" ON packet_field_requests
  FOR INSERT WITH CHECK (
    requester_profile_id = auth.uid()
    AND (
      show_id IS NULL
      OR show_id IN (
        SELECT s.id FROM shows s
        JOIN tours t ON t.id = s.tour_id
        WHERE t.profile_id = auth.uid()
      )
    )
  );

-- Artists can read their own requests
CREATE POLICY "artist_read_own_field_requests" ON packet_field_requests
  FOR SELECT USING (requester_profile_id = auth.uid());
