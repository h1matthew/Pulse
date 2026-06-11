-- ============================================================================
-- Add is_chain flag to businesses
-- ============================================================================
-- The discover "Independent" filter and the Google Places sync/seed pipeline
-- both rely on businesses.is_chain, but the column was never added to the
-- schema. Without it, every sync/seed INSERT errors (column does not exist)
-- and the failure is swallowed by the per-place try/catch, which is why the
-- table stayed nearly empty. Add it (default independent) so seeding works and
-- the filter can prefer the stored flag over name-based classification.

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS is_chain BOOLEAN NOT NULL DEFAULT false;

-- Speeds up the common "independent only" filter.
CREATE INDEX IF NOT EXISTS idx_businesses_is_chain ON businesses (is_chain);
