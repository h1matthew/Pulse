#!/usr/bin/env tsx
/**
 * Demo Deal Seeder
 *
 * Seeds realistic demo deals tied to real, top-rated businesses so the /deals
 * page has live content. Picks highly rated businesses (average_rating >= 4.3,
 * preferring independents over chains) across a mix of categories and inserts
 * ~12 plausible offers with valid date ranges starting today.
 *
 * IDEMPOTENT: every seeded row is tagged with the SEED_MARKER ('[demo-seed]')
 * in qr_code_url (the deals schema has no terms column, and description is
 * rendered verbatim in the UI, so the marker lives in a non-rendered column).
 * Existing rows carrying the marker are deleted before inserting, so reruns
 * never duplicate.
 *
 * Usage: npx tsx supabase/scripts/seed-deals.ts
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SECRET_KEY')
  console.error('\nSet them in web/.env (see Supabase Dashboard > Settings > API keys)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const SEED_MARKER = '[demo-seed]'
const MAX_BUSINESSES = 24
const MAX_DEALS = 12
const MIN_RATING = 4.3

interface BusinessRow {
  id: string
  name: string
  is_chain: boolean | null
  average_rating: number | null
  review_count: number | null
  category: { name: string; slug: string } | null
}

interface DealTemplate {
  title: string
  description: string
  deal_type: 'standard' | 'boost_mission' | 'flash' | 'loyalty'
  discount_type: 'percentage' | 'fixed_amount' | 'free_item' | 'bogo'
  discount_value: number | null
  minimum_purchase: number | null
  code: string
  usage_limit: number
  expiresInDays: number
}

/** Plausible generic offers per category slug. */
const TEMPLATES_BY_CATEGORY: Record<string, DealTemplate[]> = {
  'food-drink': [
    {
      title: '15% off your first visit',
      description: 'Mention Pulse at checkout and take 15% off your first order.',
      deal_type: 'standard',
      discount_type: 'percentage',
      discount_value: 15,
      minimum_purchase: null,
      code: 'PULSE15',
      usage_limit: 100,
      expiresInDays: 30,
    },
    {
      title: 'Lunch special: $5 off orders over $25',
      description: 'Save $5 on any weekday lunch order of $25 or more.',
      deal_type: 'standard',
      discount_type: 'fixed_amount',
      discount_value: 5,
      minimum_purchase: 25,
      code: 'LUNCH5',
      usage_limit: 75,
      expiresInDays: 21,
    },
    {
      title: 'Buy one drink, get one free',
      description: 'Order any drink and get a second of equal or lesser value free.',
      deal_type: 'flash',
      discount_type: 'bogo',
      discount_value: null,
      minimum_purchase: null,
      code: 'SIP2FOR1',
      usage_limit: 50,
      expiresInDays: 14,
    },
  ],
  retail: [
    {
      title: '10% off storewide',
      description: 'Take 10% off any in-store purchase, no minimum required.',
      deal_type: 'standard',
      discount_type: 'percentage',
      discount_value: 10,
      minimum_purchase: null,
      code: 'LOCAL10',
      usage_limit: 120,
      expiresInDays: 30,
    },
    {
      title: 'Free gift with purchases over $50',
      description: 'Receive a free surprise gift with any purchase of $50 or more.',
      deal_type: 'standard',
      discount_type: 'free_item',
      discount_value: null,
      minimum_purchase: 50,
      code: 'GIFT50',
      usage_limit: 40,
      expiresInDays: 21,
    },
  ],
  services: [
    {
      title: '20% off for first-time customers',
      description: 'First visit? Enjoy 20% off any single service.',
      deal_type: 'standard',
      discount_type: 'percentage',
      discount_value: 20,
      minimum_purchase: null,
      code: 'FIRST20',
      usage_limit: 60,
      expiresInDays: 30,
    },
    {
      title: '$10 off any service over $75',
      description: 'Book any service of $75 or more and save $10 instantly.',
      deal_type: 'standard',
      discount_type: 'fixed_amount',
      discount_value: 10,
      minimum_purchase: 75,
      code: 'SAVE10',
      usage_limit: 60,
      expiresInDays: 28,
    },
  ],
  'health-wellness': [
    {
      title: '15% off your first session',
      description: 'Book your first appointment and save 15% on any session.',
      deal_type: 'standard',
      discount_type: 'percentage',
      discount_value: 15,
      minimum_purchase: null,
      code: 'WELL15',
      usage_limit: 50,
      expiresInDays: 30,
    },
    {
      title: 'Bring a friend: buy one, get one free',
      description: 'Book one session and bring a friend along for free.',
      deal_type: 'flash',
      discount_type: 'bogo',
      discount_value: null,
      minimum_purchase: null,
      code: 'FRIEND2',
      usage_limit: 30,
      expiresInDays: 21,
    },
  ],
  'arts-culture': [
    {
      title: '10% off classes and memberships',
      description: 'Sign up for any class or membership and take 10% off.',
      deal_type: 'standard',
      discount_type: 'percentage',
      discount_value: 10,
      minimum_purchase: null,
      code: 'CREATE10',
      usage_limit: 80,
      expiresInDays: 30,
    },
    {
      title: 'Free print with any purchase over $30',
      description: 'Take home a free local-artist print with any purchase of $30 or more.',
      deal_type: 'standard',
      discount_type: 'free_item',
      discount_value: null,
      minimum_purchase: 30,
      code: 'ARTGIFT',
      usage_limit: 40,
      expiresInDays: 21,
    },
  ],
  entertainment: [
    {
      title: 'Weeknight special: $5 off your visit',
      description: 'Visit Monday through Thursday and take $5 off admission of $20 or more.',
      deal_type: 'standard',
      discount_type: 'fixed_amount',
      discount_value: 5,
      minimum_purchase: 20,
      code: 'PLAY5',
      usage_limit: 100,
      expiresInDays: 30,
    },
    {
      title: 'Two for one: buy one admission, get one free',
      description: 'Buy one admission and bring a guest in free this week.',
      deal_type: 'flash',
      discount_type: 'bogo',
      discount_value: null,
      minimum_purchase: null,
      code: 'TWOFER',
      usage_limit: 50,
      expiresInDays: 14,
    },
  ],
}

function dateDaysFromNow(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

/** Fetch top-rated businesses and pick a balanced mix of categories, preferring independents. */
async function selectBusinesses(): Promise<BusinessRow[]> {
  const { data, error } = await supabase
    .from('businesses')
    .select('id,name,is_chain,average_rating,review_count,category:categories(name,slug)')
    .gte('average_rating', MIN_RATING)
    .order('review_count', { ascending: false })
    .limit(100)

  if (error) throw new Error(`Failed to fetch businesses: ${error.message}`)

  const rows = (data ?? []) as unknown as BusinessRow[]
  // Prefer independents: chains sort to the back of each category bucket.
  const byCategory = new Map<string, BusinessRow[]>()
  for (const row of rows) {
    const slug = row.category?.slug
    if (!slug || !TEMPLATES_BY_CATEGORY[slug]) continue
    const bucket = byCategory.get(slug) ?? []
    bucket.push(row)
    byCategory.set(slug, bucket)
  }
  for (const bucket of byCategory.values()) {
    bucket.sort((a, b) => Number(a.is_chain ?? false) - Number(b.is_chain ?? false))
  }

  // Round-robin across categories for a balanced mix.
  const selected: BusinessRow[] = []
  const buckets = [...byCategory.values()]
  for (let i = 0; selected.length < MAX_BUSINESSES; i++) {
    const remaining = buckets.filter((bucket) => bucket.length > i)
    if (remaining.length === 0) break
    for (const bucket of remaining) {
      if (selected.length >= MAX_BUSINESSES) break
      selected.push(bucket[i])
    }
  }
  return selected
}

async function deleteExistingSeeds(): Promise<number> {
  let deleted = 0

  const byMarkerColumn = await supabase
    .from('deals')
    .delete()
    .eq('qr_code_url', SEED_MARKER)
    .select('id')
  if (byMarkerColumn.error) {
    throw new Error(`Failed to delete previous seeds: ${byMarkerColumn.error.message}`)
  }
  deleted += byMarkerColumn.data?.length ?? 0

  // Also clean up any rows from older runs that tagged the description instead.
  const byDescription = await supabase
    .from('deals')
    .delete()
    .like('description', `%${SEED_MARKER}%`)
    .select('id')
  if (byDescription.error) {
    throw new Error(`Failed to delete previous seeds: ${byDescription.error.message}`)
  }
  deleted += byDescription.data?.length ?? 0

  return deleted
}

async function main() {
  console.log('Selecting top-rated businesses...')
  const businesses = await selectBusinesses()
  if (businesses.length === 0) {
    console.error('No businesses matched the selection criteria; nothing to seed.')
    process.exit(1)
  }
  console.log(`Selected ${businesses.length} businesses (rating >= ${MIN_RATING}, independents first).`)

  console.log(`Removing existing '${SEED_MARKER}' deals...`)
  const deleted = await deleteExistingSeeds()
  console.log(`Deleted ${deleted} previously seeded deal(s).`)

  // Walk the selected businesses (already category-interleaved) and assign the
  // next unused template for each business's category, one deal per business.
  const templateCursor = new Map<string, number>()
  const startDate = new Date(Date.now() - 60 * 60 * 1000).toISOString() // active as of now
  const inserts: Array<Record<string, unknown>> = []
  const summary: Array<Record<string, string | number>> = []

  for (const business of businesses) {
    if (inserts.length >= MAX_DEALS) break
    const slug = business.category?.slug
    if (!slug) continue
    const templates = TEMPLATES_BY_CATEGORY[slug]
    const cursor = templateCursor.get(slug) ?? 0
    if (cursor >= templates.length) continue // category's templates exhausted
    templateCursor.set(slug, cursor + 1)

    const template = templates[cursor]
    const endDate = dateDaysFromNow(template.expiresInDays)
    inserts.push({
      business_id: business.id,
      title: template.title,
      description: template.description,
      deal_type: template.deal_type,
      discount_type: template.discount_type,
      discount_value: template.discount_value,
      minimum_purchase: template.minimum_purchase,
      mission_requirement: null,
      code: template.code,
      qr_code_url: SEED_MARKER,
      usage_limit: template.usage_limit,
      usage_count: 0,
      start_date: startDate,
      end_date: endDate,
      is_active: true,
    })
    summary.push({
      business: business.name.length > 40 ? `${business.name.slice(0, 37)}...` : business.name,
      category: slug,
      title: template.title,
      type: template.deal_type,
      discount: template.discount_type,
      ends: endDate.slice(0, 10),
    })
  }

  console.log(`Inserting ${inserts.length} demo deals...`)
  const { data: insertedRows, error: insertError } = await supabase
    .from('deals')
    .insert(inserts)
    .select('id')

  if (insertError) {
    throw new Error(`Failed to insert deals: ${insertError.message}`)
  }

  console.log('')
  console.table(summary)
  console.table([
    {
      businessesSelected: businesses.length,
      deletedPreviousSeeds: deleted,
      inserted: insertedRows?.length ?? 0,
    },
  ])
}

main().catch((error) => {
  console.error('Seeding failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
