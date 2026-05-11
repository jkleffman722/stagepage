-- ============================================================
-- Migration 008: Fix share_requests.show_id FK cascade
-- The existing constraint has no ON DELETE action, causing
-- show deletions to fail when a share_request references the show.
-- Run this in the Supabase SQL editor.
-- ============================================================

ALTER TABLE share_requests
  DROP CONSTRAINT IF EXISTS share_requests_show_id_fkey;

ALTER TABLE share_requests
  ADD CONSTRAINT share_requests_show_id_fkey
  FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE SET NULL;
