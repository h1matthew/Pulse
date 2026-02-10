-- Migration: Consolidate Multiple Permissive Policies
-- Date: 2026-01-30
-- Description: Merge overlapping SELECT policies into single policies
--              Multiple permissive policies are suboptimal because each is evaluated for every query
--
-- Affected tables:
-- - modules (Anyone can view published + Admins can view all)
-- - lessons (Anyone can view published + Admins can view all)
-- - content_blocks (Anyone can view published + Admins can view all)
-- - quiz_questions (Anyone can view published + Admins can view all)
-- - video_compositions (Anyone can view published + Admins can view all)
-- - community_flashcards (Anyone can view approved + Admins can view all)
-- - leaderboard_entries (Anyone can view + Users can manage own)

-- ============================================================================
-- 1. MODULES TABLE - Consolidate SELECT policies
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view published modules" ON public.modules;
DROP POLICY IF EXISTS "Admins can view all modules" ON public.modules;

CREATE POLICY "Select modules" ON public.modules
  FOR SELECT USING (
    status = 'published'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- 2. LESSONS TABLE - Consolidate SELECT policies
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view published lessons" ON public.lessons;
DROP POLICY IF EXISTS "Admins can view all lessons" ON public.lessons;

CREATE POLICY "Select lessons" ON public.lessons
  FOR SELECT USING (
    status = 'published'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- 3. CONTENT_BLOCKS TABLE - Consolidate SELECT policies
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view content blocks of published lessons" ON public.content_blocks;
DROP POLICY IF EXISTS "Admins can view all content blocks" ON public.content_blocks;

CREATE POLICY "Select content blocks" ON public.content_blocks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.lessons
      WHERE lessons.id = content_blocks.lesson_id
      AND lessons.status = 'published'
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- 4. QUIZ_QUESTIONS TABLE - Consolidate SELECT policies
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view quiz questions of published lessons" ON public.quiz_questions;
DROP POLICY IF EXISTS "Admins can view all quiz questions" ON public.quiz_questions;

CREATE POLICY "Select quiz questions" ON public.quiz_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.lessons
      WHERE lessons.id = quiz_questions.lesson_id
      AND lessons.status = 'published'
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- 5. VIDEO_COMPOSITIONS TABLE - Consolidate SELECT policies
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view published video compositions" ON public.video_compositions;
DROP POLICY IF EXISTS "Admins can view all video compositions" ON public.video_compositions;

CREATE POLICY "Select video compositions" ON public.video_compositions
  FOR SELECT USING (
    status = 'published'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- 6. COMMUNITY_FLASHCARDS TABLE - Consolidate SELECT policies
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view approved flashcards" ON public.community_flashcards;
DROP POLICY IF EXISTS "Admins can view all flashcards" ON public.community_flashcards;

CREATE POLICY "Select community flashcards" ON public.community_flashcards
  FOR SELECT USING (
    status = 'approved'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- 7. LEADERBOARD_ENTRIES TABLE - Consolidate SELECT policies
-- The "Users can manage own leaderboard entry" is FOR ALL, which includes SELECT
-- We need to keep the public SELECT and convert the user policy to specific actions
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view leaderboard" ON public.leaderboard_entries;
DROP POLICY IF EXISTS "Users can manage own leaderboard entry" ON public.leaderboard_entries;

-- Single SELECT policy - anyone can view all leaderboard entries
CREATE POLICY "Select leaderboard entries" ON public.leaderboard_entries
  FOR SELECT USING (true);

-- Separate policies for INSERT, UPDATE, DELETE (user's own entries only)
CREATE POLICY "Users can insert own leaderboard entry" ON public.leaderboard_entries
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own leaderboard entry" ON public.leaderboard_entries
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own leaderboard entry" ON public.leaderboard_entries
  FOR DELETE USING ((select auth.uid()) = user_id);

-- ============================================================================
-- VERIFICATION
-- After running this migration, the performance advisor should show no more
-- multiple_permissive_policies warnings
-- ============================================================================
