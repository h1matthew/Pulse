#!/usr/bin/env tsx
/**
 * Flag businesses as SBA-certified from an SBA certifications CSV export.
 *
 * Producing the CSV (https://search.certifications.sba.gov/):
 *   1. Go to search.certifications.sba.gov and search by location
 *      (e.g. city "Diamond Bar", state "CA") and/or certification type.
 *   2. Export/download the search results as CSV.
 *   3. Run the import:
 *        cd web && npx tsx supabase/scripts/import-sba-csv.ts sba-results.csv
 *
 * Usage:
 *   npx tsx supabase/scripts/import-sba-csv.ts <file.csv>
 *
 * Behavior:
 *   - Matches SBA rows against existing businesses by normalized name
 *     (lowercase, punctuation collapsed), requiring the same state when
 *     both sides have one. If the exact normalized name has no match, a
 *     second lookup strips trailing legal suffixes (LLC, Inc, Corp, ...)
 *     from both sides, since SBA legal names carry them and Google Maps
 *     listing names usually do not.
 *   - Sets sba_certified = true on matches. Never sets it back to false,
 *     so re-running with a narrower export will not un-certify anyone.
 *   - Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in web/.env.
 */

import 'dotenv/config'
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import {
  parseSbaCsv,
  normalizeBusinessName,
} from '../../lib/business/import-parsers'

const PAGE_SIZE = 1000
const UPDATE_CHUNK_SIZE = 50

const STATE_ABBREVIATIONS: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR',
  california: 'CA', colorado: 'CO', connecticut: 'CT', delaware: 'DE',
  florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID', illinois: 'IL',
  indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA',
  maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI',
  minnesota: 'MN', mississippi: 'MS', missouri: 'MO', montana: 'MT',
  nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC',
  'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR',
  pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT',
  vermont: 'VT', virginia: 'VA', washington: 'WA', 'west virginia': 'WV',
  wisconsin: 'WI', wyoming: 'WY', 'district of columbia': 'DC',
  'puerto rico': 'PR',
}

function normalizeState(state: string | null | undefined): string | null {
  if (!state) return null
  const trimmed = state.trim()
  if (trimmed.length === 0) return null
  if (trimmed.length === 2) return trimmed.toUpperCase()
  return STATE_ABBREVIATIONS[trimmed.toLowerCase()] ?? trimmed.toUpperCase()
}

interface BusinessRecord {
  id: string
  name: string
  city: string | null
  state: string | null
}

const LEGAL_SUFFIX_PATTERN =
  /\s+(?:llc|l l c|inc|incorporated|corp|corporation|co|company|ltd|limited|llp|pllc|p c|pc)$/

/**
 * Strip trailing legal-entity suffixes from an already-normalized name
 * ("acme plumbing l l c" -> "acme plumbing"). Applied repeatedly so
 * "acme plumbing co inc" also reduces to "acme plumbing".
 */
function stripLegalSuffixes(normalizedName: string): string {
  let current = normalizedName
  for (;;) {
    const next = current.replace(LEGAL_SUFFIX_PATTERN, '').trim()
    if (next === current || next.length === 0) return current
    current = next
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

async function main() {
  const file = process.argv[2]
  if (!file) {
    console.error('Usage: npx tsx supabase/scripts/import-sba-csv.ts <file.csv>')
    process.exit(1)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !supabaseSecretKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY (set them in web/.env)')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let csv: string
  try {
    csv = readFileSync(file, 'utf-8')
  } catch (error) {
    console.error(`Could not read "${file}":`, error instanceof Error ? error.message : error)
    process.exit(1)
  }

  const sbaRows = parseSbaCsv(csv)
  if (sbaRows.length === 0) {
    console.log('No usable rows found in SBA CSV. Nothing to do.')
    return
  }
  console.log(`Parsed ${sbaRows.length} SBA-certified rows from ${file}`)

  // Fetch all businesses (paged to be safe with larger datasets).
  const businesses: BusinessRecord[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('businesses')
      .select('id, name, city, state')
      .range(from, from + PAGE_SIZE - 1)
    if (error) {
      console.error('Failed to load businesses:', error.message)
      process.exit(1)
    }
    businesses.push(...((data ?? []) as BusinessRecord[]))
    if (!data || data.length < PAGE_SIZE) break
  }
  console.log(`Loaded ${businesses.length} businesses from database`)

  // Index businesses by normalized name (a name can appear more than once),
  // plus a fallback index with legal suffixes stripped.
  const businessesByName = new Map<string, BusinessRecord[]>()
  const businessesByStrippedName = new Map<string, BusinessRecord[]>()
  const addToIndex = (index: Map<string, BusinessRecord[]>, key: string, business: BusinessRecord) => {
    const bucket = index.get(key)
    if (bucket) bucket.push(business)
    else index.set(key, [business])
  }
  for (const business of businesses) {
    const key = normalizeBusinessName(business.name)
    if (!key) continue
    addToIndex(businessesByName, key, business)
    addToIndex(businessesByStrippedName, stripLegalSuffixes(key), business)
  }

  const matchedIds = new Set<string>()
  const matchedNames: string[] = []
  const unmatchedNames: string[] = []

  for (const sbaRow of sbaRows) {
    const key = normalizeBusinessName(sbaRow.name)
    const candidates =
      businessesByName.get(key) ??
      businessesByStrippedName.get(stripLegalSuffixes(key)) ??
      []
    const sbaState = normalizeState(sbaRow.state)

    const matches = candidates.filter((candidate) => {
      const businessState = normalizeState(candidate.state)
      // Require same state only when both sides have one.
      if (sbaState && businessState && sbaState !== businessState) return false
      return true
    })

    if (matches.length > 0) {
      for (const match of matches) {
        if (!matchedIds.has(match.id)) {
          matchedIds.add(match.id)
          matchedNames.push(`${match.name}${match.city ? ` (${match.city})` : ''}`)
        }
      }
    } else {
      unmatchedNames.push(sbaRow.name)
    }
  }

  // Set sba_certified = true on matches only; never un-certify.
  let updated = 0
  for (const idBatch of chunk([...matchedIds], UPDATE_CHUNK_SIZE)) {
    const { error } = await supabase
      .from('businesses')
      .update({ sba_certified: true })
      .in('id', idBatch)
    if (error) {
      console.error(`Update batch failed (${idBatch.length} ids):`, error.message)
      process.exit(1)
    }
    updated += idBatch.length
  }

  console.log('')
  console.log('SBA import summary')
  console.log('------------------')
  console.log(`SBA rows parsed:        ${sbaRows.length}`)
  console.log(`Matched businesses:     ${matchedIds.size}`)
  console.log(`Unmatched SBA rows:     ${unmatchedNames.length}`)
  console.log(`Flagged sba_certified:  ${updated}`)

  if (matchedNames.length > 0) {
    console.log('')
    console.log('Matched businesses:')
    for (const name of matchedNames) console.log(`  - ${name}`)
  }
  if (unmatchedNames.length > 0) {
    console.log('')
    console.log('Unmatched SBA rows (no business with that name):')
    for (const name of unmatchedNames) console.log(`  - ${name}`)
  }
}

main().catch((error) => {
  console.error('Import failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
