-- ============================================================================
-- Add AI description fields and enhance review content
-- ============================================================================

-- Add AI-generated description fields to businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ai_description TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ai_description_generated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ai_description_source TEXT; -- website URL, review summary, etc.
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS editorial_summary TEXT; -- Google's editorial summary
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ai_business_summary TEXT; -- AI summary based on reviews + website

-- Add index for AI description freshness queries
CREATE INDEX IF NOT EXISTS idx_businesses_ai_description_generated
  ON businesses(ai_description_generated_at)
  WHERE ai_description IS NOT NULL;

-- Add index for external time sorting on reviews (if not exists)
CREATE INDEX IF NOT EXISTS idx_reviews_external_time
  ON reviews(external_time DESC)
  WHERE external_time IS NOT NULL;

-- Add source index on reviews for filtering
CREATE INDEX IF NOT EXISTS idx_reviews_source
  ON reviews(source, created_at DESC);

-- ============================================================================
-- Function to get or create AI description
-- ============================================================================

CREATE OR REPLACE FUNCTION get_or_create_ai_description(
  p_business_id UUID,
  p_max_age_days INTEGER DEFAULT 90
)
RETURNS TABLE (
  description TEXT,
  generated_at TIMESTAMP WITH TIME ZONE,
  is_fresh BOOLEAN
) AS $$
DECLARE
  v_description TEXT;
  v_generated_at TIMESTAMP WITH TIME ZONE;
  v_is_fresh BOOLEAN;
BEGIN
  -- Get current AI description
  SELECT
    ai_description,
    ai_description_generated_at
  INTO
    v_description,
    v_generated_at
  FROM businesses
  WHERE id = p_business_id;

  -- Check if fresh (within max_age_days)
  v_is_fresh := v_description IS NOT NULL
    AND v_generated_at IS NOT NULL
    AND v_generated_at > (NOW() - (p_max_age_days || ' days')::INTERVAL);

  RETURN QUERY SELECT v_description, v_generated_at, v_is_fresh;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function to update AI description
-- ============================================================================

CREATE OR REPLACE FUNCTION update_ai_description(
  p_business_id UUID,
  p_description TEXT,
  p_source TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE businesses
  SET
    ai_description = p_description,
    ai_description_generated_at = NOW(),
    ai_description_source = p_source,
    updated_at = NOW()
  WHERE id = p_business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function to get business with AI-enhanced details
-- ============================================================================

CREATE OR REPLACE FUNCTION get_business_with_ai_details(p_business_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  short_description TEXT,
  ai_description TEXT,
  ai_description_generated_at TIMESTAMP WITH TIME ZONE,
  editorial_summary TEXT,
  website TEXT,
  place_id TEXT,
  category_name TEXT,
  city TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.description,
    b.short_description,
    b.ai_description,
    b.ai_description_generated_at,
    b.editorial_summary,
    b.website,
    b.place_id,
    c.name as category_name,
    b.city
  FROM businesses b
  LEFT JOIN categories c ON c.id = b.category_id
  WHERE b.id = p_business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
