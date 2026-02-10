export interface Flashcard {
  id: string
  moduleId: string
  front: string
  back: string
  hint?: string
  isAiGenerated?: boolean
  difficulty?: 'easy' | 'medium' | 'hard'
}

export type FlashcardRating = 'again' | 'hard' | 'good' | 'easy'

export type StudyMode = 'learn' | 'match' | 'test' | 'write'

export interface FlashcardProgress {
  flashcard_id: string
  user_id: string
  ease_factor: number
  interval_days: number
  repetitions: number
  next_review_at: string
  updated_at: string
  is_ai_generated?: boolean
  last_ai_score?: number
}

// SM-2 Algorithm calculation result
export interface SM2Result {
  easeFactor: number
  intervalDays: number
  repetitions: number
  nextReviewAt: string
}

// AI-Generated Flashcard (from database)
export interface AIGeneratedFlashcard {
  id: string
  flashcard_id: string
  module_id: string
  lesson_ids: string[]
  front: string
  back: string
  hint?: string
  difficulty: 'easy' | 'medium' | 'hard'
  created_by_user_id?: string
  usage_count: number
  created_at: string
}

// Request for generating flashcards
export interface FlashcardGenerationRequest {
  moduleId: string
  lessonIds: string[]
  count: number
  difficulty: 'easy' | 'medium' | 'hard'
}

// AI Grading result
export interface AIGradingResult {
  score: number // 0-1
  feedback: string
  wasCorrect: boolean // true if score >= 0.85
  quality: number // SM-2 quality rating (0-5)
}

// Flashcard source configuration
export type FlashcardSourceMode = 'existing' | 'generate' | 'mixed'

export interface FlashcardSourceConfig {
  mode: FlashcardSourceMode
  moduleIds?: string[] // For existing cards
  cardCount?: number // Limit number of cards
  excludeKnown?: boolean // Filter out known cards
  generationRequest?: FlashcardGenerationRequest // For AI generation
}

// User flashcard knowledge marker
export interface FlashcardKnowledge {
  id: string
  user_id: string
  flashcard_id: string
  module_id: string
  is_ai_generated: boolean
  marked_known_at: string
}

// AI grading history entry
export interface GradingHistoryEntry {
  id: string
  user_id: string
  flashcard_id: string
  user_answer: string
  correct_answer: string
  ai_score: number
  ai_feedback: string
  was_correct: boolean
  created_at: string
}

// Community flashcard (shared after admin approval)
export interface CommunityFlashcard {
  id: string
  module_id: string
  front: string
  back: string
  hint?: string
  difficulty: 'easy' | 'medium' | 'hard'
  status: 'pending' | 'approved' | 'rejected'
  submitted_by?: string
  reviewed_by?: string
  created_at: string
  reviewed_at?: string
  rejection_reason?: string
}
