-- Migration: Fix Function Search Path Security Issues
-- Date: 2026-01-30
-- Description: Add SET search_path = '' to all functions to prevent search path injection attacks
-- Also moves pg_trgm extension from public to extensions schema
--
-- This fixes 13 security warnings from the Supabase security advisor:
-- - 12 functions with mutable search_path
-- - 1 extension installed in public schema

-- ============================================================================
-- 1. MOVE pg_trgm EXTENSION TO EXTENSIONS SCHEMA
-- ============================================================================
-- Note: This may fail if extensions schema doesn't exist or extension is in use
-- In that case, you may need to handle this manually in the Supabase dashboard

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant usage to authenticated and anon roles
GRANT USAGE ON SCHEMA extensions TO authenticated, anon;

-- Move extension (this recreates it in the new schema)
DROP EXTENSION IF EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

-- ============================================================================
-- 2. FIX FUNCTION SEARCH PATHS
-- All functions are recreated with SET search_path = '' for security
-- ============================================================================

-- 2.1 update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 2.2 handle_new_user (SECURITY DEFINER - extra important to fix)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

-- 2.3 get_course_progress (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_course_progress(user_uuid UUID)
RETURNS TABLE (
  lessons_completed BIGINT,
  modules_with_progress BIGINT,
  total_quiz_score BIGINT,
  total_quiz_questions BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE completed = true)::BIGINT as lessons_completed,
    COUNT(DISTINCT module_id) FILTER (WHERE completed = true)::BIGINT as modules_with_progress,
    COALESCE(SUM(quiz_score) FILTER (WHERE quiz_score IS NOT NULL), 0)::BIGINT as total_quiz_score,
    COALESCE(SUM(quiz_total) FILTER (WHERE quiz_total IS NOT NULL), 0)::BIGINT as total_quiz_questions
  FROM public.user_lesson_progress
  WHERE user_id = user_uuid;
END;
$$;

-- 2.4 get_leaderboard (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_leaderboard(limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  rank BIGINT,
  display_name TEXT,
  total_score INTEGER,
  lessons_completed INTEGER,
  achievements_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY le.total_score DESC)::BIGINT as rank,
    le.display_name,
    le.total_score,
    le.lessons_completed,
    le.achievements_count
  FROM public.leaderboard_entries le
  WHERE le.total_score > 0
  ORDER BY le.total_score DESC
  LIMIT limit_count;
END;
$$;

-- 2.5 increment_ai_questions (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.increment_ai_questions(user_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles
  SET ai_questions_asked = COALESCE(ai_questions_asked, 0) + 1
  WHERE id = user_uuid;
END;
$$;

-- 2.6 increment_flashcard_usage (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.increment_flashcard_usage(card_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.ai_generated_flashcards
  SET usage_count = usage_count + 1
  WHERE flashcard_id = card_id;
END;
$$;

-- 2.7 get_flashcard_stats (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_flashcard_stats(
  user_uuid UUID,
  mod_id TEXT
)
RETURNS TABLE (
  total_cards BIGINT,
  known_cards BIGINT,
  due_for_review BIGINT,
  ai_generated_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(DISTINCT flashcard_id)
     FROM public.user_flashcard_progress
     WHERE user_id = user_uuid AND module_id = mod_id)::BIGINT as total_cards,

    (SELECT COUNT(*)
     FROM public.user_flashcard_knowledge
     WHERE user_id = user_uuid AND module_id = mod_id)::BIGINT as known_cards,

    (SELECT COUNT(*)
     FROM public.user_flashcard_progress
     WHERE user_id = user_uuid
       AND module_id = mod_id
       AND next_review_at <= NOW())::BIGINT as due_for_review,

    (SELECT COUNT(*)
     FROM public.user_flashcard_progress
     WHERE user_id = user_uuid
       AND module_id = mod_id
       AND is_ai_generated = true)::BIGINT as ai_generated_count;
END;
$$;

-- 2.8 find_similar_flashcards (uses pg_trgm - update to use extensions schema)
CREATE OR REPLACE FUNCTION public.find_similar_flashcards(
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
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cf.id,
    cf.front,
    cf.back,
    cf.status,
    extensions.word_similarity(p_front, cf.front) AS similarity
  FROM public.community_flashcards cf
  WHERE cf.module_id = p_module_id
    AND cf.status != 'rejected'
  ORDER BY similarity DESC
  LIMIT p_limit;
END;
$$;

-- 2.9 create_content_version (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.create_content_version(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_data JSONB,
  p_change_summary TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_version_number INTEGER;
  v_version_id UUID;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_version_number
  FROM public.content_versions
  WHERE entity_type = p_entity_type AND entity_id = p_entity_id;

  INSERT INTO public.content_versions (entity_type, entity_id, version_number, data, change_summary, created_by)
  VALUES (p_entity_type, p_entity_id, v_version_number, p_data, p_change_summary, p_user_id)
  RETURNING id INTO v_version_id;

  RETURN v_version_id;
END;
$$;

-- 2.10 get_course_structure (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_course_structure(p_include_drafts BOOLEAN DEFAULT FALSE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
          FROM public.lessons l
          WHERE l.module_id = m.id
          AND (p_include_drafts OR l.status = 'published')
        )
      ) ORDER BY m.order_index
    ), '[]'::jsonb)
    FROM public.modules m
    WHERE p_include_drafts OR m.status = 'published'
  );
END;
$$;

-- 2.11 update_conversation_on_message (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.ai_chat_conversations
  SET
    message_count = (SELECT COUNT(*) FROM public.ai_chat_messages WHERE conversation_id = NEW.conversation_id),
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- 2.12 auto_title_conversation (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.auto_title_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.role = 'user' THEN
    UPDATE public.ai_chat_conversations
    SET title = LEFT(NEW.content, 50)
    WHERE id = NEW.conversation_id
      AND title = 'New Conversation'
      AND message_count = 0;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. ENSURE GRANT PERMISSIONS ARE MAINTAINED
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.find_similar_flashcards TO authenticated;

-- ============================================================================
-- VERIFICATION COMMENT
-- After running this migration, run the security advisor again to verify
-- all function_search_path_mutable warnings are resolved
-- ============================================================================
