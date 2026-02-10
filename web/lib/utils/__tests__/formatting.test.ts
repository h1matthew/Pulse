import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatTime, formatTimeAgo, formatAccuracy, truncate } from '../formatting'

describe('formatTime', () => {
  it('returns "0s" for null', () => {
    expect(formatTime(null)).toBe('0s')
  })

  it('returns "0s" for 0', () => {
    expect(formatTime(0)).toBe('0s')
  })

  it('formats seconds for values under 60', () => {
    expect(formatTime(30)).toBe('30s')
    expect(formatTime(59)).toBe('59s')
  })

  it('formats minutes and seconds', () => {
    expect(formatTime(60)).toBe('1m')
    expect(formatTime(90)).toBe('1m 30s')
    expect(formatTime(120)).toBe('2m')
    expect(formatTime(125)).toBe('2m 5s')
  })

  it('formats hours and minutes', () => {
    expect(formatTime(3600)).toBe('1h')
    expect(formatTime(3660)).toBe('1h 1m')
    expect(formatTime(5400)).toBe('1h 30m')
    expect(formatTime(7200)).toBe('2h')
  })

  it('omits seconds when hours are present', () => {
    expect(formatTime(3661)).toBe('1h 1m') // 1h 1m 1s -> 1h 1m
    expect(formatTime(7320)).toBe('2h 2m') // 2h 2m 0s -> 2h 2m
  })

  it('handles edge cases', () => {
    expect(formatTime(1)).toBe('1s')
    expect(formatTime(59)).toBe('59s')
    expect(formatTime(61)).toBe('1m 1s')
    expect(formatTime(3599)).toBe('59m 59s')
  })
})

describe('formatTimeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "Unknown" for null', () => {
    expect(formatTimeAgo(null)).toBe('Unknown')
  })

  it('returns "Just now" for future dates', () => {
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    const futureDate = '2024-01-15T12:01:00Z'
    expect(formatTimeAgo(futureDate)).toBe('Just now')
  })

  it('returns "Just now" for less than a minute ago', () => {
    vi.setSystemTime(new Date('2024-01-15T12:00:30Z'))
    const date = '2024-01-15T12:00:00Z'
    expect(formatTimeAgo(date)).toBe('Just now')
  })

  it('returns minutes ago for 1-59 minutes', () => {
    vi.setSystemTime(new Date('2024-01-15T12:05:00Z'))
    const date = '2024-01-15T12:00:00Z'
    expect(formatTimeAgo(date)).toBe('5m ago')
  })

  it('returns hours ago for 1-23 hours', () => {
    vi.setSystemTime(new Date('2024-01-15T15:00:00Z'))
    const date = '2024-01-15T12:00:00Z'
    expect(formatTimeAgo(date)).toBe('3h ago')
  })

  it('returns days ago for 1-6 days', () => {
    vi.setSystemTime(new Date('2024-01-18T12:00:00Z'))
    const date = '2024-01-15T12:00:00Z'
    expect(formatTimeAgo(date)).toBe('3d ago')
  })

  it('returns formatted date for 7+ days', () => {
    vi.setSystemTime(new Date('2024-01-30T12:00:00Z'))
    const date = '2024-01-15T12:00:00Z'
    const result = formatTimeAgo(date)
    expect(result).toMatch(/Jan 15/)
  })

  it('handles edge case of exactly 1 minute ago', () => {
    vi.setSystemTime(new Date('2024-01-15T12:01:00Z'))
    const date = '2024-01-15T12:00:00Z'
    expect(formatTimeAgo(date)).toBe('1m ago')
  })

  it('handles edge case of exactly 1 hour ago', () => {
    vi.setSystemTime(new Date('2024-01-15T13:00:00Z'))
    const date = '2024-01-15T12:00:00Z'
    expect(formatTimeAgo(date)).toBe('1h ago')
  })

  it('handles edge case of exactly 1 day ago', () => {
    vi.setSystemTime(new Date('2024-01-16T12:00:00Z'))
    const date = '2024-01-15T12:00:00Z'
    expect(formatTimeAgo(date)).toBe('1d ago')
  })
})

describe('formatAccuracy', () => {
  it('returns "0%" for null', () => {
    expect(formatAccuracy(null)).toBe('0%')
  })

  it('returns "0%" for undefined', () => {
    expect(formatAccuracy(undefined as unknown as number)).toBe('0%')
  })

  it('formats whole numbers', () => {
    expect(formatAccuracy(100)).toBe('100%')
    expect(formatAccuracy(50)).toBe('50%')
    expect(formatAccuracy(0)).toBe('0%')
  })

  it('rounds decimal values', () => {
    expect(formatAccuracy(85.4)).toBe('85%')
    expect(formatAccuracy(85.5)).toBe('86%')
    expect(formatAccuracy(85.9)).toBe('86%')
  })

  it('handles edge cases', () => {
    expect(formatAccuracy(0.1)).toBe('0%')
    expect(formatAccuracy(0.5)).toBe('1%')
    expect(formatAccuracy(99.9)).toBe('100%')
  })
})

describe('truncate', () => {
  it('returns text unchanged if shorter than max length', () => {
    expect(truncate('Hello', 10)).toBe('Hello')
    expect(truncate('Hello', 5)).toBe('Hello')
  })

  it('truncates text longer than max length', () => {
    expect(truncate('Hello World', 5)).toBe('Hello...')
    expect(truncate('This is a long sentence', 10)).toBe('This is a...')
  })

  it('trims whitespace before adding ellipsis', () => {
    expect(truncate('Hello   World', 6)).toBe('Hello...')
  })

  it('handles empty string', () => {
    expect(truncate('', 10)).toBe('')
    expect(truncate('', 0)).toBe('')
  })

  it('handles max length of 0', () => {
    expect(truncate('Hello', 0)).toBe('...')
  })

  it('handles single character max length', () => {
    expect(truncate('Hello', 1)).toBe('H...')
  })

  it('handles text exactly at max length', () => {
    expect(truncate('Hello', 5)).toBe('Hello')
  })

  it('handles unicode characters', () => {
    expect(truncate('你好世界', 2)).toBe('你好...')
    // Note: Emoji characters may use surrogate pairs in JavaScript strings
    // So '🚀' may be counted as 2 characters in .length
    expect(truncate('🚀🌍🌙⭐', 4)).toBe('🚀🌍...')
  })
})
