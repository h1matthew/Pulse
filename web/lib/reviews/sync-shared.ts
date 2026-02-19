/**
 * External Review Sync - Shared Utilities (Client-Safe)
 *
 * These are pure functions that can be used in both Client and Server Components.
 * No server-only imports allowed here!
 */

// Minimum time between syncs (24 hours)
export const SYNC_COOLDOWN_HOURS = 24

export interface SyncResult {
  synced: number
  skipped: boolean
  error?: string
  googleRating?: number
  googleReviewCount?: number
}

/**
 * Check if a business should have its reviews synced
 * based on last sync time and place_id availability
 */
export function shouldSyncReviews(business: {
  place_id: string | null
  last_synced_at: string | null
}): boolean {
  if (!business.place_id) return false
  if (!business.last_synced_at) return true

  const hoursSinceSync =
    (Date.now() - new Date(business.last_synced_at).getTime()) /
    (1000 * 60 * 60)

  return hoursSinceSync >= SYNC_COOLDOWN_HOURS
}

/**
 * Get sync status for a business
 */
export function getSyncStatus(business: {
  last_synced_at: string | null
  sync_status: string
}): {
  canSync: boolean
  lastSyncedText: string
  isStale: boolean
} {
  if (!business.last_synced_at) {
    return {
      canSync: true,
      lastSyncedText: 'Never synced',
      isStale: true,
    }
  }

  const lastSync = new Date(business.last_synced_at)
  const hoursSinceSync =
    (Date.now() - lastSync.getTime()) / (1000 * 60 * 60)

  let lastSyncedText: string
  if (hoursSinceSync < 1) {
    const minutes = Math.floor(hoursSinceSync * 60)
    if (minutes <= 0) {
      lastSyncedText = 'Synced just now'
    } else {
      lastSyncedText = `Last synced ${minutes} minute${minutes !== 1 ? 's' : ''} ago`
    }
  } else if (hoursSinceSync < 24) {
    const hours = Math.floor(hoursSinceSync)
    lastSyncedText = `Last synced ${hours} hour${hours !== 1 ? 's' : ''} ago`
  } else {
    const days = Math.floor(hoursSinceSync / 24)
    lastSyncedText = `Last synced ${days} day${days !== 1 ? 's' : ''} ago`
  }

  return {
    canSync: hoursSinceSync >= SYNC_COOLDOWN_HOURS,
    lastSyncedText,
    isStale: hoursSinceSync >= SYNC_COOLDOWN_HOURS,
  }
}
