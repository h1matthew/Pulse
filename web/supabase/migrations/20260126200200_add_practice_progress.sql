-- Migration: Add Practice Problem Progress
-- Date: 2026-01-26
-- Description: Creates table for tracking practice problem completion

-- ============================================================================
-- USER_PRACTICE_PROGRESS TABLE
-- Tracks which practice problems users have completed
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_practice_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  lesson_id TEXT NOT NULL,
  problem_index INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0,
  first_completed_at TIMESTAMP WITH TIME ZONE,
  last_attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, lesson_id, problem_index)
);

ALTER TABLE user_practice_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own practice progress" ON user_practice_progress;
CREATE POLICY "Users can view own practice progress" ON user_practice_progress
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own practice progress" ON user_practice_progress;
CREATE POLICY "Users can insert own practice progress" ON user_practice_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own practice progress" ON user_practice_progress;
CREATE POLICY "Users can update own practice progress" ON user_practice_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_practice_progress_user ON user_practice_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_progress_lesson ON user_practice_progress(user_id, lesson_id);

-- ============================================================================
-- FUNCTIONS FOR PRACTICE PROGRESS
-- ============================================================================

-- Function to record a practice problem attempt
CREATE OR REPLACE FUNCTION record_practice_attempt(
  p_user_id UUID,
  p_lesson_id TEXT,
  p_problem_index INTEGER,
  p_completed BOOLEAN DEFAULT FALSE
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_practice_progress (
    user_id,
    lesson_id,
    problem_index,
    completed,
    attempts,
    first_completed_at,
    last_attempted_at
  )
  VALUES (
    p_user_id,
    p_lesson_id,
    p_problem_index,
    p_completed,
    1,
    CASE WHEN p_completed THEN NOW() ELSE NULL END,
    NOW()
  )
  ON CONFLICT (user_id, lesson_id, problem_index) DO UPDATE
  SET
    completed = user_practice_progress.completed OR p_completed,
    attempts = user_practice_progress.attempts + 1,
    first_completed_at = CASE
      WHEN user_practice_progress.first_completed_at IS NULL AND p_completed THEN NOW()
      ELSE user_practice_progress.first_completed_at
    END,
    last_attempted_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get practice progress for a lesson
CREATE OR REPLACE FUNCTION get_lesson_practice_progress(
  p_user_id UUID,
  p_lesson_id TEXT
)
RETURNS TABLE (
  problem_index INTEGER,
  completed BOOLEAN,
  attempts INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    upp.problem_index,
    upp.completed,
    upp.attempts
  FROM user_practice_progress upp
  WHERE upp.user_id = p_user_id
  AND upp.lesson_id = p_lesson_id
  ORDER BY upp.problem_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get total practice problems completed by a user
CREATE OR REPLACE FUNCTION get_total_practice_completed(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM user_practice_progress
  WHERE user_id = p_user_id
  AND completed = TRUE;

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- To rollback, run the following:
-- DROP FUNCTION IF EXISTS get_total_practice_completed(UUID);
-- DROP FUNCTION IF EXISTS get_lesson_practice_progress(UUID, TEXT);
-- DROP FUNCTION IF EXISTS record_practice_attempt(UUID, TEXT, INTEGER, BOOLEAN);
-- DROP TABLE IF EXISTS user_practice_progress CASCADE;
