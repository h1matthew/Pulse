/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  userKeys,
  useProgress,
  useCompleteLesson,
  useStats,
  useAchievements,
  useStreaks,
  useLeaderboard,
} from '../useUserData'

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

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('userKeys', () => {
  it('generates correct progress keys', () => {
    expect(userKeys.progress()).toEqual(['user', 'progress'])
    expect(userKeys.progressByModule('mod1')).toEqual(['user', 'progress', 'mod1'])
  })

  it('generates correct stats key', () => {
    expect(userKeys.stats()).toEqual(['user', 'stats'])
  })

  it('generates correct achievements key', () => {
    expect(userKeys.achievements()).toEqual(['user', 'achievements'])
  })

  it('generates correct streaks key', () => {
    expect(userKeys.streaks()).toEqual(['user', 'streaks'])
  })

  it('generates correct leaderboard key', () => {
    expect(userKeys.leaderboard()).toEqual(['leaderboard', 'total_score'])
    expect(userKeys.leaderboard('achievements_count')).toEqual(['leaderboard', 'achievements_count'])
  })

  it('generates correct flashcards key', () => {
    expect(userKeys.flashcards()).toEqual(['user', 'flashcards', undefined])
    expect(userKeys.flashcards('mod1')).toEqual(['user', 'flashcards', 'mod1'])
  })
})

describe('useProgress', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = createTestQueryClient()
  })

  it('fetches all progress when no moduleId', async () => {
    const mockProgress = [
      { lesson_id: 'lesson-1', module_id: 'mod-1', completed: true },
    ]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ progress: mockProgress }),
    })

    const { result } = renderHook(() => useProgress(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetch).toHaveBeenCalledWith('/api/lessons/progress')
    expect(result.current.data).toEqual(mockProgress)
  })

  it('fetches module-specific progress when moduleId provided', async () => {
    const mockProgress = [
      { lesson_id: 'lesson-1', module_id: 'mod-1', completed: true },
    ]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ progress: mockProgress }),
    })

    const { result } = renderHook(() => useProgress('mod-1'), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetch).toHaveBeenCalledWith('/api/lessons/progress?moduleId=mod-1')
  })

  it('returns empty array when not logged in (401)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    })

    const { result } = renderHook(() => useProgress(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([])
  })
})

describe('useCompleteLesson', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = createTestQueryClient()
  })

  it('completes a lesson successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })

    const { result } = renderHook(() => useCompleteLesson(), {
      wrapper: createWrapper(queryClient),
    })

    result.current.mutate({
      lessonId: 'lesson-1',
      moduleId: 'mod-1',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetch).toHaveBeenCalledWith('/api/lessons/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonId: 'lesson-1',
        moduleId: 'mod-1',
        completed: true,
        quizScore: undefined,
        quizTotal: undefined,
      }),
    })
  })

  it('includes quiz score when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })

    const { result } = renderHook(() => useCompleteLesson(), {
      wrapper: createWrapper(queryClient),
    })

    result.current.mutate({
      lessonId: 'lesson-1',
      moduleId: 'mod-1',
      quizScore: 8,
      quizTotal: 10,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.quizScore).toBe(8)
    expect(callBody.quizTotal).toBe(10)
  })
})

describe('useStats', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = createTestQueryClient()
  })

  it('fetches user stats', async () => {
    const mockStats = {
      lessonsCompleted: 5,
      modulesCompleted: 2,
      quizCount: 3,
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ stats: mockStats }),
    })

    const { result } = renderHook(() => useStats(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetch).toHaveBeenCalledWith('/api/stats')
    expect(result.current.data).toEqual(mockStats)
  })

  it('returns null when not logged in', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    })

    const { result } = renderHook(() => useStats(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeNull()
  })
})

describe('useAchievements', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = createTestQueryClient()
  })

  it('fetches user achievements', async () => {
    const mockAchievements = [
      { achievement_id: 'first-lesson', unlocked_at: '2024-01-15T00:00:00Z' },
    ]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ achievements: mockAchievements }),
    })

    const { result } = renderHook(() => useAchievements(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetch).toHaveBeenCalledWith('/api/achievements')
    expect(result.current.data).toEqual(mockAchievements)
  })

  it('returns empty array when not logged in', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    })

    const { result } = renderHook(() => useAchievements(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([])
  })
})

describe('useStreaks', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = createTestQueryClient()
  })

  it('fetches user streaks', async () => {
    const mockStreaks = {
      current_streak: 5,
      longest_streak: 10,
      last_activity_date: '2024-01-15',
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockStreaks),
    })

    const { result } = renderHook(() => useStreaks(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetch).toHaveBeenCalledWith('/api/streaks')
    expect(result.current.data).toEqual(mockStreaks)
  })

  it('returns null when not logged in', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    })

    const { result } = renderHook(() => useStreaks(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeNull()
  })
})

describe('useLeaderboard', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = createTestQueryClient()
  })

  it('fetches leaderboard with default sort', async () => {
    const mockEntries = [
      { id: '1', display_name: 'User 1', total_score: 100 },
    ]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ entries: mockEntries }),
    })

    const { result } = renderHook(() => useLeaderboard(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetch).toHaveBeenCalledWith('/api/leaderboard?sortBy=total_score')
    expect(result.current.data).toEqual(mockEntries)
  })

  it('fetches leaderboard with custom sort', async () => {
    const mockEntries = [
      { id: '1', display_name: 'User 1', achievements_count: 10 },
    ]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ entries: mockEntries }),
    })

    const { result } = renderHook(() => useLeaderboard('achievements_count'), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetch).toHaveBeenCalledWith('/api/leaderboard?sortBy=achievements_count')
  })
})
