-- Add source tracking to deals (manual = user-created, scraped = auto-discovered from website)
ALTER TABLE deals ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Add scrape tracking to businesses
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS deals_last_scraped_at TIMESTAMP WITH TIME ZONE;

-- Index for efficient filtering by source
CREATE INDEX IF NOT EXISTS idx_deals_source ON deals(source);
