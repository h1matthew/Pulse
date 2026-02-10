-- Migration Template
-- Copy this file and rename it with timestamp: YYYYMMDDHHMMSS_description.sql
-- Example: 20260122153000_add_hints_to_questions.sql

-- ============================================================================
-- Migration: [Description]
-- Created: [Date]
-- Author: [Name]
-- ============================================================================

-- Add your migration SQL here

-- Example: Add a new column
-- ALTER TABLE questions ADD COLUMN hint TEXT;

-- Example: Create a new index
-- CREATE INDEX idx_questions_hint ON questions(hint) WHERE hint IS NOT NULL;

-- Example: Create a new table
-- CREATE TABLE hints (
--   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--   question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
--   hint_text TEXT NOT NULL,
--   hint_level INTEGER CHECK (hint_level BETWEEN 1 AND 3),
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- Example: Add RLS policies
-- ALTER TABLE hints ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Anyone can view hints" ON hints FOR SELECT USING (true);

-- Example: Create a function
-- CREATE OR REPLACE FUNCTION get_hints_for_question(question_uuid UUID)
-- RETURNS TABLE (hint_text TEXT, hint_level INTEGER) AS $$
-- BEGIN
--   RETURN QUERY
--   SELECT h.hint_text, h.hint_level
--   FROM hints h
--   WHERE h.question_id = question_uuid
--   ORDER BY h.hint_level;
-- END;
-- $$ LANGUAGE plpgsql;

-- ============================================================================
-- Rollback (Optional - document how to reverse this migration)
-- ============================================================================

-- ALTER TABLE questions DROP COLUMN hint;
-- DROP INDEX IF EXISTS idx_questions_hint;
-- DROP TABLE IF EXISTS hints CASCADE;
-- DROP FUNCTION IF EXISTS get_hints_for_question(UUID);
