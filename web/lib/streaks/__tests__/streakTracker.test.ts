import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getStreak, updateStreak } from '../streakTracker'
import type { SupabaseClient } from '@supabase/supabase-js'

// Helper to create mock Supabase client
function createMockSupabase(mockData: unknown = null, mockError: unknown = null) {
  const mockSelect = vi.fn(() => mockQueryBuilder)
  const mockEq = vi.fn(() => mockQueryBuilder)
  const mockSingle = vi.fn(() => Promise.resolve({ data: mockData, error: mockError }))
  const mockUpsert = vi.fn(() => Promise.resolve({ data: null, error: null }))

  const mockQueryBuilder = {
    select: mockSelect,
    eq: mockEq,
    single: mockSingle,
    upsert: mockUpsert,
  }

  const mockFrom = vi.fn(() => mockQueryBuilder)

  return {
    from: mockFrom,
    _mocks: {
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
      upsert: mockUpsert,
      from: mockFrom,
    },
  } as unknown as SupabaseClient & { _mocks: Record<string, ReturnType<typeof vi.fn>> }
}

// Helper to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

describe('getStreak', () => {
  const userId = 'test-user-id'

  it('returns streak data when user has existing streak', async () => {
    const today = formatDate(new Date())
    const mockData = {
      current_streak: 5,
      longest_streak: 10,
      last_activity_date: today,
    }
    const supabase = createMockSupabase(mockData)

    const result = await getStreak(userId, supabase)

    expect(result.currentStreak).toBe(5)
    expect(result.longestStreak).toBe(10)
    expect(result.lastActivityDate).toBe(today)
    expect(result.isActiveToday).toBe(true)
  })

  it('returns zero streak when user has no data', async () => {
    const supabase = createMockSupabase(null)

    const result = await getStreak(userId, supabase)

    expect(result.currentStreak).toBe(0)
    expect(result.longestStreak).toBe(0)
    expect(result.lastActivityDate).toBeNull()
    expect(result.isActiveToday).toBe(false)
  })

  it('sets isActiveToday to false when last activity was yesterday', async () => {
    const yesterday = formatDate(new Date(Date.now() - 86400000))
    const mockData = {
      current_streak: 3,
      longest_streak: 3,
      last_activity_date: yesterday,
    }
    const supabase = createMockSupabase(mockData)

    const result = await getStreak(userId, supabase)

    expect(result.isActiveToday).toBe(false)
    expect(result.lastActivityDate).toBe(yesterday)
  })

  it('queries the correct table with user ID', async () => {
    const supabase = createMockSupabase({ current_streak: 1, longest_streak: 1, last_activity_date: formatDate(new Date()) })

    await getStreak(userId, supabase)

    expect(supabase._mocks.from).toHaveBeenCalledWith('user_streaks')
    expect(supabase._mocks.eq).toHaveBeenCalledWith('user_id', userId)
  })
})

describe('updateStreak', () => {
  const userId = 'test-user-id'

  beforeEach(() => {
    // Reset date mocking if needed
    vi.useFakeTimers()
  })

  it('starts streak at 1 for first activity', async () => {
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    const supabase = createMockSupabase(null)

    const result = await updateStreak(userId, supabase)

    expect(result.currentStreak).toBe(1)
    // First activity sets both current and longest to 1 (currentStreak > longestStreak check)
    expect(result.longestStreak).toBe(1)
    expect(result.isNewStreak).toBe(true)
  })

  it('increments streak for consecutive day activity', async () => {
    const yesterday = '2024-01-14'
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))

    const mockData = {
      current_streak: 3,
      longest_streak: 5,
      last_activity_date: yesterday,
    }
    const supabase = createMockSupabase(mockData)

    const result = await updateStreak(userId, supabase)

    expect(result.currentStreak).toBe(4)
    expect(result.isNewStreak).toBe(true)
  })

  it('does not change streak if already active today', async () => {
    const today = '2024-01-15'
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))

    const mockData = {
      current_streak: 3,
      longest_streak: 5,
      last_activity_date: today,
    }
    const supabase = createMockSupabase(mockData)

    const result = await updateStreak(userId, supabase)

    expect(result.currentStreak).toBe(3)
    expect(result.longestStreak).toBe(5)
    expect(result.isNewStreak).toBe(false)
  })

  it('resets streak to 1 if streak is broken (more than 1 day gap)', async () => {
    const twoDaysAgo = '2024-01-13'
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))

    const mockData = {
      current_streak: 7,
      longest_streak: 10,
      last_activity_date: twoDaysAgo,
    }
    const supabase = createMockSupabase(mockData)

    const result = await updateStreak(userId, supabase)

    expect(result.currentStreak).toBe(1)
    expect(result.longestStreak).toBe(10) // Longest should be preserved
    expect(result.isNewStreak).toBe(true)
  })

  it('updates longest streak when current exceeds it', async () => {
    const yesterday = '2024-01-14'
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))

    const mockData = {
      current_streak: 5,
      longest_streak: 5,
      last_activity_date: yesterday,
    }
    const supabase = createMockSupabase(mockData)

    const result = await updateStreak(userId, supabase)

    expect(result.currentStreak).toBe(6)
    expect(result.longestStreak).toBe(6) // New record
  })

  it('keeps longest streak if current does not exceed it', async () => {
    const yesterday = '2024-01-14'
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))

    const mockData = {
      current_streak: 3,
      longest_streak: 10,
      last_activity_date: yesterday,
    }
    const supabase = createMockSupabase(mockData)

    const result = await updateStreak(userId, supabase)

    expect(result.currentStreak).toBe(4)
    expect(result.longestStreak).toBe(10) // Unchanged
  })

  it('upserts streak data with correct values', async () => {
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    const supabase = createMockSupabase(null)

    await updateStreak(userId, supabase)

    expect(supabase._mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: userId,
        current_streak: 1,
        last_activity_date: '2024-01-15',
      }),
      { onConflict: 'user_id' }
    )
  })
})
