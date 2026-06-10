#!/usr/bin/env tsx
/**
 * Chain Classification Script
 * Fetches all businesses, classifies each as chain vs independent using the
 * curated brand list in lib/business/classify.ts, and updates rows whose
 * is_chain value differs.
 *
 * Usage: npx tsx supabase/scripts/classify-chains.ts
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { isChainBusiness } from '../../lib/business/classify'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SECRET_KEY')
  console.error('\nSet them in web/.env (see Supabase Dashboard > Settings > API keys)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface BusinessRow {
  id: string
  name: string
  tags: string[] | null
  is_chain: boolean | null
}

const PAGE_SIZE = 1000
const UPDATE_CHUNK_SIZE = 50

async function fetchAllBusinesses(): Promise<BusinessRow[]> {
  const rows: BusinessRow[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('businesses')
      .select('id,name,tags,is_chain')
      .order('id')
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw new Error(`Failed to fetch businesses: ${error.message}`)

    const page = (data ?? []) as BusinessRow[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }
  return rows
}

async function main() {
  console.log('Fetching businesses...')
  const businesses = await fetchAllBusinesses()

  let chains = 0
  const updates: Array<{ id: string; name: string; is_chain: boolean }> = []

  for (const business of businesses) {
    const isChain = isChainBusiness({
      name: business.name,
      tags: business.tags ?? undefined,
    })
    if (isChain) chains++
    if (business.is_chain !== isChain) {
      updates.push({ id: business.id, name: business.name, is_chain: isChain })
    }
  }

  let updated = 0
  let failed = 0

  for (let i = 0; i < updates.length; i += UPDATE_CHUNK_SIZE) {
    const chunk = updates.slice(i, i + UPDATE_CHUNK_SIZE)
    const results = await Promise.all(
      chunk.map((u) =>
        supabase.from('businesses').update({ is_chain: u.is_chain }).eq('id', u.id)
      )
    )

    results.forEach((result, index) => {
      const row = chunk[index]
      if (result.error) {
        failed++
        console.error(`  Failed to update "${row.name}" (${row.id}): ${result.error.message}`)
      } else {
        updated++
        console.log(`  ${row.is_chain ? 'chain      ' : 'independent'}  ${row.name}`)
      }
    })
  }

  console.log('')
  console.table([
    {
      total: businesses.length,
      chains,
      independents: businesses.length - chains,
      updated,
      failed,
    },
  ])

  if (failed > 0) process.exit(1)
}

main().catch((error) => {
  console.error('Classification failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
