-- Migration: Add New Features (Achievements, Leaderboards, Flashcards, Streaks, Simulator Stats)
-- Date: 2026-01-24
-- Description: Updates database schema to match current application features

-- ============================================================================
-- STEP 1: UPDATE PROFILES TABLE
-- Add ai_questions_asked column if it doesn't exist
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'ai_questions_asked'
  ) THEN
    ALTER TABLE profiles ADD COLUMN ai_questions_asked INTEGER DEFAULT 0;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: DROP LEGACY TABLES AND VIEWS
-- Remove tables that are no longer used
-- ============================================================================

-- Drop view first (depends on questions table)
DROP VIEW IF EXISTS user_topic_performance;

-- Drop legacy tables
DROP TABLE IF EXISTS bookmarks CASCADE;
DROP TABLE IF EXISTS user_progress CASCADE;
DROP TABLE IF EXISTS study_sessions CASCADE;
DROP TABLE IF EXISTS questions CASCADE;

-- Drop legacy function if exists
DROP FUNCTION IF EXISTS get_user_stats(UUID);

-- ============================================================================
-- STEP 3: CREATE NEW TABLES
-- ============================================================================

-- USER_ACHIEVEMENTS TABLE
-- Tracks which achievements a user has unlocked
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create
DROP POLICY IF EXISTS "Users can view own achievements" ON user_achievements;
DROP POLICY IF EXISTS "Users can insert own achievements" ON user_achievements;

CREATE POLICY "Users can view own achievements" ON user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements" ON user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

-- USER_FLASHCARD_PROGRESS TABLE
-- Tracks spaced repetition progress for flashcards (SM-2 algorithm)
CREATE TABLE IF NOT EXISTS user_flashcard_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  flashcard_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  ease_factor REAL DEFAULT 2.5,
  interval_days INTEGER DEFAULT 1,
  repetitions INTEGER DEFAULT 0,
  next_review_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, flashcard_id)
);

ALTER TABLE user_flashcard_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own flashcard progress" ON user_flashcard_progress;

CREATE POLICY "Users can manage own flashcard progress" ON user_flashcard_progress
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_flashcard_progress_review
  ON user_flashcard_progress(user_id, next_review_at);

-- USER_BOOKMARKS TABLE
-- Stores user bookmarks and notes on lessons
CREATE TABLE IF NOT EXISTS user_bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  lesson_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  note TEXT,
  block_index INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own bookmarks" ON user_bookmarks;

CREATE POLICY "Users can manage own bookmarks" ON user_bookmarks
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_lesson ON user_bookmarks(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON user_bookmarks(user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_bookmarks_updated_at ON user_bookmarks;
CREATE TRIGGER update_bookmarks_updated_at
  BEFORE UPDATE ON user_bookmarks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- LEADERBOARD_ENTRIES TABLE
-- Stores aggregated user scores for the leaderboard
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  display_name TEXT NOT NULL,
  total_score INTEGER DEFAULT 0,
  lessons_completed INTEGER DEFAULT 0,
  quizzes_perfect INTEGER DEFAULT 0,
  achievements_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view leaderboard" ON leaderboard_entries;
DROP POLICY IF EXISTS "Users can manage own leaderboard entry" ON leaderboard_entries;

CREATE POLICY "Anyone can view leaderboard" ON leaderboard_entries
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own leaderboard entry" ON leaderboard_entries
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard_entries(total_score DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_leaderboard_updated_at ON leaderboard_entries;
CREATE TRIGGER update_leaderboard_updated_at
  BEFORE UPDATE ON leaderboard_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- USER_STREAKS TABLE
-- Tracks daily learning streaks
CREATE TABLE IF NOT EXISTS user_streaks (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own streaks" ON user_streaks;

CREATE POLICY "Users can manage own streaks" ON user_streaks
  FOR ALL USING (auth.uid() = user_id);

-- USER_SIMULATOR_STATS TABLE
-- Tracks simulator usage and achievements
CREATE TABLE IF NOT EXISTS user_simulator_stats (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  flight_launches INTEGER DEFAULT 0,
  orbit_transfers INTEGER DEFAULT 0,
  flight_max_altitude REAL DEFAULT 0,
  flight_max_speed REAL DEFAULT 0,
  orbit_max_distance REAL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_simulator_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own simulator stats" ON user_simulator_stats;

CREATE POLICY "Users can manage own simulator stats" ON user_simulator_stats
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 4: CREATE FUNCTIONS
-- ============================================================================

-- Function to get top leaderboard entries
CREATE OR REPLACE FUNCTION get_leaderboard(limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  rank BIGINT,
  display_name TEXT,
  total_score INTEGER,
  lessons_completed INTEGER,
  achievements_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY le.total_score DESC)::BIGINT as rank,
    le.display_name,
    le.total_score,
    le.lessons_completed,
    le.achievements_count
  FROM leaderboard_entries le
  WHERE le.total_score > 0
  ORDER BY le.total_score DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment AI questions asked
-- Drop first to avoid parameter name conflicts
DROP FUNCTION IF EXISTS increment_ai_questions(UUID);
CREATE FUNCTION increment_ai_questions(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET ai_questions_asked = COALESCE(ai_questions_asked, 0) + 1
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- To rollback, run the following:
-- DROP TABLE IF EXISTS user_achievements CASCADE;
-- DROP TABLE IF EXISTS user_flashcard_progress CASCADE;
-- DROP TABLE IF EXISTS user_bookmarks CASCADE;
-- DROP TABLE IF EXISTS leaderboard_entries CASCADE;
-- DROP TABLE IF EXISTS user_streaks CASCADE;
-- DROP TABLE IF EXISTS user_simulator_stats CASCADE;
-- DROP FUNCTION IF EXISTS get_leaderboard(INTEGER);
-- DROP FUNCTION IF EXISTS increment_ai_questions(UUID);
-- ALTER TABLE profiles DROP COLUMN IF EXISTS ai_questions_asked;
