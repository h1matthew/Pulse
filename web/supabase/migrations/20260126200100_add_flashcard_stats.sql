-- Migration: Add User Flashcard Stats
-- Date: 2026-01-26
-- Description: Creates table for tracking flashcard achievements and stats

-- ============================================================================
-- USER_FLASHCARD_STATS TABLE
-- Aggregated statistics for flashcard usage and achievements
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_flashcard_stats (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  sets_completed INTEGER DEFAULT 0,
  review_streak_current INTEGER DEFAULT 0,
  review_streak_longest INTEGER DEFAULT 0,
  perfect_scores INTEGER DEFAULT 0,
  cards_mastered INTEGER DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  last_review_date DATE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_flashcard_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own flashcard stats" ON user_flashcard_stats;
CREATE POLICY "Users can view own flashcard stats" ON user_flashcard_stats
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own flashcard stats" ON user_flashcard_stats;
CREATE POLICY "Users can insert own flashcard stats" ON user_flashcard_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own flashcard stats" ON user_flashcard_stats;
CREATE POLICY "Users can update own flashcard stats" ON user_flashcard_stats
  FOR UPDATE USING (auth.uid() = user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_flashcard_stats_updated_at ON user_flashcard_stats;
CREATE TRIGGER update_flashcard_stats_updated_at
  BEFORE UPDATE ON user_flashcard_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTIONS FOR FLASHCARD STATS
-- ============================================================================

-- Function to record a flashcard review session
CREATE OR REPLACE FUNCTION record_flashcard_review(
  p_user_id UUID,
  p_cards_reviewed INTEGER,
  p_perfect_score BOOLEAN,
  p_set_completed BOOLEAN
)
RETURNS VOID AS $$
DECLARE
  v_last_review DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
BEGIN
  -- Get or create user stats
  INSERT INTO user_flashcard_stats (user_id, last_review_date)
  VALUES (p_user_id, CURRENT_DATE)
  ON CONFLICT (user_id) DO NOTHING;

  -- Get current stats
  SELECT last_review_date, review_streak_current, review_streak_longest
  INTO v_last_review, v_current_streak, v_longest_streak
  FROM user_flashcard_stats
  WHERE user_id = p_user_id;

  -- Calculate new streak
  IF v_last_review IS NULL OR v_last_review < CURRENT_DATE - INTERVAL '1 day' THEN
    -- Streak broken, reset to 1
    v_current_streak := 1;
  ELSIF v_last_review = CURRENT_DATE - INTERVAL '1 day' THEN
    -- Continue streak
    v_current_streak := v_current_streak + 1;
  END IF;
  -- If reviewed same day, don't increment streak

  -- Update longest streak if needed
  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
  END IF;

  -- Update stats
  UPDATE user_flashcard_stats
  SET
    total_reviews = total_reviews + p_cards_reviewed,
    perfect_scores = perfect_scores + CASE WHEN p_perfect_score THEN 1 ELSE 0 END,
    sets_completed = sets_completed + CASE WHEN p_set_completed THEN 1 ELSE 0 END,
    review_streak_current = v_current_streak,
    review_streak_longest = v_longest_streak,
    last_review_date = CURRENT_DATE
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment mastered cards count
CREATE OR REPLACE FUNCTION increment_cards_mastered(
  p_user_id UUID,
  p_count INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_flashcard_stats (user_id, cards_mastered)
  VALUES (p_user_id, p_count)
  ON CONFLICT (user_id) DO UPDATE
  SET cards_mastered = user_flashcard_stats.cards_mastered + p_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get flashcard stats for a user
CREATE OR REPLACE FUNCTION get_flashcard_stats(p_user_id UUID)
RETURNS TABLE (
  sets_completed INTEGER,
  review_streak_current INTEGER,
  review_streak_longest INTEGER,
  perfect_scores INTEGER,
  cards_mastered INTEGER,
  total_reviews INTEGER,
  last_review_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(ufs.sets_completed, 0),
    COALESCE(ufs.review_streak_current, 0),
    COALESCE(ufs.review_streak_longest, 0),
    COALESCE(ufs.perfect_scores, 0),
    COALESCE(ufs.cards_mastered, 0),
    COALESCE(ufs.total_reviews, 0),
    ufs.last_review_date
  FROM user_flashcard_stats ufs
  WHERE ufs.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- To rollback, run the following:
-- DROP FUNCTION IF EXISTS get_flashcard_stats(UUID);
-- DROP FUNCTION IF EXISTS increment_cards_mastered(UUID, INTEGER);
-- DROP FUNCTION IF EXISTS record_flashcard_review(UUID, INTEGER, BOOLEAN, BOOLEAN);
-- DROP TABLE IF EXISTS user_flashcard_stats CASCADE;
