-- ============================================================
-- Migration 002: Tech Rider tables
-- Run this in the Supabase SQL editor.
-- ============================================================

-- Tech Riders: one per tour
CREATE TABLE IF NOT EXISTS tech_riders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tour_id)
);

-- Tech Rider Sections: flexible JSONB fields per section
CREATE TABLE IF NOT EXISTS tech_rider_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID REFERENCES tech_riders(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  section_label TEXT NOT NULL,
  fields JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rider_id, section_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tech_riders_tour_id ON tech_riders(tour_id);
CREATE INDEX IF NOT EXISTS idx_tech_rider_sections_rider_id ON tech_rider_sections(rider_id);

-- RLS
ALTER TABLE tech_riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tech_rider_sections ENABLE ROW LEVEL SECURITY;

-- Tech riders: tour owner can do everything
CREATE POLICY "tech_riders_owner" ON tech_riders
  FOR ALL USING (
    tour_id IN (SELECT id FROM tours WHERE profile_id = auth.uid())
  );

-- Tech rider sections: tour owner can do everything
CREATE POLICY "tech_rider_sections_owner" ON tech_rider_sections
  FOR ALL USING (
    rider_id IN (
      SELECT tr.id FROM tech_riders tr
      JOIN tours t ON t.id = tr.tour_id
      WHERE t.profile_id = auth.uid()
    )
  );
