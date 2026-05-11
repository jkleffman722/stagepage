-- Add type column to advance_shares to distinguish advance vs day sheet share tokens.
-- Prevents day sheet tokens from being used at the advance share URL and vice versa.
ALTER TABLE advance_shares
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'advance';
