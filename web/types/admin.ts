// Admin content management types

export type ContentStatus = 'draft' | 'published' | 'archived'

export interface DbModule {
  id: string
  slug: string
  title: string
  description: string | null
  icon: string
  order_index: number
  status: ContentStatus
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface DbLesson {
  id: string
  module_id: string
  slug: string
  title: string
  description: string | null
  order_index: number
  estimated_minutes: number
  is_quiz: boolean
  status: ContentStatus
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface DbContentBlock {
  id: string
  lesson_id: string
  type: ContentBlockType
  content: string
  items: string[] | null
  steps: WorkedExampleStep[] | null
  difficulty: 'beginner' | 'intermediate' | 'advanced' | null
  reveal_mode: 'click' | 'input' | 'hints' | null
  answer: string | null
  hints: string[] | null
  input_placeholder: string | null
  video_composition_id: string | null
  image_url: string | null
  image_alt: string | null
  order_index: number
  created_at: string
  updated_at: string
}

export type ContentBlockType =
  | 'text'
  | 'heading'
  | 'subheading'
  | 'equation'
  | 'video'
  | 'callout'
  | 'list'
  | 'image'
  | 'diagram'
  | 'worked-example'
  | 'practice-problem'

export interface WorkedExampleStep {
  instruction: string
  hint?: string
  answer: string
}

export interface DbQuizQuestion {
  id: string
  lesson_id: string
  question_text: string
  question_type: 'multiple-choice' | 'true-false' | 'free-response'
  options: string[] | null
  correct_answer: string
  explanation: string | null
  hint: string | null
  difficulty: 'recall' | 'understanding' | 'calculation' | 'analysis' | null
  topic_tags: string[] | null
  is_auto_graded: boolean
  order_index: number
  created_at: string
  updated_at: string
}

export interface DbVideoComposition {
  id: string
  name: string
  slug: string
  description: string | null
  code: string
  width: number
  height: number
  fps: number
  duration_frames: number
  status: ContentStatus
  thumbnail_url: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface DbContentVersion {
  id: string
  entity_type: 'module' | 'lesson' | 'content_block' | 'quiz_question' | 'video_composition'
  entity_id: string
  version_number: number
  data: Record<string, unknown>
  change_summary: string | null
  created_at: string
  created_by: string | null
}

// Form types for creating/editing content
export interface ModuleFormData {
  slug: string
  title: string
  description: string
  icon: string
  order_index: number
  status: ContentStatus
}

export interface LessonFormData {
  slug: string
  title: string
  description: string
  order_index: number
  estimated_minutes: number
  is_quiz: boolean
  status: ContentStatus
}

export interface ContentBlockFormData {
  type: ContentBlockType
  content: string
  items?: string[]
  steps?: WorkedExampleStep[]
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  reveal_mode?: 'click' | 'input' | 'hints'
  answer?: string
  hints?: string[]
  input_placeholder?: string
  video_composition_id?: string
  image_url?: string
  image_alt?: string
  order_index: number
}

export interface QuizQuestionFormData {
  question_text: string
  question_type: 'multiple-choice' | 'true-false' | 'free-response'
  options?: string[]
  correct_answer: string
  explanation?: string
  hint?: string
  difficulty?: 'recall' | 'understanding' | 'calculation' | 'analysis'
  topic_tags?: string[]
  is_auto_graded: boolean
  order_index: number
}

export interface VideoCompositionFormData {
  name: string
  slug: string
  description: string
  code: string
  width: number
  height: number
  fps: number
  duration_frames: number
  status: ContentStatus
}

// Lesson with all related content
export interface LessonWithContent extends DbLesson {
  content_blocks: DbContentBlock[]
  quiz_questions: DbQuizQuestion[]
}

// Module with lessons
export interface ModuleWithLessons extends DbModule {
  lessons: DbLesson[]
}

// Course structure returned by get_course_structure function
export interface CourseStructure {
  id: string
  slug: string
  title: string
  description: string | null
  icon: string
  order_index: number
  status: ContentStatus
  lessons: {
    id: string
    slug: string
    title: string
    description: string | null
    order_index: number
    estimated_minutes: number
    is_quiz: boolean
    status: ContentStatus
  }[]
}
