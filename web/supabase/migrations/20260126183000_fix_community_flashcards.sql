-- Migration: Fix community_flashcards table
-- Description: Drops incomplete table and recreates with proper schema
-- This fixes the issue where CREATE TABLE IF NOT EXISTS skipped creation
-- but the existing table was missing required columns like 'status'

-- Drop existing table and all dependencies (indexes, policies, constraints)
DROP TABLE IF EXISTS community_flashcards CASCADE;

-- Recreate table with complete schema
CREATE TABLE community_flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id TEXT NOT NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  hint TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  UNIQUE(module_id, front)
);

-- Create indexes
CREATE INDEX idx_community_flashcards_status ON community_flashcards(status);
CREATE INDEX idx_community_flashcards_module ON community_flashcards(module_id, status);
CREATE INDEX idx_community_flashcards_created ON community_flashcards(created_at DESC);

-- Enable RLS
ALTER TABLE community_flashcards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view approved flashcards"
  ON community_flashcards
  FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Authenticated users can submit flashcards"
  ON community_flashcards
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can view all flashcards"
  ON community_flashcards
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update flashcards"
  ON community_flashcards
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete flashcards"
  ON community_flashcards
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Recreate RPC function (DROP first to handle any existing version)
DROP FUNCTION IF EXISTS find_similar_flashcards(TEXT, TEXT, INT);

CREATE FUNCTION find_similar_flashcards(
  p_module_id TEXT,
  p_front TEXT,
  p_limit INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  front TEXT,
  back TEXT,
  status TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cf.id,
    cf.front,
    cf.back,
    cf.status,
    word_similarity(p_front, cf.front) AS similarity
  FROM community_flashcards cf
  WHERE cf.module_id = p_module_id
    AND cf.status != 'rejected'
  ORDER BY similarity DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION find_similar_flashcards TO authenticated;

-- Ensure pg_trgm extension exists (for text similarity)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
