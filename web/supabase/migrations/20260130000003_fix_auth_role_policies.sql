-- Migration: Fix Remaining auth.role() Policies
-- Date: 2026-01-30
-- Description: Update policies using auth.role() to use (select auth.role())
--              This prevents re-evaluation of auth functions for each row
--
-- Fixes 2 remaining auth_rls_initplan performance warnings:
-- - ai_generated_flashcards: "Authenticated users can create AI flashcards"
-- - community_flashcards: "Authenticated users can submit flashcards"

-- ============================================================================
-- 1. AI_GENERATED_FLASHCARDS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can create AI flashcards" ON public.ai_generated_flashcards;
CREATE POLICY "Authenticated users can create AI flashcards" ON public.ai_generated_flashcards
  FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

-- ============================================================================
-- 2. COMMUNITY_FLASHCARDS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can submit flashcards" ON public.community_flashcards;
CREATE POLICY "Authenticated users can submit flashcards" ON public.community_flashcards
  FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

-- ============================================================================
-- 3. AI_GENERATED_QUIZZES TABLE (if exists)
-- Also fix any auth.role() usage in this table
-- ============================================================================
DO $$
BEGIN
  -- Only run if the table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_generated_quizzes' AND table_schema = 'public') THEN
    -- Drop and recreate policies with optimized pattern
    DROP POLICY IF EXISTS "Authenticated users can view quizzes" ON public.ai_generated_quizzes;
    DROP POLICY IF EXISTS "Authenticated users can create quizzes" ON public.ai_generated_quizzes;

    EXECUTE 'CREATE POLICY "Authenticated users can view quizzes" ON public.ai_generated_quizzes
      FOR SELECT USING ((select auth.role()) = ''authenticated'')';

    EXECUTE 'CREATE POLICY "Authenticated users can create quizzes" ON public.ai_generated_quizzes
      FOR INSERT WITH CHECK ((select auth.role()) = ''authenticated'')';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- After running this migration, the performance advisor should show no more
-- auth_rls_initplan warnings for auth.role() usage
-- ============================================================================
