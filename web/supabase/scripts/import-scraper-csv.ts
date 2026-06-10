#!/usr/bin/env tsx
/**
 * Import gosom/google-maps-scraper CSV output into the businesses table.
 *
 * Producing the CSV (https://github.com/gosom/google-maps-scraper):
 *   1. Create a queries file, one search per line, e.g.:
 *        echo "coffee shops in Diamond Bar, CA" > queries.txt
 *        echo "restaurants in Walnut, CA"      >> queries.txt
 *   2. Run the scraper (binary or docker image):
 *        google-maps-scraper -input queries.txt -results results.csv -exit-on-inactivity 3m
 *   3. Import the results:
 *        cd web && npx tsx supabase/scripts/import-scraper-csv.ts results.csv
 *
 * Usage:
 *   npx tsx supabase/scripts/import-scraper-csv.ts <file.csv> [--category <slug>]
 *
 *   --category <slug>  Force every imported row into one of the six Pulse
 *                      category slugs (food-drink, retail, services,
 *                      health-wellness, arts-culture, entertainment) instead
 *                      of fuzzy-matching each row's scraped category.
 *
 * Behavior:
 *   - Upserts on place_id when present, otherwise on slug (name + city).
 *   - Sets data_source 'google', is_verified false, hours [], photos [],
 *     tags from the scraped category hint.
 *   - Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in web/.env.
 */

import 'dotenv/config'
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import {
  parseScraperCsv,
  matchCategorySlug,
  slugifyBusiness,
  type ScrapedBusinessRow,
} from '../../lib/business/import-parsers'

const KNOWN_CATEGORY_SLUGS = [
  'food-drink',
  'retail',
  'services',
  'health-wellness',
  'arts-culture',
  'entertainment',
]

const CHUNK_SIZE = 50

interface BusinessUpsertRow {
  name: string
  slug: string
  category_id: string | null
  address: string
  city: string
  state: string
  zip_code: string
  phone: string | null
  website: string | null
  latitude: number | null
  longitude: number | null
  average_rating: number | null
  review_count: number
  is_verified: boolean
  hours: string[]
  photos: string[]
  tags: string[]
  data_source: 'google'
  place_id?: string
}

function parseArgs(argv: string[]): { file: string; forcedCategory: string | null } {
  const args = argv.slice(2)
  let file: string | null = null
  let forcedCategory: string | null = null

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--category') {
      forcedCategory = args[i + 1] ?? null
      i++
    } else if (!file) {
      file = args[i]
    }
  }

  if (!file) {
    console.error('Usage: npx tsx supabase/scripts/import-scraper-csv.ts <file.csv> [--category <slug>]')
    process.exit(1)
  }
  if (forcedCategory && !KNOWN_CATEGORY_SLUGS.includes(forcedCategory)) {
    console.error(`Unknown category slug "${forcedCategory}". Expected one of: ${KNOWN_CATEGORY_SLUGS.join(', ')}`)
    process.exit(1)
  }
  return { file, forcedCategory }
}

function toTag(categoryHint: string): string {
  return categoryHint
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

async function main() {
  const { file, forcedCategory } = parseArgs(process.argv)

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

  const parsed = parseScraperCsv(csv)
  if (parsed.length === 0) {
    console.log('No usable rows found in CSV. Nothing to import.')
    return
  }
  console.log(`Parsed ${parsed.length} business rows from ${file}`)

  // Resolve category slugs -> ids from the database.
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('id, slug')
  if (categoriesError) {
    console.error('Failed to load categories:', categoriesError.message)
    process.exit(1)
  }
  const categoryIdBySlug = new Map<string, string>(
    (categories ?? []).map((c) => [c.slug as string, c.id as string])
  )

  let categorized = 0
  const buildRow = (row: ScrapedBusinessRow): BusinessUpsertRow => {
    const slug = forcedCategory ?? matchCategorySlug(row.categoryHint)
    const categoryId = slug ? categoryIdBySlug.get(slug) ?? null : null
    if (categoryId) categorized++

    const upsert: BusinessUpsertRow = {
      name: row.name,
      slug: slugifyBusiness(row.name, row.city),
      category_id: categoryId,
      address: row.address ?? '',
      city: row.city ?? '',
      state: row.state ?? '',
      zip_code: row.zip ?? '',
      phone: row.phone ?? null,
      website: row.website ?? null,
      latitude: row.latitude ?? null,
      longitude: row.longitude ?? null,
      average_rating: row.rating ?? null,
      review_count: row.reviewCount ?? 0,
      is_verified: false,
      hours: [],
      photos: [],
      tags: row.categoryHint ? [toTag(row.categoryHint)] : [],
      data_source: 'google',
    }
    if (row.placeId) upsert.place_id = row.placeId
    return upsert
  }

  // Split rows by upsert key and dedupe within each group (a single upsert
  // statement cannot touch the same conflict key twice).
  const byPlaceId = new Map<string, BusinessUpsertRow>()
  const bySlug = new Map<string, BusinessUpsertRow>()
  for (const row of parsed) {
    const upsert = buildRow(row)
    if (upsert.place_id) {
      byPlaceId.set(upsert.place_id, upsert)
    } else if (upsert.slug.length > 0) {
      bySlug.set(upsert.slug, upsert)
    }
  }

  let upserted = 0
  let failed = 0

  for (const batch of chunk([...byPlaceId.values()], CHUNK_SIZE)) {
    const { error } = await supabase
      .from('businesses')
      .upsert(batch, { onConflict: 'place_id' })
    if (error) {
      failed += batch.length
      console.error(`place_id batch failed (${batch.length} rows):`, error.message)
    } else {
      upserted += batch.length
    }
  }

  for (const batch of chunk([...bySlug.values()], CHUNK_SIZE)) {
    const { error } = await supabase
      .from('businesses')
      .upsert(batch, { onConflict: 'slug' })
    if (error) {
      failed += batch.length
      console.error(`slug batch failed (${batch.length} rows):`, error.message)
    } else {
      upserted += batch.length
    }
  }

  console.log('')
  console.log('Import summary')
  console.log('--------------')
  console.log(`Rows parsed:            ${parsed.length}`)
  console.log(`Upserted by place_id:   ${byPlaceId.size}`)
  console.log(`Upserted by slug:       ${bySlug.size}`)
  console.log(`Category matched:       ${categorized}${forcedCategory ? ` (forced: ${forcedCategory})` : ''}`)
  console.log(`Succeeded:              ${upserted}`)
  console.log(`Failed:                 ${failed}`)

  if (failed > 0) process.exit(1)
}

main().catch((error) => {
  console.error('Import failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
