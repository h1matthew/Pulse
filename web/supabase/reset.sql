-- Rocket Space - Database Reset Script
-- WARNING: This will DROP all tables and data!
-- Use this for development/testing purposes only

-- ============================================================================
-- DROP ALL TRIGGERS
-- ============================================================================
DO $$
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_bookmarks_updated_at ON user_bookmarks;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_leaderboard_updated_at ON leaderboard_entries;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_conversation_on_message_trigger ON ai_chat_messages;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS auto_title_conversation_trigger ON ai_chat_messages;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_founders_updated_at ON founders;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Content Management triggers
DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_modules_updated_at ON modules;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_lessons_updated_at ON lessons;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_content_blocks_updated_at ON content_blocks;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_quiz_questions_updated_at ON quiz_questions;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_video_compositions_updated_at ON video_compositions;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- ============================================================================
-- DROP ALL FUNCTIONS
-- ============================================================================
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS get_course_progress(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_leaderboard(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS increment_ai_questions(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_conversation_on_message() CASCADE;
DROP FUNCTION IF EXISTS auto_title_conversation() CASCADE;
DROP FUNCTION IF EXISTS increment_flashcard_usage(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_flashcard_stats(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS find_similar_flashcards(TEXT, TEXT, INT) CASCADE;
DROP FUNCTION IF EXISTS create_content_version(TEXT, UUID, JSONB, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_course_structure(BOOLEAN) CASCADE;

-- Drop content_status type
DROP TYPE IF EXISTS content_status CASCADE;

-- ============================================================================
-- DROP ALL TABLES (in reverse order of dependencies, CASCADE handles policies)
-- ============================================================================
-- Content Management tables (drop first due to dependencies)
DROP TABLE IF EXISTS content_versions CASCADE;
DROP TABLE IF EXISTS quiz_questions CASCADE;
DROP TABLE IF EXISTS content_blocks CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS video_compositions CASCADE;
DROP TABLE IF EXISTS modules CASCADE;
DROP TABLE IF EXISTS ai_chat_messages CASCADE;
DROP TABLE IF EXISTS ai_chat_conversations CASCADE;
DROP TABLE IF EXISTS user_simulator_stats CASCADE;
DROP TABLE IF EXISTS user_streaks CASCADE;
DROP TABLE IF EXISTS leaderboard_entries CASCADE;
DROP TABLE IF EXISTS user_bookmarks CASCADE;
DROP TABLE IF EXISTS user_flashcard_progress CASCADE;
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS user_lesson_progress CASCADE;
DROP TABLE IF EXISTS ai_grading_history CASCADE;
DROP TABLE IF EXISTS user_flashcard_knowledge CASCADE;
DROP TABLE IF EXISTS ai_generated_flashcards CASCADE;
DROP TABLE IF EXISTS community_flashcards CASCADE;
DROP TABLE IF EXISTS founders CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ============================================================================
-- DROP STORAGE POLICIES
-- ============================================================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public Access to Lesson Images" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload lesson images" ON storage.objects;
  DROP POLICY IF EXISTS "Public Access to Founder Photos" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can upload founder photos" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can update founder photos" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can delete founder photos" ON storage.objects;
  -- Lesson content bucket policies
  DROP POLICY IF EXISTS "Public Access to Lesson Content" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can upload lesson content" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can update lesson content" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can delete lesson content" ON storage.objects;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- ============================================================================
-- CLEAN UP STORAGE BUCKETS
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects') THEN
    DELETE FROM storage.objects WHERE bucket_id = 'lesson-images';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'buckets') THEN
    DELETE FROM storage.buckets WHERE id = 'lesson-images';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects') THEN
    DELETE FROM storage.objects WHERE bucket_id = 'founder-photos';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'buckets') THEN
    DELETE FROM storage.buckets WHERE id = 'founder-photos';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects') THEN
    DELETE FROM storage.objects WHERE bucket_id = 'lesson-content';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'buckets') THEN
    DELETE FROM storage.buckets WHERE id = 'lesson-content';
  END IF;
END $$;

-- Reset complete
SELECT 'Database reset complete. All tables, functions, and data have been dropped.' as status;
