-- Rocket Space - Course Platform Database Schema
-- This file contains the complete database schema for the application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm extension for text similarity
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- PROFILES TABLE
-- Extends Supabase auth.users with app-specific user data
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  lessons_completed INTEGER DEFAULT 0,
  ai_questions_asked INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================================
-- USER_LESSON_PROGRESS TABLE
-- Tracks user progress through lessons and quiz scores
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_lesson_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  lesson_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  quiz_score INTEGER,
  quiz_total INTEGER,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- Enable Row Level Security
ALTER TABLE user_lesson_progress ENABLE ROW LEVEL SECURITY;

-- Lesson progress policies
CREATE POLICY "Users can view own lesson progress" ON user_lesson_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lesson progress" ON user_lesson_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lesson progress" ON user_lesson_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_user ON user_lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_module ON user_lesson_progress(module_id);

-- ============================================================================
-- FUNCTIONS
-- Utility functions for the application
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to get course progress for a user
CREATE OR REPLACE FUNCTION get_course_progress(user_uuid UUID)
RETURNS TABLE (
  lessons_completed BIGINT,
  modules_with_progress BIGINT,
  total_quiz_score BIGINT,
  total_quiz_questions BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE completed = true)::BIGINT as lessons_completed,
    COUNT(DISTINCT module_id) FILTER (WHERE completed = true)::BIGINT as modules_with_progress,
    COALESCE(SUM(quiz_score) FILTER (WHERE quiz_score IS NOT NULL), 0)::BIGINT as total_quiz_score,
    COALESCE(SUM(quiz_total) FILTER (WHERE quiz_total IS NOT NULL), 0)::BIGINT as total_quiz_questions
  FROM user_lesson_progress
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STORAGE
-- Supabase Storage buckets for lesson media
-- ============================================================================

-- Create storage bucket for lesson images
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-images', 'lesson-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for lesson images
CREATE POLICY "Public Access to Lesson Images" ON storage.objects
  FOR SELECT USING (bucket_id = 'lesson-images');

CREATE POLICY "Authenticated users can upload lesson images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'lesson-images' AND
    auth.role() = 'authenticated'
  );

-- ============================================================================
-- USER_ACHIEVEMENTS TABLE
-- Tracks which achievements a user has unlocked
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements" ON user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements" ON user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

-- ============================================================================
-- USER_FLASHCARD_PROGRESS TABLE
-- Tracks spaced repetition progress for flashcards (SM-2 algorithm)
-- ============================================================================
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
  is_ai_generated BOOLEAN DEFAULT FALSE,
  last_ai_score REAL,
  UNIQUE(user_id, flashcard_id)
);

ALTER TABLE user_flashcard_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own flashcard progress" ON user_flashcard_progress
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_flashcard_progress_review
  ON user_flashcard_progress(user_id, next_review_at);

-- ============================================================================
-- USER_BOOKMARKS TABLE
-- Stores user bookmarks and notes on lessons
-- ============================================================================
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

CREATE POLICY "Users can manage own bookmarks" ON user_bookmarks
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_lesson ON user_bookmarks(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON user_bookmarks(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_bookmarks_updated_at
  BEFORE UPDATE ON user_bookmarks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- LEADERBOARD_ENTRIES TABLE
-- Stores aggregated user scores for the leaderboard
-- ============================================================================
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

CREATE POLICY "Anyone can view leaderboard" ON leaderboard_entries
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own leaderboard entry" ON leaderboard_entries
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard_entries(total_score DESC);

-- Trigger for updated_at
CREATE TRIGGER update_leaderboard_updated_at
  BEFORE UPDATE ON leaderboard_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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

-- ============================================================================
-- USER_STREAKS TABLE
-- Tracks daily learning streaks
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_streaks (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own streaks" ON user_streaks
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- USER_SIMULATOR_STATS TABLE
-- Tracks simulator usage and achievements
-- ============================================================================
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

CREATE POLICY "Users can manage own simulator stats" ON user_simulator_stats
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- INCREMENT FUNCTIONS
-- ============================================================================

-- Function to increment AI questions asked
CREATE OR REPLACE FUNCTION increment_ai_questions(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET ai_questions_asked = COALESCE(ai_questions_asked, 0) + 1
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- AI_GENERATED_FLASHCARDS TABLE
-- Shared repository of generated flashcards across all users
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_generated_flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flashcard_id TEXT NOT NULL UNIQUE,
  module_id TEXT NOT NULL,
  lesson_ids TEXT[] NOT NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  hint TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_by_user_id UUID REFERENCES profiles(id),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_flashcards_module ON ai_generated_flashcards(module_id);
CREATE INDEX IF NOT EXISTS idx_ai_flashcards_front_hash ON ai_generated_flashcards(md5(lower(front)));
CREATE INDEX IF NOT EXISTS idx_ai_flashcards_created_at ON ai_generated_flashcards(created_at DESC);

ALTER TABLE ai_generated_flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read AI flashcards" ON ai_generated_flashcards
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create AI flashcards" ON ai_generated_flashcards
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- USER_FLASHCARD_KNOWLEDGE TABLE
-- Track cards marked as "known" by users for smart filtering
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_flashcard_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  flashcard_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  is_ai_generated BOOLEAN DEFAULT FALSE,
  marked_known_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, flashcard_id)
);

CREATE INDEX IF NOT EXISTS idx_flashcard_knowledge_user ON user_flashcard_knowledge(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_knowledge_module ON user_flashcard_knowledge(user_id, module_id);

ALTER TABLE user_flashcard_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own flashcard knowledge" ON user_flashcard_knowledge
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own flashcard knowledge" ON user_flashcard_knowledge
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own flashcard knowledge" ON user_flashcard_knowledge
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- AI_GRADING_HISTORY TABLE
-- Store AI grading results for written answers
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_grading_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  flashcard_id TEXT NOT NULL,
  user_answer TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  ai_score REAL CHECK (ai_score >= 0 AND ai_score <= 1),
  ai_feedback TEXT NOT NULL,
  was_correct BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grading_history_user ON ai_grading_history(user_id, flashcard_id);
CREATE INDEX IF NOT EXISTS idx_grading_history_created_at ON ai_grading_history(created_at DESC);

ALTER TABLE ai_grading_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own grading history" ON ai_grading_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own grading history" ON ai_grading_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- COMMUNITY_FLASHCARDS TABLE
-- Admin-reviewed flashcards shared with all users
-- ============================================================================
CREATE TABLE IF NOT EXISTS community_flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id TEXT NOT NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  hint TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  UNIQUE(module_id, front)
);

CREATE INDEX IF NOT EXISTS idx_community_flashcards_status ON community_flashcards(status);
CREATE INDEX IF NOT EXISTS idx_community_flashcards_module ON community_flashcards(module_id, status);
CREATE INDEX IF NOT EXISTS idx_community_flashcards_created ON community_flashcards(created_at DESC);

ALTER TABLE community_flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved flashcards" ON community_flashcards
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Authenticated users can submit flashcards" ON community_flashcards
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can view all flashcards" ON community_flashcards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update flashcards" ON community_flashcards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete flashcards" ON community_flashcards
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- FLASHCARD FUNCTIONS
-- ============================================================================

-- Function to increment usage count for generated flashcards
CREATE OR REPLACE FUNCTION increment_flashcard_usage(card_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE ai_generated_flashcards
  SET usage_count = usage_count + 1
  WHERE flashcard_id = card_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get flashcard statistics for a module
CREATE OR REPLACE FUNCTION get_flashcard_stats(
  user_uuid UUID,
  mod_id TEXT
)
RETURNS TABLE (
  total_cards BIGINT,
  known_cards BIGINT,
  due_for_review BIGINT,
  ai_generated_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(DISTINCT flashcard_id)
     FROM user_flashcard_progress
     WHERE user_id = user_uuid AND module_id = mod_id)::BIGINT as total_cards,

    (SELECT COUNT(*)
     FROM user_flashcard_knowledge
     WHERE user_id = user_uuid AND module_id = mod_id)::BIGINT as known_cards,

    (SELECT COUNT(*)
     FROM user_flashcard_progress
     WHERE user_id = user_uuid
       AND module_id = mod_id
       AND next_review_at <= NOW())::BIGINT as due_for_review,

    (SELECT COUNT(*)
     FROM user_flashcard_progress
     WHERE user_id = user_uuid
       AND module_id = mod_id
       AND is_ai_generated = true)::BIGINT as ai_generated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find similar flashcards (for manual deduplication)
CREATE OR REPLACE FUNCTION find_similar_flashcards(
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

-- ============================================================================
-- FOUNDERS TABLE
-- Stores editable founder information for the About page
-- ============================================================================
CREATE TABLE IF NOT EXISTS founders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Cofounder',
  bio TEXT NOT NULL,
  image_url TEXT,
  image_offset_x REAL DEFAULT 50,
  image_offset_y REAL DEFAULT 50,
  image_zoom REAL DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE founders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view founders" ON founders
  FOR SELECT USING (true);

CREATE POLICY "Admins can update founders" ON founders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE TRIGGER update_founders_updated_at
  BEFORE UPDATE ON founders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seed founder data
INSERT INTO founders (id, name, role, bio, display_order) VALUES
  ('matthew', 'Matthew Heng', 'Co-founder', '', 0),
  ('felix', 'Felix Yin', 'Co-founder', '', 1),
  ('brady', 'Brady Chen', 'Co-founder', '', 2),
  ('oscar', 'Oscar Gao', 'Co-founder', '', 3)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE: Founder Photos
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('founder-photos', 'founder-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access to Founder Photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'founder-photos');

CREATE POLICY "Admins can upload founder photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'founder-photos' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update founder photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'founder-photos' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete founder photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'founder-photos' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- CONTENT MANAGEMENT SYSTEM
-- Tables for database-driven course content (modules, lessons, videos, etc.)
-- ============================================================================

-- Content status enum
DO $$ BEGIN
  CREATE TYPE content_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- MODULES TABLE
-- Course modules (e.g., "How Rockets Fly", "Orbital Mechanics")
-- ============================================================================
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🚀',
  order_index INTEGER NOT NULL DEFAULT 0,
  status content_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published modules" ON modules
  FOR SELECT USING (status = 'published');

CREATE POLICY "Admins can view all modules" ON modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert modules" ON modules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update modules" ON modules
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete modules" ON modules
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_modules_order ON modules(order_index);
CREATE INDEX IF NOT EXISTS idx_modules_status ON modules(status);

-- ============================================================================
-- VIDEO_COMPOSITIONS TABLE (must come before lessons and content_blocks)
-- Remotion video compositions (code stored in database)
-- ============================================================================
CREATE TABLE IF NOT EXISTS video_compositions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  code TEXT NOT NULL,
  width INTEGER NOT NULL DEFAULT 1280,
  height INTEGER NOT NULL DEFAULT 720,
  fps INTEGER NOT NULL DEFAULT 30,
  duration_frames INTEGER NOT NULL DEFAULT 300,
  status content_status NOT NULL DEFAULT 'draft',
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

ALTER TABLE video_compositions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published video compositions" ON video_compositions
  FOR SELECT USING (status = 'published');

CREATE POLICY "Admins can view all video compositions" ON video_compositions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert video compositions" ON video_compositions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update video compositions" ON video_compositions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete video compositions" ON video_compositions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_video_compositions_status ON video_compositions(status);

-- ============================================================================
-- LESSONS TABLE
-- Individual lessons within modules
-- ============================================================================
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  estimated_minutes INTEGER DEFAULT 10,
  is_quiz BOOLEAN DEFAULT FALSE,
  status content_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE(module_id, slug)
);

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published lessons" ON lessons
  FOR SELECT USING (
    status = 'published' AND
    EXISTS (
      SELECT 1 FROM modules
      WHERE modules.id = lessons.module_id
      AND modules.status = 'published'
    )
  );

CREATE POLICY "Admins can view all lessons" ON lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert lessons" ON lessons
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update lessons" ON lessons
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete lessons" ON lessons
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON lessons(module_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_status ON lessons(status);

-- ============================================================================
-- CONTENT_BLOCKS TABLE
-- Individual content blocks within lessons (text, video, equation, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'heading', 'subheading', 'equation', 'video', 'callout', 'list', 'image', 'diagram', 'worked-example', 'practice-problem')),
  content TEXT NOT NULL DEFAULT '',
  items JSONB,
  steps JSONB,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  reveal_mode TEXT CHECK (reveal_mode IN ('click', 'input', 'hints')),
  answer TEXT,
  hints JSONB,
  input_placeholder TEXT,
  video_composition_id UUID REFERENCES video_compositions(id) ON DELETE SET NULL,
  image_url TEXT,
  image_alt TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE content_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view content blocks of published lessons" ON content_blocks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons
      JOIN modules ON modules.id = lessons.module_id
      WHERE lessons.id = content_blocks.lesson_id
      AND lessons.status = 'published'
      AND modules.status = 'published'
    )
  );

CREATE POLICY "Admins can view all content blocks" ON content_blocks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert content blocks" ON content_blocks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update content blocks" ON content_blocks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete content blocks" ON content_blocks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_content_blocks_lesson ON content_blocks(lesson_id);
CREATE INDEX IF NOT EXISTS idx_content_blocks_order ON content_blocks(lesson_id, order_index);

-- ============================================================================
-- QUIZ_QUESTIONS TABLE
-- Quiz questions for lessons
-- ============================================================================
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple-choice', 'true-false', 'free-response')),
  options JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  hint TEXT,
  difficulty TEXT CHECK (difficulty IN ('recall', 'understanding', 'calculation', 'analysis')),
  topic_tags JSONB,
  is_auto_graded BOOLEAN DEFAULT TRUE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view quiz questions of published lessons" ON quiz_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons
      JOIN modules ON modules.id = lessons.module_id
      WHERE lessons.id = quiz_questions.lesson_id
      AND lessons.status = 'published'
      AND modules.status = 'published'
    )
  );

CREATE POLICY "Admins can view all quiz questions" ON quiz_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert quiz questions" ON quiz_questions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update quiz questions" ON quiz_questions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete quiz questions" ON quiz_questions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_quiz_questions_lesson ON quiz_questions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_order ON quiz_questions(lesson_id, order_index);

-- ============================================================================
-- CONTENT_VERSIONS TABLE
-- Version history for all content entities
-- ============================================================================
CREATE TABLE IF NOT EXISTS content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('module', 'lesson', 'content_block', 'quiz_question', 'video_composition')),
  entity_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  data JSONB NOT NULL,
  change_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE(entity_type, entity_id, version_number)
);

ALTER TABLE content_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view content versions" ON content_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert content versions" ON content_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_content_versions_entity ON content_versions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_content_versions_created ON content_versions(created_at DESC);

-- Triggers for content management tables
CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON modules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON lessons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_blocks_updated_at
  BEFORE UPDATE ON content_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_questions_updated_at
  BEFORE UPDATE ON quiz_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_compositions_updated_at
  BEFORE UPDATE ON video_compositions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- CONTENT MANAGEMENT HELPER FUNCTIONS
-- ============================================================================

-- Function to create a version snapshot
CREATE OR REPLACE FUNCTION create_content_version(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_data JSONB,
  p_change_summary TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_version_number INTEGER;
  v_version_id UUID;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_version_number
  FROM content_versions
  WHERE entity_type = p_entity_type AND entity_id = p_entity_id;

  INSERT INTO content_versions (entity_type, entity_id, version_number, data, change_summary, created_by)
  VALUES (p_entity_type, p_entity_id, v_version_number, p_data, p_change_summary, p_user_id)
  RETURNING id INTO v_version_id;

  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get full course structure
CREATE OR REPLACE FUNCTION get_course_structure(p_include_drafts BOOLEAN DEFAULT FALSE)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'slug', m.slug,
        'title', m.title,
        'description', m.description,
        'icon', m.icon,
        'order_index', m.order_index,
        'status', m.status,
        'lessons', (
          SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
              'id', l.id,
              'slug', l.slug,
              'title', l.title,
              'description', l.description,
              'order_index', l.order_index,
              'estimated_minutes', l.estimated_minutes,
              'is_quiz', l.is_quiz,
              'status', l.status
            ) ORDER BY l.order_index
          ), '[]'::jsonb)
          FROM lessons l
          WHERE l.module_id = m.id
          AND (p_include_drafts OR l.status = 'published')
        )
      ) ORDER BY m.order_index
    ), '[]'::jsonb)
    FROM modules m
    WHERE p_include_drafts OR m.status = 'published'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STORAGE BUCKET FOR LESSON CONTENT
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-content', 'lesson-content', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access to Lesson Content" ON storage.objects
  FOR SELECT USING (bucket_id = 'lesson-content');

CREATE POLICY "Admins can upload lesson content" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'lesson-content' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update lesson content" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'lesson-content' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete lesson content" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'lesson-content' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );
