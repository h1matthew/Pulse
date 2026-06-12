/**
 * Seed a demo judge account with realistic activity so screenshots and the
 * live demo look full: bookmarks, reviews, check-ins, deal claims, impact.
 *
 * Run from the web/ directory (so @supabase/supabase-js resolves):
 *   cd web && node ../scripts/seed-demo-user.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, '../.env'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY)

const DEMO_EMAIL = 'judge@pulse.demo'
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || env.DEMO_PASSWORD
const DEMO_NAME = 'Alex Rivera'

if (!DEMO_PASSWORD) {
  throw new Error(
    'DEMO_PASSWORD is not set. Add it to web/.env (or export it) before seeding.'
  )
}

async function main() {
  // 1. Create (or reuse) the confirmed demo user
  let userId
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: DEMO_NAME },
  })
  if (createErr) {
    if (!/already/i.test(createErr.message)) throw createErr
    const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    userId = list.users.find((u) => u.email === DEMO_EMAIL)?.id
    if (!userId) throw new Error('demo user exists but not found')
  } else {
    userId = created.user.id
  }
  console.log('demo user:', userId)

  await supabase.from('profiles').upsert({ id: userId, full_name: DEMO_NAME })

  // 2. Pick photogenic, well-rated businesses across categories
  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name, category_id, average_rating, photos')
    .not('photos', 'eq', '[]')
    .gte('average_rating', 4)
    .order('review_count', { ascending: false })
    .limit(40)

  const withPhoto = businesses.filter(
    (b) => Array.isArray(b.photos) && b.photos.length > 0
  )
  // spread across distinct categories
  const seen = new Set()
  const picks = []
  for (const b of withPhoto) {
    if (picks.length >= 8) break
    if (seen.has(b.category_id) && picks.length < 5) continue
    seen.add(b.category_id)
    picks.push(b)
  }
  while (picks.length < 8 && withPhoto[picks.length]) picks.push(withPhoto[picks.length])
  console.log('picked:', picks.map((p) => p.name).join(' | '))

  // 3. Bookmarks (5)
  for (const b of picks.slice(0, 5)) {
    await supabase.from('business_bookmarks').upsert(
      { user_id: userId, business_id: b.id, note: 'Want to visit again soon' },
      { onConflict: 'user_id,business_id' }
    )
  }

  // 4. Reviews (3, ratings 4-5)
  const reviewTexts = [
    'Friendly staff and great atmosphere. You can tell they genuinely care about their regulars — will absolutely be back.',
    'Hidden gem! Quality is better than the big chains nearby and prices are fair. Supporting local has never been easier.',
    'Quick service and consistently great quality. The owner remembered my order from last time, which says it all.',
  ]
  for (let i = 0; i < 3; i++) {
    await supabase.from('reviews').upsert(
      {
        user_id: userId,
        business_id: picks[i].id,
        rating: i === 1 ? 4 : 5,
        content: reviewTexts[i],
        verified_purchase: true,
      },
      { onConflict: 'business_id,user_id' }
    )
  }

  // 5. Check-ins with spend over the past 3 weeks
  const spends = [18.5, 42.0, 12.75, 65.0, 27.4, 89.99, 15.25, 33.6]
  for (let i = 0; i < 8; i++) {
    const daysAgo = i * 2 + 1
    const at = new Date(Date.now() - daysAgo * 86400000).toISOString()
    await supabase.from('business_check_ins').upsert(
      {
        user_id: userId,
        business_id: picks[i % picks.length].id,
        check_in_at: at,
        spend_amount: spends[i],
        verified_by_location: true,
      },
      { onConflict: 'business_id,user_id,check_in_at', ignoreDuplicates: true }
    )
  }

  // 6. Claim two deals (one redeemed)
  const { data: deals } = await supabase.from('deals').select('id, title, code').limit(3)
  if (deals?.length) {
    await supabase.from('deal_claims').upsert(
      { deal_id: deals[0].id, user_id: userId, redeemed_code: deals[0].code },
      { onConflict: 'deal_id,user_id' }
    )
    if (deals[1]) {
      await supabase.from('deal_claims').upsert(
        {
          deal_id: deals[1].id,
          user_id: userId,
          redeemed_at: new Date().toISOString(),
          redeemed_code: deals[1].code,
        },
        { onConflict: 'deal_id,user_id' }
      )
    }
  }

  // 7. Impact metrics (68% local multiplier, 1 job / $15k, 0.5 lb CO2 per visit)
  const totalSpend = spends.reduce((a, b) => a + b, 0)
  await supabase.from('user_impact').upsert({
    user_id: userId,
    estimated_dollars_kept_local: Math.round(totalSpend * 0.68 * 100) / 100,
    businesses_supported: new Set(picks.map((p) => p.id)).size,
    jobs_impacted_estimate: Math.max(1, Math.round(totalSpend / 15000)),
    reviews_left: 3,
    deals_claimed: Math.min(2, deals?.length ?? 0),
    total_check_ins: 8,
  })

  console.log(`done. login: ${DEMO_EMAIL} (password from DEMO_PASSWORD env)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
