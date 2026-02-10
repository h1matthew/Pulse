-- Migration: Add performance indexes
-- Created: 2026-02-03
-- Description: Add composite indexes to improve query performance

-- Index for user_lesson_progress queries filtering by completion status
-- Used in dashboard stats, leaderboard sync, and progress tracking
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_user_completed
  ON user_lesson_progress(user_id, completed);

-- Index for content_blocks queries filtering by type
-- Used in video composition usage queries and content rendering
CREATE INDEX IF NOT EXISTS idx_content_blocks_lesson_type
  ON content_blocks(lesson_id, type);

-- Index for quiz_questions queries (already has idx_quiz_questions_lesson, but adding for completeness)
-- Ensures efficient quiz question retrieval
CREATE INDEX IF NOT EXISTS idx_quiz_questions_lesson_order
  ON quiz_questions(lesson_id, order_index);

-- Index for modules slug lookup
-- Used in URL routing and module lookups by slug
CREATE INDEX IF NOT EXISTS idx_modules_slug
  ON modules(slug);

-- Index for lessons slug lookup within a module
-- Used in URL routing for lesson pages
CREATE INDEX IF NOT EXISTS idx_lessons_module_slug
  ON lessons(module_id, slug);

-- Index for video composition lookups by slug
-- Used when resolving video references in content
CREATE INDEX IF NOT EXISTS idx_video_compositions_slug
  ON video_compositions(slug);

-- Index for content versions queries
-- Improves version history lookup performance
CREATE INDEX IF NOT EXISTS idx_content_versions_entity_created
  ON content_versions(entity_type, entity_id, created_at DESC);

-- Index for flashcard progress due date queries
-- Used in spaced repetition scheduling
CREATE INDEX IF NOT EXISTS idx_flashcard_progress_due
  ON user_flashcard_progress(user_id, module_id, next_review_at)
  WHERE next_review_at <= NOW();

-- Index for AI grading history queries
-- Used in flashcard performance analytics
CREATE INDEX IF NOT EXISTS idx_grading_history_user_flashcard
  ON ai_grading_history(user_id, flashcard_id, created_at DESC);

-- Composite index for AI chat messages - conversation + time ordering
-- Optimizes fetching messages for a conversation in chronological order
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_conversation_created
  ON ai_chat_messages(conversation_id, created_at);

-- Index for leaderboard time-based queries
-- Used when fetching recent leaderboard updates
CREATE INDEX IF NOT EXISTS idx_leaderboard_updated_at
  ON leaderboard_entries(updated_at DESC);
