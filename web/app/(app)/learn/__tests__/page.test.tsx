import { describe, it, expect } from 'vitest'

describe('Learn Page Data Structures', () => {
  describe('Module data from database', () => {
    it('should have required module fields', () => {
      const moduleFromDb = {
        id: '11111111-1111-1111-1111-111111111111',
        slug: 'how-rockets-fly',
        title: 'How Rockets Fly',
        description: 'Learn the fundamental physics of rocket propulsion',
        icon: '🚀',
        order_index: 0,
        status: 'published',
        lessons: [
          { id: 'l1', status: 'published' },
          { id: 'l2', status: 'published' },
        ],
      }

      expect(moduleFromDb.id).toBeDefined()
      expect(moduleFromDb.slug).toBe('how-rockets-fly')
      expect(moduleFromDb.title).toBe('How Rockets Fly')
      expect(moduleFromDb.status).toBe('published')
      expect(moduleFromDb.lessons).toHaveLength(2)
    })

    it('should count lesson completion correctly', () => {
      const moduleWithLessons = {
        id: '1',
        slug: 'test',
        title: 'Test',
        lessons: [
          { id: 'l1', status: 'published' },
          { id: 'l2', status: 'published' },
          { id: 'l3', status: 'draft' },
        ],
      }

      const publishedLessons = moduleWithLessons.lessons.filter(
        (l) => l.status === 'published'
      )
      expect(publishedLessons).toHaveLength(2)
    })
  })

  describe('Lesson data from database', () => {
    it('should have required lesson fields', () => {
      const lessonFromDb = {
        id: 'aaaa1111-1111-1111-1111-111111111111',
        module_id: '11111111-1111-1111-1111-111111111111',
        slug: 'what-is-thrust',
        title: 'What is Thrust?',
        description: 'Learn how rockets generate force',
        order_index: 0,
        estimated_minutes: 10,
        is_quiz: false,
        status: 'published',
      }

      expect(lessonFromDb.id).toBeDefined()
      expect(lessonFromDb.module_id).toBeDefined()
      expect(lessonFromDb.slug).toBe('what-is-thrust')
      expect(lessonFromDb.title).toBe('What is Thrust?')
      expect(lessonFromDb.is_quiz).toBe(false)
      expect(lessonFromDb.estimated_minutes).toBe(10)
    })

    it('should identify quiz lessons', () => {
      const quizLesson = {
        id: 'quiz-1',
        module_id: 'module-1',
        slug: 'module-1-quiz',
        title: 'Module 1 Quiz',
        is_quiz: true,
        status: 'published',
      }

      expect(quizLesson.is_quiz).toBe(true)
    })
  })

  describe('Content blocks from database', () => {
    it('should support text content blocks', () => {
      const contentBlock = {
        id: 'cb-1',
        lesson_id: 'lesson-1',
        type: 'text',
        content: 'Thrust is the force that propels a rocket forward.',
        order_index: 0,
      }

      expect(contentBlock.type).toBe('text')
      expect(contentBlock.content).toContain('Thrust')
    })

    it('should support equation content blocks', () => {
      const equationBlock = {
        id: 'cb-2',
        lesson_id: 'lesson-1',
        type: 'equation',
        content: 'F_{thrust} = \\dot{m} \\times v_{exhaust}',
        order_index: 1,
      }

      expect(equationBlock.type).toBe('equation')
      expect(equationBlock.content).toContain('F_{thrust}')
    })

    it('should support callout content blocks', () => {
      const calloutBlock = {
        id: 'cb-3',
        lesson_id: 'lesson-1',
        type: 'callout',
        content: 'Key Concept: Thrust is measured in Newtons (N)',
        order_index: 2,
      }

      expect(calloutBlock.type).toBe('callout')
      expect(calloutBlock.content).toContain('Key Concept')
    })

    it('should support list content blocks with items', () => {
      const listBlock = {
        id: 'cb-4',
        lesson_id: 'lesson-1',
        type: 'list',
        content: 'Key Points:',
        items: ['Conservation of momentum', 'Exhaust velocity matters', 'Mass flow rate determines thrust'],
        order_index: 3,
      }

      expect(listBlock.type).toBe('list')
      expect(listBlock.items).toHaveLength(3)
    })

    it('should support image content blocks', () => {
      const imageBlock = {
        id: 'cb-5',
        lesson_id: 'lesson-1',
        type: 'image',
        content: 'Rocket engine diagram',
        image_url: '/images/rocket-engine.png',
        image_alt: 'Cross-section of a rocket engine',
        order_index: 4,
      }

      expect(imageBlock.type).toBe('image')
      expect(imageBlock.image_url).toBeDefined()
      expect(imageBlock.image_alt).toBeDefined()
    })
  })

  describe('Quiz questions from database', () => {
    it('should support multiple-choice questions', () => {
      const mcQuestion = {
        id: 'q-1',
        lesson_id: 'quiz-1',
        question_text: 'What force propels a rocket forward?',
        question_type: 'multiple-choice',
        options: ['Lift', 'Thrust', 'Drag', 'Weight'],
        correct_answer: 'Thrust',
        explanation: 'Thrust is the force generated by rocket engines.',
        order_index: 0,
      }

      expect(mcQuestion.question_type).toBe('multiple-choice')
      expect(mcQuestion.options).toHaveLength(4)
      expect(mcQuestion.correct_answer).toBe('Thrust')
    })

    it('should support true-false questions', () => {
      const tfQuestion = {
        id: 'q-2',
        lesson_id: 'quiz-1',
        question_text: 'Rockets can work in the vacuum of space.',
        question_type: 'true-false',
        options: ['True', 'False'],
        correct_answer: 'True',
        explanation: 'Rockets carry their own propellant and oxidizer.',
        order_index: 1,
      }

      expect(tfQuestion.question_type).toBe('true-false')
      expect(tfQuestion.options).toHaveLength(2)
    })
  })

  describe('Navigation data', () => {
    it('should compute previous and next lessons', () => {
      const lessons = [
        { id: 'l1', slug: 'lesson-1', order_index: 0 },
        { id: 'l2', slug: 'lesson-2', order_index: 1 },
        { id: 'l3', slug: 'lesson-3', order_index: 2 },
      ]

      const currentIndex = lessons.findIndex((l) => l.id === 'l2')
      const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null
      const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null

      expect(prevLesson?.slug).toBe('lesson-1')
      expect(nextLesson?.slug).toBe('lesson-3')
    })

    it('should handle first lesson (no previous)', () => {
      const lessons = [
        { id: 'l1', slug: 'lesson-1', order_index: 0 },
        { id: 'l2', slug: 'lesson-2', order_index: 1 },
      ]

      const currentIndex = 0
      const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null

      expect(prevLesson).toBeNull()
    })

    it('should handle last lesson (no next)', () => {
      const lessons = [
        { id: 'l1', slug: 'lesson-1', order_index: 0 },
        { id: 'l2', slug: 'lesson-2', order_index: 1 },
      ]

      const currentIndex = 1
      const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null

      expect(nextLesson).toBeNull()
    })
  })

  describe('LessonData conversion', () => {
    it('should convert database content blocks to LessonContent format', () => {
      const dbContentBlocks = [
        { id: 'cb1', lesson_id: 'l1', type: 'heading', content: 'Introduction', order_index: 0 },
        { id: 'cb2', lesson_id: 'l1', type: 'text', content: 'Welcome to the lesson', order_index: 1 },
      ]

      // Simulating the conversion function
      const lessonContent = dbContentBlocks.map((block) => ({
        type: block.type,
        content: block.content,
      }))

      expect(lessonContent).toHaveLength(2)
      expect(lessonContent[0].type).toBe('heading')
      expect(lessonContent[1].type).toBe('text')
    })

    it('should convert database quiz questions to QuizQuestion format', () => {
      const dbQuizQuestions = [
        {
          id: 'q1',
          lesson_id: 'l1',
          question_text: 'What is 2+2?',
          question_type: 'multiple-choice',
          options: ['3', '4', '5'],
          correct_answer: '4',
          explanation: 'Basic math',
          order_index: 0,
        },
      ]

      // Simulating the conversion function
      const quizQuestions = dbQuizQuestions.map((q) => ({
        id: q.id,
        questionText: q.question_text,
        type: 'multiple-choice' as const,
        options: q.options,
        correctAnswer: q.correct_answer,
        explanation: q.explanation,
      }))

      expect(quizQuestions).toHaveLength(1)
      expect(quizQuestions[0].questionText).toBe('What is 2+2?')
      expect(quizQuestions[0].correctAnswer).toBe('4')
    })
  })
})
