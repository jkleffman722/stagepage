-- ============================================================
-- Migration 003: Input List tables
-- Run this in the Supabase SQL editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS input_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tour_id)
);

CREATE TABLE IF NOT EXISTS input_list_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES input_lists(id) ON DELETE CASCADE,
  channel_number INTEGER,
  source_name TEXT,
  input_type TEXT,
  mic_model TEXT,
  phantom_power BOOLEAN,
  stage_location TEXT,
  monitor_mixes TEXT,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_input_lists_tour_id ON input_lists(tour_id);
CREATE INDEX IF NOT EXISTS idx_input_list_channels_list_id ON input_list_channels(list_id);
CREATE INDEX IF NOT EXISTS idx_input_list_channels_sort_order ON input_list_channels(list_id, sort_order);

ALTER TABLE input_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE input_list_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "input_lists_owner" ON input_lists
  FOR ALL USING (
    tour_id IN (SELECT id FROM tours WHERE profile_id = auth.uid())
  );

CREATE POLICY "input_list_channels_owner" ON input_list_channels
  FOR ALL USING (
    list_id IN (
      SELECT il.id FROM input_lists il
      JOIN tours t ON t.id = il.tour_id
      WHERE t.profile_id = auth.uid()
    )
  );
