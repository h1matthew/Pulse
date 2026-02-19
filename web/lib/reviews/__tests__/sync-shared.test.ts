import { describe, it, expect } from 'vitest'
import {
  shouldSyncReviews,
  getSyncStatus,
  type SyncResult,
} from '../sync-shared'

describe('Review Sync Utilities', () => {
  describe('shouldSyncReviews', () => {
    it('returns false when business has no place_id', () => {
      const business = {
        place_id: null,
        last_synced_at: null,
      }
      expect(shouldSyncReviews(business)).toBe(false)
    })

    it('returns true when business has place_id but never synced', () => {
      const business = {
        place_id: 'ChIJ123',
        last_synced_at: null,
      }
      expect(shouldSyncReviews(business)).toBe(true)
    })

    it('returns true when last sync was more than 24 hours ago', () => {
      const thirtyHoursAgo = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString()
      const business = {
        place_id: 'ChIJ123',
        last_synced_at: thirtyHoursAgo,
      }
      expect(shouldSyncReviews(business)).toBe(true)
    })

    it('returns false when last sync was less than 24 hours ago', () => {
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
      const business = {
        place_id: 'ChIJ123',
        last_synced_at: twelveHoursAgo,
      }
      expect(shouldSyncReviews(business)).toBe(false)
    })

    it('returns false when last sync was exactly 24 hours ago', () => {
      const exactly24HoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const business = {
        place_id: 'ChIJ123',
        last_synced_at: exactly24HoursAgo,
      }
      expect(shouldSyncReviews(business)).toBe(true)
    })
  })

  describe('getSyncStatus', () => {
    it('returns correct status for never synced business', () => {
      const business = {
        last_synced_at: null,
        sync_status: 'active',
      }
      const status = getSyncStatus(business)
      expect(status.canSync).toBe(true)
      expect(status.lastSyncedText).toBe('Never synced')
      expect(status.isStale).toBe(true)
    })

    it('returns correct status for recently synced business', () => {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      const business = {
        last_synced_at: thirtyMinutesAgo,
        sync_status: 'active',
      }
      const status = getSyncStatus(business)
      expect(status.canSync).toBe(false)
      expect(status.lastSyncedText).toBe('Last synced 30 minutes ago')
      expect(status.isStale).toBe(false)
    })

    it('returns correct status for business synced hours ago', () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
      const business = {
        last_synced_at: fiveHoursAgo,
        sync_status: 'active',
      }
      const status = getSyncStatus(business)
      expect(status.canSync).toBe(false)
      expect(status.lastSyncedText).toBe('Last synced 5 hours ago')
      expect(status.isStale).toBe(false)
    })

    it('returns correct status for business synced days ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      const business = {
        last_synced_at: threeDaysAgo,
        sync_status: 'stale',
      }
      const status = getSyncStatus(business)
      expect(status.canSync).toBe(true)
      expect(status.lastSyncedText).toBe('Last synced 3 days ago')
      expect(status.isStale).toBe(true)
    })

    it('handles single minute correctly', () => {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
      const business = {
        last_synced_at: oneMinuteAgo,
        sync_status: 'active',
      }
      const status = getSyncStatus(business)
      expect(status.lastSyncedText).toBe('Last synced 1 minute ago')
    })

    it('shows synced just now for very recent sync', () => {
      const tenSecondsAgo = new Date(Date.now() - 10 * 1000).toISOString()
      const business = {
        last_synced_at: tenSecondsAgo,
        sync_status: 'active',
      }
      const status = getSyncStatus(business)
      expect(status.lastSyncedText).toBe('Synced just now')
    })

    it('handles single hour correctly', () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const business = {
        last_synced_at: oneHourAgo,
        sync_status: 'active',
      }
      const status = getSyncStatus(business)
      expect(status.lastSyncedText).toBe('Last synced 1 hour ago')
    })

    it('handles single day correctly', () => {
      const oneDayAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
      const business = {
        last_synced_at: oneDayAgo,
        sync_status: 'stale',
      }
      const status = getSyncStatus(business)
      expect(status.lastSyncedText).toBe('Last synced 1 day ago')
    })
  })

  describe('SyncResult type', () => {
    it('accepts valid sync result with reviews', () => {
      const result: SyncResult = {
        synced: 5,
        skipped: false,
        googleRating: 4.5,
        googleReviewCount: 127,
      }
      expect(result.synced).toBe(5)
      expect(result.skipped).toBe(false)
    })

    it('accepts valid skipped result', () => {
      const result: SyncResult = {
        synced: 0,
        skipped: true,
        error: 'API key not configured',
      }
      expect(result.synced).toBe(0)
      expect(result.skipped).toBe(true)
      expect(result.error).toBe('API key not configured')
    })

    it('accepts result with no reviews found', () => {
      const result: SyncResult = {
        synced: 0,
        skipped: false,
        googleRating: 0,
        googleReviewCount: 0,
      }
      expect(result.synced).toBe(0)
      expect(result.skipped).toBe(false)
    })
  })
})
