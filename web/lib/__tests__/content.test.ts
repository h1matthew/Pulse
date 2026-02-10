import { describe, it, expect } from 'vitest'
import { COURSE_MODULES } from '@/lib/constants/modules'
import { getLessonContent } from '@/lib/content'

const VALID_CONTENT_TYPES = ['text', 'heading', 'subheading', 'equation', 'video', 'callout', 'list', 'worked-example', 'practice-problem']

describe('Lesson Content', () => {
  const allLessons = COURSE_MODULES.flatMap(m =>
    m.lessons.map(l => ({ ...l, moduleId: m.id }))
  )

  it('every lesson ID in modules has corresponding content', () => {
    for (const lesson of allLessons) {
      const content = getLessonContent(lesson.id)
      expect(content, `Missing content for lesson: ${lesson.id}`).toBeDefined()
    }
  })

  it('content blocks have valid type values', () => {
    for (const lesson of allLessons) {
      const data = getLessonContent(lesson.id)
      if (!data) continue

      for (const block of data.content) {
        expect(
          VALID_CONTENT_TYPES,
          `Invalid type "${block.type}" in lesson ${lesson.id}`
        ).toContain(block.type)
      }
    }
  })

  it('content blocks have non-empty content string', () => {
    for (const lesson of allLessons) {
      const data = getLessonContent(lesson.id)
      if (!data) continue

      for (const block of data.content) {
        expect(block.content, `Empty content in lesson ${lesson.id}`).toBeTruthy()
      }
    }
  })

  it('list blocks have items array', () => {
    for (const lesson of allLessons) {
      const data = getLessonContent(lesson.id)
      if (!data) continue

      for (const block of data.content) {
        if (block.type === 'list') {
          expect(block.items, `List block in ${lesson.id} missing items`).toBeDefined()
          expect(block.items!.length).toBeGreaterThan(0)
        }
      }
    }
  })

  it('quiz lessons have quiz array with questions', () => {
    const quizLessons = allLessons.filter(l => l.isQuiz)

    for (const lesson of quizLessons) {
      const data = getLessonContent(lesson.id)
      expect(data, `Missing content for quiz: ${lesson.id}`).toBeDefined()
      expect(data!.quiz, `Quiz ${lesson.id} missing quiz array`).toBeDefined()
      expect(data!.quiz!.length, `Quiz ${lesson.id} has no questions`).toBeGreaterThan(0)
    }
  })

  it('quiz questions have required fields', () => {
    const quizLessons = allLessons.filter(l => l.isQuiz)

    for (const lesson of quizLessons) {
      const data = getLessonContent(lesson.id)
      if (!data?.quiz) continue

      for (const q of data.quiz) {
        expect(q.id, `Quiz question in ${lesson.id} missing id`).toBeTruthy()
        expect(q.questionText, `Quiz question ${q.id} missing questionText`).toBeTruthy()
        expect(q.options, `Quiz question ${q.id} missing options`).toBeDefined()
        expect(q.options.length, `Quiz question ${q.id} has no options`).toBeGreaterThanOrEqual(2)
        expect(q.correctAnswer, `Quiz question ${q.id} missing correctAnswer`).toBeTruthy()
        expect(q.explanation, `Quiz question ${q.id} missing explanation`).toBeTruthy()
      }
    }
  })

  it('quiz question correctAnswer is one of the options', () => {
    const quizLessons = allLessons.filter(l => l.isQuiz)

    for (const lesson of quizLessons) {
      const data = getLessonContent(lesson.id)
      if (!data?.quiz) continue

      for (const q of data.quiz) {
        expect(
          q.options,
          `correctAnswer "${q.correctAnswer}" not in options for ${q.id}`
        ).toContain(q.correctAnswer)
      }
    }
  })

  it('per-lesson quizzes have valid questions when present', () => {
    const regularLessons = allLessons.filter(l => !l.isQuiz)

    for (const lesson of regularLessons) {
      const data = getLessonContent(lesson.id)
      if (!data?.quiz) continue
      for (const q of data.quiz) {
        expect(q.id, `Quiz question in ${lesson.id} missing id`).toBeTruthy()
        expect(q.questionText, `Quiz question ${q.id} missing questionText`).toBeTruthy()
        expect(q.options.length, `Quiz question ${q.id} has no options`).toBeGreaterThanOrEqual(2)
        expect(q.correctAnswer, `Quiz question ${q.id} missing correctAnswer`).toBeTruthy()
        expect(q.options, `correctAnswer "${q.correctAnswer}" not in options for ${q.id}`).toContain(q.correctAnswer)
      }
    }
  })

  it('video blocks reference a composition ID', () => {
    for (const lesson of allLessons) {
      const data = getLessonContent(lesson.id)
      if (!data) continue

      for (const block of data.content) {
        if (block.type === 'video') {
          expect(block.content, `Video block in ${lesson.id} missing compositionId`).toBeTruthy()
        }
      }
    }
  })

  it('video blocks reference composition IDs that follow naming convention', () => {
    for (const lesson of allLessons) {
      const data = getLessonContent(lesson.id)
      if (!data) continue

      for (const block of data.content) {
        if (block.type === 'video') {
          expect(block.content, `Video block in ${lesson.id} missing compositionId`).toBeTruthy()
          expect(
            block.content.endsWith('-viz'),
            `Video block in ${lesson.id} has composition "${block.content}" not ending in -viz`
          ).toBe(true)
        }
      }
    }
  })

  it('each quiz has at least 4 questions', () => {
    const quizLessons = allLessons.filter(l => l.isQuiz)

    for (const lesson of quizLessons) {
      const data = getLessonContent(lesson.id)
      if (!data?.quiz) continue
      expect(data.quiz.length, `Quiz ${lesson.id} should have at least 4 questions`).toBeGreaterThanOrEqual(4)
    }
  })

  it('all quiz question IDs are unique', () => {
    const allQuizIds: string[] = []

    for (const lesson of allLessons) {
      const data = getLessonContent(lesson.id)
      if (!data?.quiz) continue
      for (const q of data.quiz) {
        allQuizIds.push(q.id)
      }
    }

    const duplicates = allQuizIds.filter((id, i) => allQuizIds.indexOf(id) !== i)
    expect(duplicates, `Duplicate quiz IDs: ${duplicates.join(', ')}`).toHaveLength(0)
  })
})
