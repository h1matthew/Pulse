export type AchievementCategory =
  | 'learning'
  | 'mastery'
  | 'explorer'
  | 'simulator'
  | 'streak'
  | 'flashcards'

export type RequirementType =
  | 'lessons_completed'
  | 'modules_completed'
  | 'quiz_count'
  | 'quiz_perfect'
  | 'ai_asked'
  | 'modules_visited'
  | 'simulator_used'
  | 'simulator_milestone'
  | 'streak'
  // Flashcard requirements
  | 'flashcard_sets_completed'
  | 'flashcard_review_streak'
  | 'flashcard_perfect_scores'
  | 'flashcard_cards_mastered'
  // Practice problem requirements
  | 'practice_problems_completed'
  // Lesson streak (different from general streak)
  | 'lesson_streak'

export interface AchievementRequirement {
  type: RequirementType
  count: number
  simulatorType?: 'flight' | 'orbit'
  milestoneValue?: number
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  category: AchievementCategory
  requirement: AchievementRequirement
  points: number
}
