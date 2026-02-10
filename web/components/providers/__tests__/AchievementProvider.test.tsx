/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { AchievementProvider, useAchievements } from '../AchievementProvider'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Test component to consume the achievement context
function TestConsumer() {
  const { checkAchievements, unlockedIds, toasts, dismissToast } = useAchievements()

  return (
    <div>
      <span data-testid="unlockedCount">{unlockedIds.size}</span>
      <span data-testid="toastCount">{toasts.length}</span>
      <button onClick={() => checkAchievements()} data-testid="checkBtn">
        Check
      </button>
      {toasts.map((toast) => (
        <div key={toast.id} data-testid={`toast-${toast.achievement.id}`}>
          {toast.achievement.name}
          <button onClick={() => dismissToast(toast.id)} data-testid={`dismiss-${toast.achievement.id}`}>
            Dismiss
          </button>
        </div>
      ))}
    </div>
  )
}

describe('AchievementProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders children', () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ achievements: [] }),
    })

    render(
      <AchievementProvider userId={null}>
        <div data-testid="child">Hello</div>
      </AchievementProvider>
    )

    expect(screen.getByTestId('child')).toHaveTextContent('Hello')
  })

  it('fetches unlocked achievements on mount', async () => {
    vi.useRealTimers() // Use real timers for this test

    const mockAchievements = [
      { achievement_id: 'first-lesson' },
      { achievement_id: 'quiz-master' },
    ]

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ achievements: mockAchievements }),
    })

    render(
      <AchievementProvider userId="user-123">
        <TestConsumer />
      </AchievementProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('unlockedCount').textContent).toBe('2')
    }, { timeout: 2000 })

    expect(mockFetch).toHaveBeenCalledWith('/api/achievements')

    vi.useFakeTimers() // Restore fake timers
  })

  it('does not fetch achievements when userId is null', async () => {
    render(
      <AchievementProvider userId={null}>
        <TestConsumer />
      </AchievementProvider>
    )

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    // Should not have called fetch for achievements
    expect(mockFetch).not.toHaveBeenCalledWith('/api/achievements')
  })

  it('provides checkAchievements function', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ achievements: [] }),
    })

    render(
      <AchievementProvider userId={null}>
        <TestConsumer />
      </AchievementProvider>
    )

    const checkBtn = screen.getByTestId('checkBtn')
    expect(checkBtn).toBeInTheDocument()
  })

  it('handles fetch error gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    render(
      <AchievementProvider userId="user-123">
        <TestConsumer />
      </AchievementProvider>
    )

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    // Should not crash, unlockedIds should be empty
    expect(screen.getByTestId('unlockedCount').textContent).toBe('0')
  })

  it('dismisses toast when dismissToast is called', async () => {
    // Initial fetch returns empty achievements
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ achievements: [] }),
      })
      // Stats fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ stats: { lessonsCompleted: 1 } }),
      })
      // Achievement unlock
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

    // Mock evaluateAchievements to return an achievement
    vi.mock('@/lib/achievements/achievementChecker', () => ({
      evaluateAchievements: () => [
        { id: 'first-lesson', name: 'First Lesson', icon: '🎓', description: 'Complete your first lesson' },
      ],
    }))

    render(
      <AchievementProvider userId="user-123">
        <TestConsumer />
      </AchievementProvider>
    )

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    // Initially no toasts
    expect(screen.getByTestId('toastCount').textContent).toBe('0')
  })
})

describe('useAchievements', () => {
  it('throws error when used outside AchievementProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestConsumer />)
    }).toThrow('useAchievements must be used within AchievementProvider')

    consoleSpy.mockRestore()
  })
})
