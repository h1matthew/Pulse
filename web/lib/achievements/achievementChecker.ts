import type { Achievement } from '@/types/achievements'
import { ACHIEVEMENTS } from '@/lib/constants/achievements'

export interface UserStats {
  lessonsCompleted: number
  modulesCompleted: number
  quizCount: number
  quizPerfectCount: number
  aiAskedCount: number
  modulesVisited: string[]
  flightLaunches: number
  orbitTransfers: number
  flightMaxAltitude: number
  flightMaxSpeed: number
  orbitMaxDistance: number
  currentStreak: number
  // Flashcard stats
  flashcardSetsCompleted: number
  flashcardReviewStreak: number
  flashcardPerfectScores: number
  flashcardCardsMastered: number
  // Practice problem stats
  practiceProblemsCompleted: number
  // Lesson streak (days in a row with completed lessons)
  lessonStreak: number
}

export function evaluateAchievements(
  stats: UserStats,
  alreadyUnlockedIds: Set<string>
): Achievement[] {
  const newlyUnlocked: Achievement[] = []

  for (const achievement of ACHIEVEMENTS) {
    if (alreadyUnlockedIds.has(achievement.id)) {
      continue
    }

    if (checkRequirement(achievement, stats)) {
      newlyUnlocked.push(achievement)
    }
  }

  return newlyUnlocked
}

function checkRequirement(achievement: Achievement, stats: UserStats): boolean {
  const { requirement } = achievement

  switch (requirement.type) {
    case 'lessons_completed':
      return stats.lessonsCompleted >= requirement.count

    case 'modules_completed':
      return stats.modulesCompleted >= requirement.count

    case 'quiz_count':
      return stats.quizCount >= requirement.count

    case 'quiz_perfect':
      return stats.quizPerfectCount >= requirement.count

    case 'ai_asked':
      return stats.aiAskedCount >= requirement.count

    case 'modules_visited':
      return stats.modulesVisited.length >= requirement.count

    case 'simulator_used':
      if (requirement.simulatorType === 'flight') {
        return stats.flightLaunches >= requirement.count
      }
      if (requirement.simulatorType === 'orbit') {
        return stats.orbitTransfers >= requirement.count
      }
      return false

    case 'simulator_milestone':
      if (requirement.simulatorType === 'flight') {
        if (requirement.milestoneValue === 343) {
          return stats.flightMaxSpeed >= requirement.milestoneValue
        }
        return stats.flightMaxAltitude >= (requirement.milestoneValue || 0)
      }
      if (requirement.simulatorType === 'orbit') {
        return stats.orbitMaxDistance >= (requirement.milestoneValue || 0)
      }
      return false

    case 'streak':
      return stats.currentStreak >= requirement.count

    case 'flashcard_sets_completed':
      return stats.flashcardSetsCompleted >= requirement.count

    case 'flashcard_review_streak':
      return stats.flashcardReviewStreak >= requirement.count

    case 'flashcard_perfect_scores':
      return stats.flashcardPerfectScores >= requirement.count

    case 'flashcard_cards_mastered':
      return stats.flashcardCardsMastered >= requirement.count

    case 'practice_problems_completed':
      return stats.practiceProblemsCompleted >= requirement.count

    case 'lesson_streak':
      return stats.lessonStreak >= requirement.count

    default:
      return false
  }
}

export function createEmptyStats(): UserStats {
  return {
    lessonsCompleted: 0,
    modulesCompleted: 0,
    quizCount: 0,
    quizPerfectCount: 0,
    aiAskedCount: 0,
    modulesVisited: [],
    flightLaunches: 0,
    orbitTransfers: 0,
    flightMaxAltitude: 0,
    flightMaxSpeed: 0,
    orbitMaxDistance: 0,
    currentStreak: 0,
    flashcardSetsCompleted: 0,
    flashcardReviewStreak: 0,
    flashcardPerfectScores: 0,
    flashcardCardsMastered: 0,
    practiceProblemsCompleted: 0,
    lessonStreak: 0,
  }
}
