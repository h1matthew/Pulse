import { describe, it, expect, vi } from 'vitest'
import {
  evaluateAchievements,
  createEmptyStats,
  type UserStats,
} from '../achievementChecker'

// Mock the achievements constant
vi.mock('@/lib/constants/achievements', () => ({
  ACHIEVEMENTS: [
    {
      id: 'first-lesson',
      name: 'First Lesson',
      description: 'Complete your first lesson',
      icon: '📚',
      requirement: { type: 'lessons_completed', count: 1 },
    },
    {
      id: 'five-lessons',
      name: 'Dedicated Student',
      description: 'Complete 5 lessons',
      icon: '📖',
      requirement: { type: 'lessons_completed', count: 5 },
    },
    {
      id: 'first-module',
      name: 'Module Master',
      description: 'Complete your first module',
      icon: '🎓',
      requirement: { type: 'modules_completed', count: 1 },
    },
    {
      id: 'quiz-taker',
      name: 'Quiz Taker',
      description: 'Take 3 quizzes',
      icon: '📝',
      requirement: { type: 'quiz_count', count: 3 },
    },
    {
      id: 'perfectionist',
      name: 'Perfectionist',
      description: 'Get 100% on a quiz',
      icon: '💯',
      requirement: { type: 'quiz_perfect', count: 1 },
    },
    {
      id: 'curious-mind',
      name: 'Curious Mind',
      description: 'Ask the AI tutor 5 questions',
      icon: '🤔',
      requirement: { type: 'ai_asked', count: 5 },
    },
    {
      id: 'explorer',
      name: 'Explorer',
      description: 'Visit 3 different modules',
      icon: '🔭',
      requirement: { type: 'modules_visited', count: 3 },
    },
    {
      id: 'launch-first',
      name: 'First Launch',
      description: 'Launch your first rocket simulation',
      icon: '🚀',
      requirement: { type: 'simulator_used', simulatorType: 'flight', count: 1 },
    },
    {
      id: 'orbit-master',
      name: 'Orbit Master',
      description: 'Complete 5 orbital transfers',
      icon: '🛰️',
      requirement: { type: 'simulator_used', simulatorType: 'orbit', count: 5 },
    },
    {
      id: 'mach-one',
      name: 'Mach 1',
      description: 'Break the sound barrier',
      icon: '💨',
      requirement: { type: 'simulator_milestone', simulatorType: 'flight', milestoneValue: 343 },
    },
    {
      id: 'space-altitude',
      name: 'Space Altitude',
      description: 'Reach 100km altitude',
      icon: '🌌',
      requirement: { type: 'simulator_milestone', simulatorType: 'flight', milestoneValue: 100000 },
    },
    {
      id: 'lunar-distance',
      name: 'Lunar Distance',
      description: 'Reach lunar distance in orbit sim',
      icon: '🌕',
      requirement: { type: 'simulator_milestone', simulatorType: 'orbit', milestoneValue: 384400 },
    },
    {
      id: 'week-streak',
      name: 'Week Warrior',
      description: '7 day streak',
      icon: '🔥',
      requirement: { type: 'streak', count: 7 },
    },
    {
      id: 'flashcard-first',
      name: 'Card Shark',
      description: 'Complete a flashcard set',
      icon: '🃏',
      requirement: { type: 'flashcard_sets_completed', count: 1 },
    },
    {
      id: 'flashcard-streak',
      name: 'Daily Reviewer',
      description: '3 day flashcard streak',
      icon: '📆',
      requirement: { type: 'flashcard_review_streak', count: 3 },
    },
    {
      id: 'flashcard-perfect',
      name: 'Perfect Memory',
      description: 'Get 100% on a flashcard set',
      icon: '🧠',
      requirement: { type: 'flashcard_perfect_scores', count: 1 },
    },
    {
      id: 'flashcard-mastery',
      name: 'Memory Master',
      description: 'Master 50 flashcards',
      icon: '👑',
      requirement: { type: 'flashcard_cards_mastered', count: 50 },
    },
    {
      id: 'practice-problems',
      name: 'Problem Solver',
      description: 'Complete 10 practice problems',
      icon: '🧮',
      requirement: { type: 'practice_problems_completed', count: 10 },
    },
    {
      id: 'lesson-streak',
      name: 'Lesson Streak',
      description: '5 day lesson streak',
      icon: '📅',
      requirement: { type: 'lesson_streak', count: 5 },
    },
  ],
}))

describe('createEmptyStats', () => {
  it('creates stats with all zero values', () => {
    const stats = createEmptyStats()

    expect(stats.lessonsCompleted).toBe(0)
    expect(stats.modulesCompleted).toBe(0)
    expect(stats.quizCount).toBe(0)
    expect(stats.quizPerfectCount).toBe(0)
    expect(stats.aiAskedCount).toBe(0)
    expect(stats.modulesVisited).toEqual([])
    expect(stats.flightLaunches).toBe(0)
    expect(stats.orbitTransfers).toBe(0)
    expect(stats.flightMaxAltitude).toBe(0)
    expect(stats.flightMaxSpeed).toBe(0)
    expect(stats.orbitMaxDistance).toBe(0)
    expect(stats.currentStreak).toBe(0)
    expect(stats.flashcardSetsCompleted).toBe(0)
    expect(stats.flashcardReviewStreak).toBe(0)
    expect(stats.flashcardPerfectScores).toBe(0)
    expect(stats.flashcardCardsMastered).toBe(0)
    expect(stats.practiceProblemsCompleted).toBe(0)
    expect(stats.lessonStreak).toBe(0)
  })
})

describe('evaluateAchievements', () => {
  describe('lessons_completed requirement', () => {
    it('unlocks first lesson achievement when completing 1 lesson', () => {
      const stats = { ...createEmptyStats(), lessonsCompleted: 1 }
      const alreadyUnlocked = new Set<string>()

      const newAchievements = evaluateAchievements(stats, alreadyUnlocked)

      expect(newAchievements.map(a => a.id)).toContain('first-lesson')
    })

    it('does not unlock if already unlocked', () => {
      const stats = { ...createEmptyStats(), lessonsCompleted: 1 }
      const alreadyUnlocked = new Set(['first-lesson'])

      const newAchievements = evaluateAchievements(stats, alreadyUnlocked)

      expect(newAchievements.map(a => a.id)).not.toContain('first-lesson')
    })

    it('unlocks multiple lesson achievements at once', () => {
      const stats = { ...createEmptyStats(), lessonsCompleted: 5 }
      const alreadyUnlocked = new Set<string>()

      const newAchievements = evaluateAchievements(stats, alreadyUnlocked)

      expect(newAchievements.map(a => a.id)).toContain('first-lesson')
      expect(newAchievements.map(a => a.id)).toContain('five-lessons')
    })
  })

  describe('modules_completed requirement', () => {
    it('unlocks module completion achievement', () => {
      const stats = { ...createEmptyStats(), modulesCompleted: 1 }
      const alreadyUnlocked = new Set<string>()

      const newAchievements = evaluateAchievements(stats, alreadyUnlocked)

      expect(newAchievements.map(a => a.id)).toContain('first-module')
    })
  })

  describe('quiz requirements', () => {
    it('unlocks quiz count achievement', () => {
      const stats = { ...createEmptyStats(), quizCount: 3 }
      const alreadyUnlocked = new Set<string>()

      const newAchievements = evaluateAchievements(stats, alreadyUnlocked)

      expect(newAchievements.map(a => a.id)).toContain('quiz-taker')
    })

    it('unlocks perfect quiz achievement', () => {
      const stats = { ...createEmptyStats(), quizPerfectCount: 1 }
      const alreadyUnlocked = new Set<string>()

      const newAchievements = evaluateAchievements(stats, alreadyUnlocked)

      expect(newAchievements.map(a => a.id)).toContain('perfectionist')
    })
  })

  describe('ai_asked requirement', () => {
    it('unlocks AI question achievement', () => {
      const stats = { ...createEmptyStats(), aiAskedCount: 5 }
      const alreadyUnlocked = new Set<string>()

      const newAchievements = evaluateAchievements(stats, alreadyUnlocked)

      expect(newAchievements.map(a => a.id)).toContain('curious-mind')
    })
  })

  describe('modules_visited requirement', () => {
    it('unlocks explorer achievement', () => {
      const stats = { ...createEmptyStats(), modulesVisited: ['mod1', 'mod2', 'mod3'] }
      const alreadyUnlocked = new Set<string>()

      const newAchievements = evaluateAchievements(stats, alreadyUnlocked)

      expect(newAchievements.map(a => a.id)).toContain('explorer')
    })
  })

  describe('simulator_used requirement', () => {
    it('unlocks flight simulator achievement', () => {
      const stats = { ...createEmptyStats(), flightLaunches: 1 }
      const alreadyUnlocked = new Set<string>()

      const newAchievements = evaluateAchievements(stats, alreadyUnlocked)

      expect(newAchievements.map(a => a.id)).toContain('launch-first')
    })

    it('unlocks orbit simulator achievement', () => {
      const stats = { ...createEmptyStats(), orbitTransfers: 5 }
      const alreadyUnlocked = new Set<string>()

      const newAchievements = evaluateAchievements(stats, alreadyUnlocked)

      expect(newAchievements.map(a => a.id)).toContain('orbit-master')
    })
  })

  describe('simulator_milestone requirement', () => {
    it('unlocks speed milestone (Mach 1)', () => {
      const stats = { ...createEmptyStats(), flightMaxSpeed: 343 }
      const alreadyUnlocked = new Set<string>()

      const newAchievements = evaluateAchievements(stats, alreadyUnlocked)

      expect(newAchievements.map(a => a.id)).toContain('mach-one')
    })

    it('unlocks altitude milestone', () => {
      const stats = { ...createEmptyStats(), flightMaxAltitude: 100000 }
      const alreadyUnlocked = new Set<string>()

      const newAchievements = evaluateAchievements(stats, alreadyUnlocked)

      expect(newAchievements.map(a => a.id)).toContain('space-altitude')
    })

    it('unlocks orbit distance milestone', () => {
      const stats = { ...createEmptyStats(), orbitMaxDistance: 384400 }
      const alreadyUnlocked = new Set<string>()

      const newAchievements = evaluateAchievements(stats, alreadyUnlocked)

      expect(newAchievements.map(a => a.id)).toContain('lunar-distance')
    })
  })

  describe('streak requirement', () => {
    it('unlocks streak achievement', () => {
      const stats = { ...createEmptyStats(), currentStreak: 7 }
      const alreadyUnlocked = new Set<string>()

      const newAchievements = evaluateAchievements(stats, alreadyUnlocked)

      expect(newAchievements.map(a => a.id)).toContain('week-streak')
    })
  })

  describe('flashcard requirements', () => {
    it('unlocks flashcard sets completed achievement', () => {
      const stats = { ...createEmptyStats(), flashcardSetsCompleted: 1 }
      const alreadyUnlocked = new Set<string>()

      const newAchievements = evaluateAchievements(stats, alreadyUnlocked)

      expect(newAchievements.map(a => a.id)).toContain('flashcard-first')
    })

    it('unlocks flashcard review streak achievement', () => {
      const stats = { ...createEmptyStats(), flashcardReviewStreak: 3 }
      const alreadyUnlocked = new Set<string>()

      const newAchievements = evaluateAchievements(stats, alreadyUnlocked)

      expect(newAchievements.map(a => a.id)).toContain('flashcard-streak')
    })

    it('unlocks flashcard perfect score achievement', () => {
      const stats = { ...createEmptyStats(), flashcardPerfectScores: 1 }
      const alreadyUnlocked = new Set<string>()

      const newAchievements = evaluateAchievements(stats, alreadyUnlocked)

      expect(newAchievements.map(a => a.id)).toContain('flashcard-perfect')
    })

    it('unlocks flashcard cards mastered achievement', () => {
      const stats = { ...createEmptyStats(), flashcardCardsMastered: 50 }
      const alreadyUnlocked = new Set<string>()

      const newAchievements = evaluateAchievements(stats, alreadyUnlocked)

      expect(newAchievements.map(a => a.id)).toContain('flashcard-mastery')
    })
  })

  describe('practice problems requirement', () => {
    it('unlocks practice problems achievement', () => {
      const stats = { ...createEmptyStats(), practiceProblemsCompleted: 10 }
      const alreadyUnlocked = new Set<string>()

      const newAchievements = evaluateAchievements(stats, alreadyUnlocked)

      expect(newAchievements.map(a => a.id)).toContain('practice-problems')
    })
  })

  describe('lesson streak requirement', () => {
    it('unlocks lesson streak achievement', () => {
      const stats = { ...createEmptyStats(), lessonStreak: 5 }
      const alreadyUnlocked = new Set<string>()

      const newAchievements = evaluateAchievements(stats, alreadyUnlocked)

      expect(newAchievements.map(a => a.id)).toContain('lesson-streak')
    })
  })

  describe('edge cases', () => {
    it('returns empty array when no achievements earned', () => {
      const stats = createEmptyStats()
      const alreadyUnlocked = new Set<string>()

      const newAchievements = evaluateAchievements(stats, alreadyUnlocked)

      expect(newAchievements).toHaveLength(0)
    })

    it('returns empty array when all achievements already unlocked', () => {
      const stats = {
        ...createEmptyStats(),
        lessonsCompleted: 10,
        modulesCompleted: 5,
        quizCount: 10,
        quizPerfectCount: 5,
      }
      const alreadyUnlocked = new Set([
        'first-lesson',
        'five-lessons',
        'first-module',
        'quiz-taker',
        'perfectionist',
      ])

      const newAchievements = evaluateAchievements(stats, alreadyUnlocked)

      expect(newAchievements.filter(a =>
        ['first-lesson', 'five-lessons', 'first-module', 'quiz-taker', 'perfectionist'].includes(a.id)
      )).toHaveLength(0)
    })

    it('handles exact threshold values', () => {
      const stats = { ...createEmptyStats(), lessonsCompleted: 1 }
      const alreadyUnlocked = new Set<string>()

      const newAchievements = evaluateAchievements(stats, alreadyUnlocked)

      expect(newAchievements.map(a => a.id)).toContain('first-lesson')
    })
  })
})
