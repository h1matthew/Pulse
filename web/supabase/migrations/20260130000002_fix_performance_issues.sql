-- Migration: Fix Performance Issues from Supabase Advisor
-- Date: 2026-01-30
-- Description:
--   1. Add missing indexes for foreign keys
--   2. Optimize RLS policies to use (select auth.uid()) instead of auth.uid()
--      This prevents re-evaluation of auth functions for each row

-- ============================================================================
-- 1. ADD MISSING INDEXES FOR FOREIGN KEYS
-- These improve JOIN and DELETE performance on referenced tables
-- ============================================================================

-- ai_generated_flashcards.created_by_user_id
CREATE INDEX IF NOT EXISTS idx_ai_generated_flashcards_created_by
  ON public.ai_generated_flashcards(created_by_user_id);

-- community_flashcards.reviewed_by
CREATE INDEX IF NOT EXISTS idx_community_flashcards_reviewed_by
  ON public.community_flashcards(reviewed_by);

-- community_flashcards.submitted_by
CREATE INDEX IF NOT EXISTS idx_community_flashcards_submitted_by
  ON public.community_flashcards(submitted_by);

-- content_blocks.video_composition_id
CREATE INDEX IF NOT EXISTS idx_content_blocks_video_composition
  ON public.content_blocks(video_composition_id);

-- content_versions.created_by
CREATE INDEX IF NOT EXISTS idx_content_versions_created_by
  ON public.content_versions(created_by);

-- lessons.created_by
CREATE INDEX IF NOT EXISTS idx_lessons_created_by
  ON public.lessons(created_by);

-- modules.created_by
CREATE INDEX IF NOT EXISTS idx_modules_created_by
  ON public.modules(created_by);

-- video_compositions.created_by
CREATE INDEX IF NOT EXISTS idx_video_compositions_created_by
  ON public.video_compositions(created_by);

-- ============================================================================
-- 2. OPTIMIZE RLS POLICIES - Use (select auth.uid()) pattern
-- This is a significant performance improvement at scale because:
-- - auth.uid() is re-evaluated for EVERY row in the table
-- - (select auth.uid()) is evaluated ONCE and cached for the query
-- ============================================================================

-- ----------------------------------------
-- PROFILES TABLE
-- ----------------------------------------
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING ((select auth.uid()) = id)
  WITH CHECK (
    (select auth.uid()) = id
    AND is_admin = (SELECT p.is_admin FROM public.profiles p WHERE p.id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- ----------------------------------------
-- USER_LESSON_PROGRESS TABLE
-- ----------------------------------------
DROP POLICY IF EXISTS "Users can view own lesson progress" ON public.user_lesson_progress;
CREATE POLICY "Users can view own lesson progress" ON public.user_lesson_progress
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own lesson progress" ON public.user_lesson_progress;
CREATE POLICY "Users can insert own lesson progress" ON public.user_lesson_progress
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own lesson progress" ON public.user_lesson_progress;
CREATE POLICY "Users can update own lesson progress" ON public.user_lesson_progress
  FOR UPDATE USING ((select auth.uid()) = user_id);

-- ----------------------------------------
-- USER_ACHIEVEMENTS TABLE
-- ----------------------------------------
DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;
CREATE POLICY "Users can view own achievements" ON public.user_achievements
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own achievements" ON public.user_achievements;
CREATE POLICY "Users can insert own achievements" ON public.user_achievements
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- ----------------------------------------
-- USER_FLASHCARD_PROGRESS TABLE
-- ----------------------------------------
DROP POLICY IF EXISTS "Users can manage own flashcard progress" ON public.user_flashcard_progress;
CREATE POLICY "Users can manage own flashcard progress" ON public.user_flashcard_progress
  FOR ALL USING ((select auth.uid()) = user_id);

-- ----------------------------------------
-- USER_BOOKMARKS TABLE
-- ----------------------------------------
DROP POLICY IF EXISTS "Users can manage own bookmarks" ON public.user_bookmarks;
CREATE POLICY "Users can manage own bookmarks" ON public.user_bookmarks
  FOR ALL USING ((select auth.uid()) = user_id);

-- ----------------------------------------
-- LEADERBOARD_ENTRIES TABLE
-- ----------------------------------------
DROP POLICY IF EXISTS "Users can manage own leaderboard entry" ON public.leaderboard_entries;
CREATE POLICY "Users can manage own leaderboard entry" ON public.leaderboard_entries
  FOR ALL USING ((select auth.uid()) = user_id);

-- ----------------------------------------
-- USER_STREAKS TABLE
-- ----------------------------------------
DROP POLICY IF EXISTS "Users can manage own streaks" ON public.user_streaks;
CREATE POLICY "Users can manage own streaks" ON public.user_streaks
  FOR ALL USING ((select auth.uid()) = user_id);

-- ----------------------------------------
-- USER_SIMULATOR_STATS TABLE
-- ----------------------------------------
DROP POLICY IF EXISTS "Users can manage own simulator stats" ON public.user_simulator_stats;
CREATE POLICY "Users can manage own simulator stats" ON public.user_simulator_stats
  FOR ALL USING ((select auth.uid()) = user_id);

-- ----------------------------------------
-- USER_FLASHCARD_KNOWLEDGE TABLE
-- ----------------------------------------
DROP POLICY IF EXISTS "Users can view own flashcard knowledge" ON public.user_flashcard_knowledge;
CREATE POLICY "Users can view own flashcard knowledge" ON public.user_flashcard_knowledge
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own flashcard knowledge" ON public.user_flashcard_knowledge;
CREATE POLICY "Users can insert own flashcard knowledge" ON public.user_flashcard_knowledge
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own flashcard knowledge" ON public.user_flashcard_knowledge;
CREATE POLICY "Users can delete own flashcard knowledge" ON public.user_flashcard_knowledge
  FOR DELETE USING ((select auth.uid()) = user_id);

-- ----------------------------------------
-- AI_GRADING_HISTORY TABLE
-- ----------------------------------------
DROP POLICY IF EXISTS "Users can view own grading history" ON public.ai_grading_history;
CREATE POLICY "Users can view own grading history" ON public.ai_grading_history
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own grading history" ON public.ai_grading_history;
CREATE POLICY "Users can insert own grading history" ON public.ai_grading_history
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- ----------------------------------------
-- AI_CHAT_CONVERSATIONS TABLE
-- ----------------------------------------
DROP POLICY IF EXISTS "Users manage own conversations" ON public.ai_chat_conversations;
CREATE POLICY "Users manage own conversations" ON public.ai_chat_conversations
  FOR ALL USING ((select auth.uid()) = user_id);

-- ----------------------------------------
-- AI_CHAT_MESSAGES TABLE
-- ----------------------------------------
DROP POLICY IF EXISTS "Users manage own messages" ON public.ai_chat_messages;
CREATE POLICY "Users manage own messages" ON public.ai_chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.ai_chat_conversations c
      WHERE c.id = conversation_id AND c.user_id = (select auth.uid())
    )
  );

-- ----------------------------------------
-- FOUNDERS TABLE (Admin policies)
-- ----------------------------------------
DROP POLICY IF EXISTS "Admins can update founders" ON public.founders;
CREATE POLICY "Admins can update founders" ON public.founders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

-- ----------------------------------------
-- MODULES TABLE (Admin policies)
-- ----------------------------------------
DROP POLICY IF EXISTS "Admins can view all modules" ON public.modules;
CREATE POLICY "Admins can view all modules" ON public.modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can insert modules" ON public.modules;
CREATE POLICY "Admins can insert modules" ON public.modules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can update modules" ON public.modules;
CREATE POLICY "Admins can update modules" ON public.modules
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can delete modules" ON public.modules;
CREATE POLICY "Admins can delete modules" ON public.modules
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

-- ----------------------------------------
-- VIDEO_COMPOSITIONS TABLE (Admin policies)
-- ----------------------------------------
DROP POLICY IF EXISTS "Admins can view all video compositions" ON public.video_compositions;
CREATE POLICY "Admins can view all video compositions" ON public.video_compositions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can insert video compositions" ON public.video_compositions;
CREATE POLICY "Admins can insert video compositions" ON public.video_compositions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can update video compositions" ON public.video_compositions;
CREATE POLICY "Admins can update video compositions" ON public.video_compositions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can delete video compositions" ON public.video_compositions;
CREATE POLICY "Admins can delete video compositions" ON public.video_compositions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

-- ----------------------------------------
-- LESSONS TABLE (Admin policies)
-- ----------------------------------------
DROP POLICY IF EXISTS "Admins can view all lessons" ON public.lessons;
CREATE POLICY "Admins can view all lessons" ON public.lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can insert lessons" ON public.lessons;
CREATE POLICY "Admins can insert lessons" ON public.lessons
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can update lessons" ON public.lessons;
CREATE POLICY "Admins can update lessons" ON public.lessons
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can delete lessons" ON public.lessons;
CREATE POLICY "Admins can delete lessons" ON public.lessons
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

-- ----------------------------------------
-- CONTENT_BLOCKS TABLE (Admin policies)
-- ----------------------------------------
DROP POLICY IF EXISTS "Admins can view all content blocks" ON public.content_blocks;
CREATE POLICY "Admins can view all content blocks" ON public.content_blocks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can insert content blocks" ON public.content_blocks;
CREATE POLICY "Admins can insert content blocks" ON public.content_blocks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can update content blocks" ON public.content_blocks;
CREATE POLICY "Admins can update content blocks" ON public.content_blocks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can delete content blocks" ON public.content_blocks;
CREATE POLICY "Admins can delete content blocks" ON public.content_blocks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

-- ----------------------------------------
-- QUIZ_QUESTIONS TABLE (Admin policies)
-- ----------------------------------------
DROP POLICY IF EXISTS "Admins can view all quiz questions" ON public.quiz_questions;
CREATE POLICY "Admins can view all quiz questions" ON public.quiz_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can insert quiz questions" ON public.quiz_questions;
CREATE POLICY "Admins can insert quiz questions" ON public.quiz_questions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can update quiz questions" ON public.quiz_questions;
CREATE POLICY "Admins can update quiz questions" ON public.quiz_questions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can delete quiz questions" ON public.quiz_questions;
CREATE POLICY "Admins can delete quiz questions" ON public.quiz_questions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

-- ----------------------------------------
-- CONTENT_VERSIONS TABLE (Admin policies)
-- ----------------------------------------
DROP POLICY IF EXISTS "Admins can view content versions" ON public.content_versions;
CREATE POLICY "Admins can view content versions" ON public.content_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can insert content versions" ON public.content_versions;
CREATE POLICY "Admins can insert content versions" ON public.content_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

-- ----------------------------------------
-- COMMUNITY_FLASHCARDS TABLE (Admin policies)
-- ----------------------------------------
DROP POLICY IF EXISTS "Admins can view all flashcards" ON public.community_flashcards;
CREATE POLICY "Admins can view all flashcards" ON public.community_flashcards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can update flashcards" ON public.community_flashcards;
CREATE POLICY "Admins can update flashcards" ON public.community_flashcards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can delete flashcards" ON public.community_flashcards;
CREATE POLICY "Admins can delete flashcards" ON public.community_flashcards
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- NOTE: Unused indexes are NOT being dropped
-- The app is new and these indexes may be useful as usage grows.
-- Dropping unused indexes could hurt future query performance.
-- ============================================================================

COMMENT ON INDEX idx_ai_generated_flashcards_created_by IS 'Foreign key index for created_by_user_id';
COMMENT ON INDEX idx_community_flashcards_reviewed_by IS 'Foreign key index for reviewed_by';
COMMENT ON INDEX idx_community_flashcards_submitted_by IS 'Foreign key index for submitted_by';
COMMENT ON INDEX idx_content_blocks_video_composition IS 'Foreign key index for video_composition_id';
COMMENT ON INDEX idx_content_versions_created_by IS 'Foreign key index for created_by';
COMMENT ON INDEX idx_lessons_created_by IS 'Foreign key index for created_by';
COMMENT ON INDEX idx_modules_created_by IS 'Foreign key index for created_by';
COMMENT ON INDEX idx_video_compositions_created_by IS 'Foreign key index for created_by';
