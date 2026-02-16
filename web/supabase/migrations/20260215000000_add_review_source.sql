-- ============================================================================
-- Add source field to reviews for Google Places integration
-- ============================================================================

-- Add source column to track where reviews come from
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'pulse' CHECK (source IN ('pulse', 'google', 'yelp'));

-- Add external_id column to store the original review ID from external sources
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Add external_author_name column to store the original author's name
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS external_author_name TEXT;

-- Add external_author_photo column to store the original author's photo URL
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS external_author_photo TEXT;

-- Add external_time column to store the original review timestamp
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS external_time TIMESTAMP WITH TIME ZONE;

-- Make user_id nullable for external reviews
ALTER TABLE reviews ALTER COLUMN user_id DROP NOT NULL;

-- Update the unique constraint to allow external reviews from same business
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_business_id_user_id_key;

-- Create partial unique index only for pulse reviews (where user_id is not null)
CREATE UNIQUE INDEX IF NOT EXISTS reviews_business_user_unique
  ON reviews(business_id, user_id)
  WHERE user_id IS NOT NULL;

-- Create index for external reviews lookup
CREATE UNIQUE INDEX IF NOT EXISTS reviews_external_unique
  ON reviews(business_id, external_id, source)
  WHERE external_id IS NOT NULL;

-- ============================================================================
-- Create system user for external reviews
-- ============================================================================

-- Create a system profile for external reviews (this will be created via admin)
-- The ID '00000000-0000-0000-0000-000000000000' is reserved for system/external reviews
INSERT INTO profiles (id, full_name, avatar_url)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Google Reviewer',
  null
)
ON CONFLICT (id) DO UPDATE SET full_name = 'Google Reviewer';

-- ============================================================================
-- Function to sync Google reviews
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_google_reviews(
  p_business_id UUID,
  p_place_id TEXT,
  p_reviews JSONB
)
RETURNS VOID AS $$
DECLARE
  v_review JSONB;
BEGIN
  -- Loop through each review in the JSON array
  FOR v_review IN SELECT * FROM jsonb_array_elements(p_reviews)
  LOOP
    -- Insert or update the review
    INSERT INTO reviews (
      business_id,
      user_id,
      rating,
      content,
      source,
      external_id,
      external_author_name,
      external_author_photo,
      external_time,
      verified_purchase
    )
    VALUES (
      p_business_id,
      NULL, -- No local user for external reviews
      (v_review->>'rating')::INTEGER,
      v_review->>'text',
      'google',
      v_review->>'review_id',
      v_review->>'author_name',
      v_review->>'author_photo',
      (v_review->>'time')::TIMESTAMP WITH TIME ZONE,
      true -- Consider external reviews as verified
    )
    ON CONFLICT (business_id, external_id, source)
    DO UPDATE SET
      rating = EXCLUDED.rating,
      content = EXCLUDED.content,
      external_author_name = EXCLUDED.external_author_name,
      external_author_photo = EXCLUDED.external_author_photo,
      updated_at = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Update RLS policies for external reviews
-- ============================================================================

-- Allow anyone to view external reviews (already covered by existing policy)

-- Only allow service role or admin to insert/update external reviews
CREATE POLICY "Only service role can manage external reviews" ON reviews
  FOR ALL
  USING (source = 'pulse' OR auth.uid() = '00000000-0000-0000-0000-000000000000')
  WITH CHECK (source = 'pulse' OR auth.uid() = '00000000-0000-0000-0000-000000000000');
