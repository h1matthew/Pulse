-- Content Management System Migration
-- This migration adds tables for managing course content through the admin panel

-- ============================================================================
-- CONTENT STATUS ENUM
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE content_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- MODULES TABLE
-- Course modules (e.g., "How Rockets Fly", "Orbital Mechanics")
-- ============================================================================
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🚀',
  order_index INTEGER NOT NULL DEFAULT 0,
  status content_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published modules" ON modules
  FOR SELECT USING (status = 'published');

CREATE POLICY "Admins can view all modules" ON modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert modules" ON modules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update modules" ON modules
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete modules" ON modules
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_modules_order ON modules(order_index);
CREATE INDEX IF NOT EXISTS idx_modules_status ON modules(status);

-- ============================================================================
-- LESSONS TABLE
-- Individual lessons within modules
-- ============================================================================
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  estimated_minutes INTEGER DEFAULT 10,
  is_quiz BOOLEAN DEFAULT FALSE,
  status content_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE(module_id, slug)
);

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published lessons" ON lessons
  FOR SELECT USING (
    status = 'published' AND
    EXISTS (
      SELECT 1 FROM modules
      WHERE modules.id = lessons.module_id
      AND modules.status = 'published'
    )
  );

CREATE POLICY "Admins can view all lessons" ON lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert lessons" ON lessons
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update lessons" ON lessons
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete lessons" ON lessons
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON lessons(module_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_status ON lessons(status);

-- ============================================================================
-- VIDEO_COMPOSITIONS TABLE (must come before content_blocks due to FK)
-- Remotion video compositions (code stored in database)
-- ============================================================================
CREATE TABLE IF NOT EXISTS video_compositions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  code TEXT NOT NULL, -- React/Remotion component code
  width INTEGER NOT NULL DEFAULT 1280,
  height INTEGER NOT NULL DEFAULT 720,
  fps INTEGER NOT NULL DEFAULT 30,
  duration_frames INTEGER NOT NULL DEFAULT 300,
  status content_status NOT NULL DEFAULT 'draft',
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

ALTER TABLE video_compositions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published video compositions" ON video_compositions
  FOR SELECT USING (status = 'published');

CREATE POLICY "Admins can view all video compositions" ON video_compositions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert video compositions" ON video_compositions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update video compositions" ON video_compositions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete video compositions" ON video_compositions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_video_compositions_status ON video_compositions(status);

-- ============================================================================
-- CONTENT_BLOCKS TABLE
-- Individual content blocks within lessons (text, video, equation, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'heading', 'subheading', 'equation', 'video', 'callout', 'list', 'image', 'diagram', 'worked-example', 'practice-problem')),
  content TEXT NOT NULL DEFAULT '',
  -- For list blocks
  items JSONB,
  -- For worked-example blocks
  steps JSONB,
  -- For practice-problem blocks
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  reveal_mode TEXT CHECK (reveal_mode IN ('click', 'input', 'hints')),
  answer TEXT,
  hints JSONB,
  input_placeholder TEXT,
  -- For video blocks
  video_composition_id UUID REFERENCES video_compositions(id) ON DELETE SET NULL,
  -- For image/diagram blocks
  image_url TEXT,
  image_alt TEXT,
  -- Order and metadata
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE content_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view content blocks of published lessons" ON content_blocks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons
      JOIN modules ON modules.id = lessons.module_id
      WHERE lessons.id = content_blocks.lesson_id
      AND lessons.status = 'published'
      AND modules.status = 'published'
    )
  );

CREATE POLICY "Admins can view all content blocks" ON content_blocks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert content blocks" ON content_blocks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update content blocks" ON content_blocks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete content blocks" ON content_blocks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_content_blocks_lesson ON content_blocks(lesson_id);
CREATE INDEX IF NOT EXISTS idx_content_blocks_order ON content_blocks(lesson_id, order_index);

-- ============================================================================
-- QUIZ_QUESTIONS TABLE
-- Quiz questions for lessons
-- ============================================================================
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple-choice', 'true-false', 'free-response')),
  options JSONB, -- Array of option strings for multiple-choice
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  hint TEXT,
  difficulty TEXT CHECK (difficulty IN ('recall', 'understanding', 'calculation', 'analysis')),
  topic_tags JSONB, -- Array of topic tags
  is_auto_graded BOOLEAN DEFAULT TRUE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view quiz questions of published lessons" ON quiz_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons
      JOIN modules ON modules.id = lessons.module_id
      WHERE lessons.id = quiz_questions.lesson_id
      AND lessons.status = 'published'
      AND modules.status = 'published'
    )
  );

CREATE POLICY "Admins can view all quiz questions" ON quiz_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert quiz questions" ON quiz_questions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update quiz questions" ON quiz_questions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete quiz questions" ON quiz_questions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_quiz_questions_lesson ON quiz_questions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_order ON quiz_questions(lesson_id, order_index);

-- ============================================================================
-- CONTENT_VERSIONS TABLE
-- Version history for all content entities
-- ============================================================================
CREATE TABLE IF NOT EXISTS content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('module', 'lesson', 'content_block', 'quiz_question', 'video_composition')),
  entity_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  data JSONB NOT NULL, -- Full snapshot of entity data
  change_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE(entity_type, entity_id, version_number)
);

ALTER TABLE content_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view content versions" ON content_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert content versions" ON content_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_content_versions_entity ON content_versions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_content_versions_created ON content_versions(created_at DESC);

-- ============================================================================
-- TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- ============================================================================
CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON modules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON lessons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_blocks_updated_at
  BEFORE UPDATE ON content_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_questions_updated_at
  BEFORE UPDATE ON quiz_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_compositions_updated_at
  BEFORE UPDATE ON video_compositions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to create a version snapshot before updating an entity
CREATE OR REPLACE FUNCTION create_content_version(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_data JSONB,
  p_change_summary TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_version_number INTEGER;
  v_version_id UUID;
BEGIN
  -- Get the next version number
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_version_number
  FROM content_versions
  WHERE entity_type = p_entity_type AND entity_id = p_entity_id;

  -- Insert the new version
  INSERT INTO content_versions (entity_type, entity_id, version_number, data, change_summary, created_by)
  VALUES (p_entity_type, p_entity_id, v_version_number, p_data, p_change_summary, p_user_id)
  RETURNING id INTO v_version_id;

  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get full course structure with modules and lessons
CREATE OR REPLACE FUNCTION get_course_structure(p_include_drafts BOOLEAN DEFAULT FALSE)
RETURNS JSONB AS $$
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
          FROM lessons l
          WHERE l.module_id = m.id
          AND (p_include_drafts OR l.status = 'published')
        )
      ) ORDER BY m.order_index
    ), '[]'::jsonb)
    FROM modules m
    WHERE p_include_drafts OR m.status = 'published'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STORAGE BUCKET FOR LESSON CONTENT
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-content', 'lesson-content', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access to Lesson Content" ON storage.objects
  FOR SELECT USING (bucket_id = 'lesson-content');

CREATE POLICY "Admins can upload lesson content" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'lesson-content' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update lesson content" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'lesson-content' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete lesson content" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'lesson-content' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );
