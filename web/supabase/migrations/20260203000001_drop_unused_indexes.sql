-- Migration: Drop unused indexes identified by Supabase performance advisor
-- Created: 2026-02-03
-- Description: Remove 22 unused indexes to reduce storage and maintenance overhead

DROP INDEX IF EXISTS idx_bookmarks_user_lesson;
DROP INDEX IF EXISTS idx_ai_flashcards_module;
DROP INDEX IF EXISTS idx_ai_flashcards_front_hash;
DROP INDEX IF EXISTS idx_ai_flashcards_created_at;
DROP INDEX IF EXISTS idx_flashcard_knowledge_user;
DROP INDEX IF EXISTS idx_grading_history_created_at;
DROP INDEX IF EXISTS idx_community_flashcards_status;
DROP INDEX IF EXISTS idx_community_flashcards_module;
DROP INDEX IF EXISTS idx_community_flashcards_created;
DROP INDEX IF EXISTS idx_modules_status;
DROP INDEX IF EXISTS idx_video_compositions_status;
DROP INDEX IF EXISTS idx_lessons_module;
DROP INDEX IF EXISTS idx_lessons_status;
DROP INDEX IF EXISTS idx_quiz_questions_lesson;
DROP INDEX IF EXISTS idx_content_versions_entity;
DROP INDEX IF EXISTS idx_conversations_lesson;
DROP INDEX IF EXISTS idx_conversations_updated;
DROP INDEX IF EXISTS idx_messages_created;
DROP INDEX IF EXISTS idx_content_blocks_video_composition;
DROP INDEX IF EXISTS idx_lessons_created_by;
DROP INDEX IF EXISTS idx_modules_created_by;
DROP INDEX IF EXISTS idx_video_compositions_created_by;
