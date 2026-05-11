-- ============================================================
-- Migration 007: Add field_sources to tech_rider_sections
-- Tracks AI import confidence per field so the UI can flag
-- low/medium confidence extractions for PM verification.
-- Run this in the Supabase SQL editor.
-- ============================================================

ALTER TABLE tech_rider_sections
  ADD COLUMN IF NOT EXISTS field_sources JSONB NOT NULL DEFAULT '{}'::jsonb;
