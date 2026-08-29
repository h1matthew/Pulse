/**
 * Types for generated quiz management
 */

export interface AIQuizQuestion {
  questionText: string
  options: string[]
  correctAnswer: string
  explanation: string
}

export interface AIGeneratedQuiz {
  id: string
  module_id: string
  lesson_id?: string
  questions: AIQuizQuestion[]
  status: 'pending' | 'approved' | 'rejected'
  generated_by?: string
  generated_at: string
  reviewed_by?: string
  reviewed_at?: string
  rejection_reason?: string
}

export interface CreateAIQuizRequest {
  moduleId: string
  lessonId?: string
  count: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  includeEquations: boolean
}

export interface BulkActionRequest {
  ids: string[]
  action: 'approve' | 'reject'
  reason?: string
}

export interface BulkActionResult {
  success: string[]
  failed: { id: string; error: string }[]
}
