/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  adminKeys,
  useModules,
  useModule,
  useModuleWithLessons,
  useLessonWithContent,
  useAdminStats,
  useReorderModules,
  useReorderLessons,
} from '../useAdminData'

// Mock supabase client
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockOrder = vi.fn()
const mockUpdate = vi.fn()
const mockInsert = vi.fn()
const mockDelete = vi.fn()

const mockQueryBuilder = {
  select: mockSelect,
  eq: mockEq,
  single: mockSingle,
  order: mockOrder,
  update: mockUpdate,
  insert: mockInsert,
  delete: mockDelete,
}

// Chain methods return the builder
mockSelect.mockReturnValue(mockQueryBuilder)
mockEq.mockReturnValue(mockQueryBuilder)
mockOrder.mockReturnValue(mockQueryBuilder)
mockUpdate.mockReturnValue(mockQueryBuilder)
mockInsert.mockReturnValue(mockQueryBuilder)
mockDelete.mockReturnValue(mockQueryBuilder)

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn(() => mockQueryBuilder),
  }),
}))

// Create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

// Create wrapper with QueryClient
function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('adminKeys', () => {
  it('generates correct module keys', () => {
    expect(adminKeys.modules()).toEqual(['admin', 'modules'])
    expect(adminKeys.module('mod-1')).toEqual(['admin', 'modules', 'mod-1'])
    expect(adminKeys.moduleWithLessons('mod-1')).toEqual(['admin', 'modules', 'mod-1', 'lessons'])
  })

  it('generates correct lesson keys', () => {
    expect(adminKeys.lessons('mod-1')).toEqual(['admin', 'lessons', 'mod-1'])
    expect(adminKeys.lesson('lesson-1')).toEqual(['admin', 'lesson', 'lesson-1'])
    expect(adminKeys.lessonWithContent('lesson-1')).toEqual(['admin', 'lesson', 'lesson-1', 'content'])
  })

  it('generates correct stats key', () => {
    expect(adminKeys.stats()).toEqual(['admin', 'stats'])
  })
})

describe('useModules', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = createTestQueryClient()
  })

  it('fetches all modules ordered by order_index', async () => {
    const mockModules = [
      { id: 'mod-1', title: 'Module 1', order_index: 0 },
      { id: 'mod-2', title: 'Module 2', order_index: 1 },
    ]

    mockOrder.mockResolvedValueOnce({ data: mockModules, error: null })

    const { result } = renderHook(() => useModules(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockSelect).toHaveBeenCalledWith('*')
    expect(mockOrder).toHaveBeenCalledWith('order_index', { ascending: true })
    expect(result.current.data).toEqual(mockModules)
  })

  it('returns empty array when no modules', async () => {
    mockOrder.mockResolvedValueOnce({ data: null, error: null })

    const { result } = renderHook(() => useModules(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([])
  })

  it('throws error on fetch failure', async () => {
    mockOrder.mockResolvedValueOnce({ data: null, error: new Error('Database error') })

    const { result } = renderHook(() => useModules(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeDefined()
  })
})

describe('useModule', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = createTestQueryClient()
  })

  it('fetches a single module by id', async () => {
    const mockModule = { id: 'mod-1', title: 'Module 1' }
    mockSingle.mockResolvedValueOnce({ data: mockModule, error: null })

    const { result } = renderHook(() => useModule('mod-1'), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockEq).toHaveBeenCalledWith('id', 'mod-1')
    expect(result.current.data).toEqual(mockModule)
  })

  it('returns null when module not found', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: new Error('Not found') })

    const { result } = renderHook(() => useModule('not-found'), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeNull()
  })

  it('does not fetch when id is empty', async () => {
    const { result } = renderHook(() => useModule(''), {
      wrapper: createWrapper(queryClient),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(mockSelect).not.toHaveBeenCalled()
  })
})

describe('useModuleWithLessons', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = createTestQueryClient()
  })

  it('fetches module with its lessons', async () => {
    const mockModule = { id: 'mod-1', title: 'Module 1' }
    const mockLessons = [
      { id: 'lesson-1', title: 'Lesson 1', module_id: 'mod-1' },
    ]

    mockSingle.mockResolvedValueOnce({ data: mockModule, error: null })
    mockOrder.mockResolvedValueOnce({ data: mockLessons, error: null })

    const { result } = renderHook(() => useModuleWithLessons('mod-1'), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual({
      ...mockModule,
      lessons: mockLessons,
    })
  })

  it('returns null when module not found', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: new Error('Not found') })

    const { result } = renderHook(() => useModuleWithLessons('not-found'), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeNull()
  })
})

describe('useLessonWithContent', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = createTestQueryClient()
  })

  it('fetches lesson with content blocks and quiz questions', async () => {
    const mockLesson = { id: 'lesson-1', title: 'Lesson 1' }
    const mockContentBlocks = [{ id: 'block-1', type: 'text', content: 'Hello' }]
    const mockQuizQuestions = [{ id: 'q-1', text: 'What is?' }]

    mockSingle.mockResolvedValueOnce({ data: mockLesson, error: null })
    mockOrder
      .mockResolvedValueOnce({ data: mockContentBlocks, error: null })
      .mockResolvedValueOnce({ data: mockQuizQuestions, error: null })

    const { result } = renderHook(() => useLessonWithContent('lesson-1'), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual({
      ...mockLesson,
      content_blocks: mockContentBlocks,
      quiz_questions: mockQuizQuestions,
    })
  })
})

describe('useAdminStats', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = createTestQueryClient()
  })

  it('fetches and computes admin statistics', async () => {
    // The hook now uses COUNT queries: select('*', { count: 'exact', head: true })
    // Each query returns { count: N, error: null } — 10 queries total via Promise.all
    // Make mockQueryBuilder thenable so Promise.all can resolve each query
    let thenCallIndex = 0
    const countResults = [
      { count: 2, error: null },   // modules total
      { count: 1, error: null },   // modules published
      { count: 1, error: null },   // modules draft
      { count: 5, error: null },   // lessons total
      { count: 3, error: null },   // lessons published
      { count: 2, error: null },   // lessons draft
      { count: 3, error: null },   // videos total
      { count: 2, error: null },   // videos published
      { count: 1, error: null },   // videos draft
      { count: 10, error: null },  // users total
    ]

    ;(mockQueryBuilder as any).then = (resolve: any, reject: any) => {
      const result = countResults[thenCallIndex++]
      return Promise.resolve(result).then(resolve, reject)
    }

    const { result } = renderHook(() => useAdminStats(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual({
      modules: { total: 2, published: 1, draft: 1 },
      lessons: { total: 5, published: 3, draft: 2 },
      videos: { total: 3, published: 2, draft: 1 },
      users: { total: 10 },
    })

    // Clean up thenable to not affect other tests
    delete (mockQueryBuilder as any).then
  })
})

describe('useReorderModules', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = createTestQueryClient()
  })

  it('updates module order indices', async () => {
    mockEq.mockResolvedValue({ error: null })

    const { result } = renderHook(() => useReorderModules(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      result.current.mutate([
        { id: 'mod-1', order_index: 1 },
        { id: 'mod-2', order_index: 0 },
      ])
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockUpdate).toHaveBeenCalledTimes(2)
    expect(mockUpdate).toHaveBeenCalledWith({ order_index: 1 })
    expect(mockUpdate).toHaveBeenCalledWith({ order_index: 0 })
  })

  it('throws error when any update fails', async () => {
    mockEq
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: new Error('Update failed') })

    const { result } = renderHook(() => useReorderModules(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      result.current.mutate([
        { id: 'mod-1', order_index: 1 },
        { id: 'mod-2', order_index: 0 },
      ])
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useReorderLessons', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = createTestQueryClient()
  })

  it('updates lesson order indices', async () => {
    mockEq.mockResolvedValue({ error: null })

    const { result } = renderHook(() => useReorderLessons('mod-1'), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      result.current.mutate([
        { id: 'lesson-1', order_index: 1 },
        { id: 'lesson-2', order_index: 0 },
      ])
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockUpdate).toHaveBeenCalledTimes(2)
  })
})
