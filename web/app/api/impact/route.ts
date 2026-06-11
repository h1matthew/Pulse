import { createClient } from '@/lib/supabase/server'
import { calculateUserImpact } from '@/lib/impact-calculator'
import { NextResponse } from 'next/server'
import { getDemoImpact, shouldUseDemoStatsForUser } from '@/lib/demo/demo-account-stats'

// How long a stored user_impact row stays trusted before GET recomputes it
// from the activity tables. Keeps the dashboard truthful shortly after new
// check-ins/reviews/claims without recomputing on every request.
const IMPACT_STALE_MS = 5 * 60 * 1000

interface UserImpactRow {
  user_id: string
  estimated_dollars_kept_local: number
  businesses_supported: number
  jobs_impacted_estimate: number
  reviews_left: number
  missions_completed: number
  deals_claimed: number
  total_check_ins: number
  community_rank: number | null
  last_updated: string
}

function isStale(impact: UserImpactRow | null): boolean {
  if (!impact) return true
  const updatedAt = new Date(impact.last_updated).getTime()
  return !Number.isFinite(updatedAt) || Date.now() - updatedAt > IMPACT_STALE_MS
}

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (shouldUseDemoStatsForUser(user)) {
      return NextResponse.json(getDemoImpact(user.id))
    }

    const fetchImpactRow = async (): Promise<UserImpactRow | null> => {
      const { data, error } = await supabase
        .from('user_impact')
        .select('*')
        .eq('user_id', user.id)
        .single()
      // PGRST116 = no rows returned — treated as "not calculated yet"
      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch impact data: ${error.message}`)
      }
      return data ?? null
    }

    let impact = await fetchImpactRow()

    // Compute from the real activity tables when missing or stale — the
    // calculator upserts the row, so the re-read below picks it up.
    if (isStale(impact)) {
      try {
        await calculateUserImpact(user.id)
        impact = await fetchImpactRow()
      } catch (calcError) {
        // A stored (if stale) row is still better than an error
        console.error('Impact recalculation failed:', calcError)
      }
    }

    // No row even after recalculation: brand-new user with no activity
    if (!impact) {
      return NextResponse.json({
        user_id: user.id,
        estimated_dollars_kept_local: 0,
        businesses_supported: 0,
        jobs_impacted_estimate: 0,
        reviews_left: 0,
        missions_completed: 0,
        deals_claimed: 0,
        total_check_ins: 0,
        community_rank: null,
        last_updated: new Date().toISOString(),
      })
    }

    // Real community rank: 1 + number of users with more dollars kept local.
    // Only meaningful once the user has activity of their own.
    let communityRank = impact.community_rank
    const dollars = Number(impact.estimated_dollars_kept_local) || 0
    if (dollars > 0) {
      const { count, error: rankError } = await supabase
        .from('user_impact')
        .select('user_id', { count: 'exact', head: true })
        .gt('estimated_dollars_kept_local', dollars)
      if (!rankError && typeof count === 'number') {
        communityRank = count + 1
      }
    }

    return NextResponse.json({ ...impact, community_rank: communityRank })
  } catch (error) {
    console.error('Error in impact API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
