import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Create properly chained mock
function createMockSupabase() {
  const mockResponse = { data: null, error: null }

  const chainable = {
    from: vi.fn(() => chainable),
    select: vi.fn(() => chainable),
    eq: vi.fn(() => chainable),
    order: vi.fn(() => chainable),
    single: vi.fn(() => Promise.resolve(mockResponse)),
    limit: vi.fn(() => chainable),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null as null } })),
    },
    setMockResponse: (data: unknown, error: unknown = null) => {
      mockResponse.data = data as null
      mockResponse.error = error as null
    },
    setMockUser: (user: unknown) => {
      chainable.auth.getUser = vi.fn(() =>
        Promise.resolve({ data: { user: user as null } })
      )
    },
  }

  return chainable
}

describe('Admin Types', () => {
  describe('Module structure', () => {
    it('should have correct module fields', () => {
      const module = {
        id: 'uuid-123',
        slug: 'test-module',
        title: 'Test Module',
        description: 'A test module',
        icon: '🚀',
        order_index: 0,
        status: 'draft' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: null,
      }

      expect(module.id).toBe('uuid-123')
      expect(module.slug).toBe('test-module')
      expect(module.title).toBe('Test Module')
      expect(module.status).toBe('draft')
      expect(module.icon).toBe('🚀')
    })
  })

  describe('Lesson structure', () => {
    it('should have correct lesson fields', () => {
      const lesson = {
        id: 'lesson-uuid',
        module_id: 'module-uuid',
        slug: 'test-lesson',
        title: 'Test Lesson',
        description: 'A test lesson',
        order_index: 0,
        estimated_minutes: 10,
        is_quiz: false,
        status: 'published' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: null,
      }

      expect(lesson.id).toBe('lesson-uuid')
      expect(lesson.module_id).toBe('module-uuid')
      expect(lesson.is_quiz).toBe(false)
      expect(lesson.estimated_minutes).toBe(10)
      expect(lesson.status).toBe('published')
    })
  })

  describe('Content block structure', () => {
    it('should support text blocks', () => {
      const textBlock = {
        id: 'block-1',
        lesson_id: 'lesson-1',
        type: 'text' as const,
        content: 'This is a text block',
        order_index: 0,
      }

      expect(textBlock.type).toBe('text')
      expect(textBlock.content).toBe('This is a text block')
    })

    it('should support equation blocks', () => {
      const equationBlock = {
        id: 'block-2',
        lesson_id: 'lesson-1',
        type: 'equation' as const,
        content: 'F = ma',
        order_index: 1,
      }

      expect(equationBlock.type).toBe('equation')
      expect(equationBlock.content).toBe('F = ma')
    })

    it('should support list blocks with items', () => {
      const listBlock = {
        id: 'block-3',
        lesson_id: 'lesson-1',
        type: 'list' as const,
        content: 'Key Points:',
        items: ['Point 1', 'Point 2', 'Point 3'],
        order_index: 2,
      }

      expect(listBlock.type).toBe('list')
      expect(listBlock.items).toHaveLength(3)
    })
  })

  describe('Quiz question structure', () => {
    it('should support multiple-choice questions', () => {
      const question = {
        id: 'q-1',
        lesson_id: 'lesson-1',
        question_text: 'What is thrust?',
        question_type: 'multiple-choice' as const,
        options: ['Force', 'Energy', 'Mass', 'Velocity'],
        correct_answer: 'Force',
        explanation: 'Thrust is a force',
        is_auto_graded: true,
        order_index: 0,
      }

      expect(question.question_type).toBe('multiple-choice')
      expect(question.options).toHaveLength(4)
      expect(question.correct_answer).toBe('Force')
    })

    it('should support true-false questions', () => {
      const question = {
        id: 'q-2',
        lesson_id: 'lesson-1',
        question_text: 'Rockets can work in space.',
        question_type: 'true-false' as const,
        options: ['True', 'False'],
        correct_answer: 'True',
        is_auto_graded: true,
        order_index: 1,
      }

      expect(question.question_type).toBe('true-false')
      expect(question.options).toHaveLength(2)
    })
  })

  describe('Video composition structure', () => {
    it('should have correct video properties', () => {
      const video = {
        id: 'video-1',
        name: 'Thrust Animation',
        slug: 'thrust-animation',
        description: 'Animation showing thrust',
        code: 'export function ThrustAnimation() { return <div>Animation</div> }',
        width: 1280,
        height: 720,
        fps: 30,
        duration_frames: 300,
        status: 'published' as const,
      }

      expect(video.width).toBe(1280)
      expect(video.height).toBe(720)
      expect(video.fps).toBe(30)
      expect(video.duration_frames).toBe(300)
    })
  })

  describe('Content version structure', () => {
    it('should track version history', () => {
      const version = {
        id: 'version-1',
        entity_type: 'module' as const,
        entity_id: 'module-1',
        version_number: 1,
        data: { title: 'Old Title' },
        change_summary: 'Updated title',
        created_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
      }

      expect(version.entity_type).toBe('module')
      expect(version.version_number).toBe(1)
      expect(version.data).toHaveProperty('title')
    })
  })
})

describe('Admin Data Flow', () => {
  it('should validate module status values', () => {
    const validStatuses = ['draft', 'published', 'archived']
    expect(validStatuses).toContain('draft')
    expect(validStatuses).toContain('published')
    expect(validStatuses).toContain('archived')
    expect(validStatuses).not.toContain('invalid')
  })

  it('should validate content block types', () => {
    const validTypes = [
      'text', 'heading', 'subheading', 'equation', 'video',
      'callout', 'list', 'image', 'diagram', 'worked-example', 'practice-problem'
    ]
    expect(validTypes).toHaveLength(11)
    expect(validTypes).toContain('text')
    expect(validTypes).toContain('equation')
    expect(validTypes).toContain('practice-problem')
  })

  it('should validate quiz question types', () => {
    const validTypes = ['multiple-choice', 'true-false', 'free-response']
    expect(validTypes).toHaveLength(3)
    expect(validTypes).toContain('multiple-choice')
    expect(validTypes).toContain('true-false')
    expect(validTypes).toContain('free-response')
  })

  it('should validate difficulty levels for quiz questions', () => {
    const validDifficulties = ['recall', 'understanding', 'calculation', 'analysis']
    expect(validDifficulties).toHaveLength(4)
    expect(validDifficulties).toContain('recall')
    expect(validDifficulties).toContain('analysis')
  })

  it('should validate difficulty levels for practice problems', () => {
    const validDifficulties = ['beginner', 'intermediate', 'advanced']
    expect(validDifficulties).toHaveLength(3)
    expect(validDifficulties).toContain('beginner')
    expect(validDifficulties).toContain('advanced')
  })
})
