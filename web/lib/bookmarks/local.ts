/**
 * ============================================================================
 * LIB: Local (Guest) Bookmarks
 * ============================================================================
 *
 * localStorage-backed bookmark store for signed-out users. Guests can save
 * businesses on-device; when they sign in, the auth-aware hooks in
 * `@/hooks/useBookmarks` switch over to the server-backed store.
 *
 * GUARANTEES:
 *   - SSR-safe: every function guards on `typeof window` and returns a
 *     sensible default ([] / false / no-op) on the server
 *   - Never throws: all storage access and JSON parsing is try/catch-wrapped
 *     (private browsing, quota exceeded, corrupted payloads, etc.)
 *   - Deduped: the persisted value is always a deduped string[] of business ids
 *   - Defensive reads: non-array payloads and non-string entries are discarded
 * ============================================================================
 */

export const LOCAL_BOOKMARKS_STORAGE_KEY = 'pulse-local-bookmarks'

/** Read + sanitize the persisted id list. Returns [] on SSR or any failure. */
function readStore(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LOCAL_BOOKMARKS_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return Array.from(
      new Set(parsed.filter((entry): entry is string => typeof entry === 'string'))
    )
  } catch {
    return []
  }
}

/** Persist a deduped id list. No-op on SSR or storage failure. */
function writeStore(ids: string[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      LOCAL_BOOKMARKS_STORAGE_KEY,
      JSON.stringify(Array.from(new Set(ids)))
    )
  } catch {
    // Quota exceeded or storage unavailable — fail silently, never throw
  }
}

/** All locally bookmarked business ids (deduped). [] on SSR/failure. */
export function getLocalBookmarkIds(): string[] {
  return readStore()
}

/** Whether a business id is bookmarked on this device. */
export function isLocallyBookmarked(id: string): boolean {
  return readStore().includes(id)
}

/**
 * Toggle a business id in the local store.
 * Returns the resulting state: { bookmarked: true } if it was added,
 * { bookmarked: false } if it was removed.
 */
export function toggleLocalBookmark(id: string): { bookmarked: boolean } {
  const ids = readStore()
  if (ids.includes(id)) {
    writeStore(ids.filter((existing) => existing !== id))
    return { bookmarked: false }
  }
  writeStore([...ids, id])
  return { bookmarked: true }
}

/** Remove all local bookmarks (e.g. after a sign-in merge). */
export function clearLocalBookmarks(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(LOCAL_BOOKMARKS_STORAGE_KEY)
  } catch {
    // no-op
  }
}
