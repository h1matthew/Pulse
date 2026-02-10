-- ============================================================================
-- AI-POWERED FLASHCARD SYSTEM MIGRATION
-- Adds support for AI-generated flashcards, intelligent grading, and knowledge tracking
-- ============================================================================

-- ============================================================================
-- AI_GENERATED_FLASHCARDS TABLE
-- Shared repository of AI-generated flashcards across all users
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_generated_flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flashcard_id TEXT NOT NULL UNIQUE,  -- Format: "ai-{hash}-{timestamp}"
  module_id TEXT NOT NULL,
  lesson_ids TEXT[] NOT NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  hint TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_by_user_id UUID REFERENCES profiles(id),
  usage_count INTEGER DEFAULT 0,  -- Track popularity
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_ai_flashcards_module ON ai_generated_flashcards(module_id);
CREATE INDEX idx_ai_flashcards_front_hash ON ai_generated_flashcards(md5(lower(front)));
CREATE INDEX idx_ai_flashcards_created_at ON ai_generated_flashcards(created_at DESC);

-- Enable Row Level Security
ALTER TABLE ai_generated_flashcards ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Public read, authenticated users can insert
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

-- Indexes
CREATE INDEX idx_flashcard_knowledge_user ON user_flashcard_knowledge(user_id);
CREATE INDEX idx_flashcard_knowledge_module ON user_flashcard_knowledge(user_id, module_id);

-- Enable Row Level Security
ALTER TABLE user_flashcard_knowledge ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users manage their own knowledge markers
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
  was_correct BOOLEAN NOT NULL,  -- TRUE if score >= 0.85
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_grading_history_user ON ai_grading_history(user_id, flashcard_id);
CREATE INDEX idx_grading_history_created_at ON ai_grading_history(created_at DESC);

-- Enable Row Level Security
ALTER TABLE ai_grading_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users manage their own grading history
CREATE POLICY "Users can view own grading history" ON ai_grading_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own grading history" ON ai_grading_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- MODIFY USER_FLASHCARD_PROGRESS TABLE
-- Add AI support columns
-- ============================================================================
ALTER TABLE user_flashcard_progress
ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_ai_score REAL;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to increment usage count for AI-generated flashcards
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
