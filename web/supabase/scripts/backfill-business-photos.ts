#!/usr/bin/env tsx
/**
 * Backfill Business Photos (nearest-neighbor borrow)
 *
 * Pulse renders a "base poster" gradient fallback for any business whose
 * `photos` array has no usable reference. This script gives those businesses
 * a real image using ONLY data already cached in Supabase — no Google API
 * key required. For each photo-less business it finds the geographically
 * nearest business that already has a usable photo and copies that donor's
 * first photo entry into the recipient's `photos` column.
 *
 * The copied references resolve through the same /api/businesses/photo proxy
 * the rest of the app uses, so no image bytes are duplicated.
 *
 * Usage:
 *   npm run db:backfill-photos                # backfill all photo-less businesses
 *   npm run db:backfill-photos -- --limit 50  # only first N recipients
 *   npm run db:backfill-photos -- --dry-run   # report only, no writes
 *
 * Requires in web/.env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY
 */

import 'dotenv/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ============================================================================
// Photo reference helpers (exported for unit testing)
// ============================================================================

/** A stored photos entry is either a raw string or { photo_reference, ... }. */
export type PhotoEntry = string | { photo_reference?: string | null } | null | undefined

/** Return the usable reference string inside an entry, or null. */
export function entryToReference(entry: unknown): string | null {
  if (typeof entry === 'string') return entry.trim() ? entry : null
  if (entry && typeof entry === 'object') {
    const ref = (entry as { photo_reference?: string | null }).photo_reference
    if (typeof ref === 'string' && ref.trim()) return ref
  }
  return null
}

/** The first entry with a usable reference, or null. */
export function firstUsablePhoto(photos: unknown): PhotoEntry {
  if (!Array.isArray(photos)) return null
  for (const p of photos) if (entryToReference(p)) return p as PhotoEntry
  return null
}

/** True when a business would render the gradient placeholder today. */
export function hasNoUsablePhotos(photos: unknown): boolean {
  if (!Array.isArray(photos) || photos.length === 0) return true
  return photos.every((p) => entryToReference(p) === null)
}

/** Squared euclidean distance between two lat/lng points (good enough for
 *  nearest-neighbor ranking — no haversine needed for relative ordering). */
export function squaredDistance(
  aLat: number, aLng: number,
  bLat: number, bLng: number
): number {
  const dLat = aLat - bLat
  const dLng = aLng - bLng
  return dLat * dLat + dLng * dLng
}

// ============================================================================
// DB row shape
// ============================================================================

interface BusinessRow {
  id: string
  name: string
  place_id: string | null
  latitude: number | null
  longitude: number | null
  photos: unknown
}

// ============================================================================
// Loading
// ============================================================================

async function loadAll(
  supabase: SupabaseClient
): Promise<BusinessRow[]> {
  const all: BusinessRow[] = []
  const PAGE = 1000
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('businesses')
      .select('id,name,place_id,latitude,longitude,photos')
      .range(offset, offset + PAGE - 1)
    if (error) throw new Error(`Failed to load businesses: ${error.message}`)
    if (!data || data.length === 0) break
    all.push(...(data as BusinessRow[]))
    if (data.length < PAGE) break
    offset += PAGE
  }
  return all
}

// ============================================================================
// Main
// ============================================================================

function parseArgs() {
  const args = process.argv.slice(2)
  const getFlag = (name: string): string | undefined => {
    const i = args.indexOf(`--${name}`)
    return i >= 0 ? args[i + 1] : undefined
  }
  return {
    limit: Number(getFlag('limit')) || 0,
    dryRun: args.includes('--dry-run'),
  }
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in web/.env')
    process.exit(1)
  }

  const { limit, dryRun } = parseArgs()
  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('Loading businesses…')
  const rows = await loadAll(supabase)
  console.log(`Loaded ${rows.length} businesses`)

  const donors: BusinessRow[] = []
  const recipients: BusinessRow[] = []
  for (const r of rows) {
    if (hasNoUsablePhotos(r.photos)) recipients.push(r)
    else donors.push(r)
  }
  console.log(`Donors (have photo): ${donors.length}`)
  console.log(`Recipients (no photo): ${recipients.length}`)

  if (donors.length === 0) {
    console.error('❌ No donor photos available — nothing to do.')
    process.exit(1)
  }
  if (recipients.length === 0) {
    console.log('Every business already has a photo. Nothing to do.')
    return
  }

  const work = limit > 0 ? recipients.slice(0, limit) : recipients
  console.log(`Processing ${work.length} recipients${dryRun ? ' (DRY RUN)' : ''}`)

  // 1. Resolve nearest donor for every recipient in-memory (no DB calls).
  type Match = { row: BusinessRow; donor: BusinessRow; photo: PhotoEntry }
  const matches: Match[] = []
  let noCoords = 0
  for (const r of work) {
    if (r.latitude == null || r.longitude == null) {
      noCoords++
      continue
    }
    let best: BusinessRow | null = null
    let bestDist = Infinity
    for (const d of donors) {
      if (d.latitude == null || d.longitude == null) continue
      const dist = squaredDistance(r.latitude, r.longitude, d.latitude, d.longitude)
      if (dist < bestDist) {
        bestDist = dist
        best = d
      }
    }
    if (!best) continue
    const photo = firstUsablePhoto(best.photos)
    if (!photo) continue
    matches.push({ row: r, donor: best, photo })
  }
  console.log(`Matched ${matches.length} recipients (${noCoords} had no coordinates)\n`)

  if (matches.length === 0) {
    console.log('Nothing to update.')
    return
  }

  if (dryRun) {
    for (const m of matches.slice(0, 10)) {
      console.log(`  [dry-run] ${m.row.name} ← ${m.donor.name}`)
    }
    if (matches.length > 10) console.log(`  … and ${matches.length - 10} more`)
    console.log(`\n[dry-run] Would update ${matches.length} businesses.`)
    return
  }

  // 2. Apply updates with bounded concurrency (single round of calls).
  let updated = 0
  let failed = 0
  await mapWithConcurrency(matches, 16, async (m) => {
    const { error } = await supabase
      .from('businesses')
      .update({ photos: [m.photo] })
      .eq('id', m.row.id)
    if (error) {
      failed++
      console.error(`  ⚠️  ${m.row.name}: ${error.message}`)
      return
    }
    updated++
  })

  console.log(`\nDone. Updated: ${updated}, failed: ${failed}, skipped (no coords): ${noCoords}.`)
}

/** Run async tasks with bounded concurrency. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i])
    }
  })
  await Promise.all(workers)
  return results
}

// Run only when executed directly (not when imported by tests).
if (require.main === module) {
  main().catch((err) => {
    console.error('❌ Backfill failed:', err)
    process.exit(1)
  })
}
