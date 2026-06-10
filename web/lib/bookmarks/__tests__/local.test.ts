/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  LOCAL_BOOKMARKS_STORAGE_KEY,
  getLocalBookmarkIds,
  isLocallyBookmarked,
  toggleLocalBookmark,
  clearLocalBookmarks,
} from '../local'

describe('local bookmarks store', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('exports the contract storage key', () => {
    expect(LOCAL_BOOKMARKS_STORAGE_KEY).toBe('pulse-local-bookmarks')
  })

  it('returns [] when nothing is stored', () => {
    expect(getLocalBookmarkIds()).toEqual([])
    expect(isLocallyBookmarked('biz-1')).toBe(false)
  })

  it('toggles a bookmark on and off (round-trip)', () => {
    expect(toggleLocalBookmark('biz-1')).toEqual({ bookmarked: true })
    expect(getLocalBookmarkIds()).toEqual(['biz-1'])
    expect(isLocallyBookmarked('biz-1')).toBe(true)

    expect(toggleLocalBookmark('biz-1')).toEqual({ bookmarked: false })
    expect(getLocalBookmarkIds()).toEqual([])
    expect(isLocallyBookmarked('biz-1')).toBe(false)
  })

  it('persists across calls via localStorage', () => {
    toggleLocalBookmark('biz-a')
    toggleLocalBookmark('biz-b')

    const raw = window.localStorage.getItem(LOCAL_BOOKMARKS_STORAGE_KEY)
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw as string)).toEqual(['biz-a', 'biz-b'])
    expect(getLocalBookmarkIds()).toEqual(['biz-a', 'biz-b'])
  })

  it('dedupes ids stored in localStorage', () => {
    window.localStorage.setItem(
      LOCAL_BOOKMARKS_STORAGE_KEY,
      JSON.stringify(['biz-a', 'biz-a', 'biz-b', 'biz-a'])
    )
    expect(getLocalBookmarkIds()).toEqual(['biz-a', 'biz-b'])

    // Toggling an already-duplicated id off removes every copy
    toggleLocalBookmark('biz-a')
    expect(getLocalBookmarkIds()).toEqual(['biz-b'])
  })

  it('returns [] for garbage JSON in storage', () => {
    window.localStorage.setItem(LOCAL_BOOKMARKS_STORAGE_KEY, '{not-valid-json[[')
    expect(() => getLocalBookmarkIds()).not.toThrow()
    expect(getLocalBookmarkIds()).toEqual([])
  })

  it('returns [] for valid JSON that is not an array', () => {
    window.localStorage.setItem(LOCAL_BOOKMARKS_STORAGE_KEY, JSON.stringify({ ids: ['biz-1'] }))
    expect(getLocalBookmarkIds()).toEqual([])
  })

  it('filters out non-string entries', () => {
    window.localStorage.setItem(
      LOCAL_BOOKMARKS_STORAGE_KEY,
      JSON.stringify(['biz-a', 42, null, { id: 'biz-x' }, undefined, 'biz-b', false])
    )
    expect(getLocalBookmarkIds()).toEqual(['biz-a', 'biz-b'])
  })

  it('clearLocalBookmarks removes the storage key', () => {
    toggleLocalBookmark('biz-a')
    clearLocalBookmarks()
    expect(window.localStorage.getItem(LOCAL_BOOKMARKS_STORAGE_KEY)).toBeNull()
    expect(getLocalBookmarkIds()).toEqual([])
  })

  it('never throws when setItem throws (quota exceeded / private mode)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => toggleLocalBookmark('biz-1')).not.toThrow()
    expect(toggleLocalBookmark('biz-1')).toEqual({ bookmarked: true })
  })

  it('never throws when getItem throws (storage access denied)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(getLocalBookmarkIds()).toEqual([])
    expect(isLocallyBookmarked('biz-1')).toBe(false)
    expect(() => toggleLocalBookmark('biz-1')).not.toThrow()
  })

  it('never throws when removeItem throws', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(() => clearLocalBookmarks()).not.toThrow()
  })

  it('is SSR-safe: returns defaults and no-ops when window is undefined', () => {
    vi.stubGlobal('window', undefined)
    expect(getLocalBookmarkIds()).toEqual([])
    expect(isLocallyBookmarked('biz-1')).toBe(false)
    expect(() => toggleLocalBookmark('biz-1')).not.toThrow()
    expect(() => clearLocalBookmarks()).not.toThrow()
  })
})
