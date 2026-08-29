-- Migration: Add Generated Quizzes
-- Date: 2026-01-26
-- Description: Creates tables for generated quiz questions that need admin review

-- ============================================================================
-- AI_GENERATED_QUIZZES TABLE
-- Stores generated quiz questions pending admin review
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_generated_quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id TEXT NOT NULL,
  lesson_id TEXT,
  questions JSONB NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  generated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT
);

ALTER TABLE ai_generated_quizzes ENABLE ROW LEVEL SECURITY;

-- Policies for AI generated quizzes
-- Anyone authenticated can view pending quizzes (for now)
-- Only admins can update/delete (handled at app level via is_admin check)

DROP POLICY IF EXISTS "Authenticated users can view all quizzes" ON ai_generated_quizzes;
CREATE POLICY "Authenticated users can view all quizzes" ON ai_generated_quizzes
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert quizzes" ON ai_generated_quizzes;
CREATE POLICY "Authenticated users can insert quizzes" ON ai_generated_quizzes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can update quizzes" ON ai_generated_quizzes;
CREATE POLICY "Admins can update quizzes" ON ai_generated_quizzes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can delete quizzes" ON ai_generated_quizzes;
CREATE POLICY "Admins can delete quizzes" ON ai_generated_quizzes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ai_quizzes_status ON ai_generated_quizzes(status);
CREATE INDEX IF NOT EXISTS idx_ai_quizzes_module ON ai_generated_quizzes(module_id);
CREATE INDEX IF NOT EXISTS idx_ai_quizzes_generated_at ON ai_generated_quizzes(generated_at DESC);

-- ============================================================================
-- FUNCTIONS FOR AI QUIZ MANAGEMENT
-- ============================================================================

-- Function to approve a quiz
CREATE OR REPLACE FUNCTION approve_ai_quiz(
  quiz_id UUID,
  reviewer_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE ai_generated_quizzes
  SET
    status = 'approved',
    reviewed_by = reviewer_id,
    reviewed_at = NOW()
  WHERE id = quiz_id
  AND status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject a quiz
CREATE OR REPLACE FUNCTION reject_ai_quiz(
  quiz_id UUID,
  reviewer_id UUID,
  reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE ai_generated_quizzes
  SET
    status = 'rejected',
    reviewed_by = reviewer_id,
    reviewed_at = NOW(),
    rejection_reason = reason
  WHERE id = quiz_id
  AND status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to bulk approve quizzes
CREATE OR REPLACE FUNCTION bulk_approve_ai_quizzes(
  quiz_ids UUID[],
  reviewer_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE ai_generated_quizzes
  SET
    status = 'approved',
    reviewed_by = reviewer_id,
    reviewed_at = NOW()
  WHERE id = ANY(quiz_ids)
  AND status = 'pending';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to bulk reject quizzes
CREATE OR REPLACE FUNCTION bulk_reject_ai_quizzes(
  quiz_ids UUID[],
  reviewer_id UUID,
  reason TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE ai_generated_quizzes
  SET
    status = 'rejected',
    reviewed_by = reviewer_id,
    reviewed_at = NOW(),
    rejection_reason = reason
  WHERE id = ANY(quiz_ids)
  AND status = 'pending';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- To rollback, run the following:
-- DROP FUNCTION IF EXISTS bulk_reject_ai_quizzes(UUID[], UUID, TEXT);
-- DROP FUNCTION IF EXISTS bulk_approve_ai_quizzes(UUID[], UUID);
-- DROP FUNCTION IF EXISTS reject_ai_quiz(UUID, UUID, TEXT);
-- DROP FUNCTION IF EXISTS approve_ai_quiz(UUID, UUID);
-- DROP TABLE IF EXISTS ai_generated_quizzes CASCADE;
