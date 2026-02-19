import { createClient } from '@/lib/supabase/server'
import { getCommunityImpact } from '@/lib/impact-calculator'
import { NextResponse } from 'next/server'
import { getDemoImpact, shouldUseDemoStatsForUser } from '@/lib/demo/demo-account-stats'

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value) || 0
  return 0
}

function hasMeaningfulCommunityTotals(data: {
  pulseScore: number
  totalDollarsKept: number
  totalBusinessesSupported: number
  activeUsers: number
} | null): boolean {
  if (!data) return false
  return (
    data.pulseScore > 0 ||
    data.totalDollarsKept > 0 ||
    data.totalBusinessesSupported > 0 ||
    data.activeUsers > 0
  )
}

export async function GET() {
  try {
    const supabase = await createClient()

    // Align community card with demo account metrics during presentation mode.
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user && shouldUseDemoStatsForUser(user)) {
      const demoImpact = getDemoImpact(user.id)
      const pulseScore = Math.floor(
        Number(demoImpact.estimated_dollars_kept_local) / 10 +
        Number(demoImpact.total_check_ins) * 5 +
        Number(demoImpact.reviews_left) * 25 +
        Number(demoImpact.missions_completed) * 100
      )

      return NextResponse.json({
        pulse_score: pulseScore,
        total_dollars_kept_local: Number(demoImpact.estimated_dollars_kept_local),
        total_businesses_supported: Number(demoImpact.businesses_supported),
        total_reviews_left: Number(demoImpact.reviews_left),
        active_users: 1,
      })
    }

    // Keep precomputed community_pulse fresh when the RPC is available.
    try {
      await supabase.rpc('update_community_pulse')
    } catch {
      // Ignore missing RPC/function errors and continue with live aggregate fallback.
    }

    // First attempt: latest aggregate snapshot.
    const communityImpact = await getCommunityImpact()
    if (communityImpact && hasMeaningfulCommunityTotals(communityImpact)) {
      return NextResponse.json({
        pulse_score: communityImpact.pulseScore,
        total_dollars_kept_local: communityImpact.totalDollarsKept,
        total_businesses_supported: communityImpact.totalBusinessesSupported,
        total_reviews_left: communityImpact.totalReviews,
        active_users: communityImpact.activeUsers,
      })
    }

    // Second attempt: compute live aggregate directly from user_impact.
    const { data: impactRows, error: impactError } = await supabase
      .from('user_impact')
      .select(
        'estimated_dollars_kept_local, businesses_supported, reviews_left, missions_completed, total_check_ins, last_updated'
      )

    if (!impactError && impactRows && impactRows.length > 0) {
      const totalDollarsKept = impactRows.reduce(
        (sum, row) => sum + toNumber(row.estimated_dollars_kept_local),
        0
      )
      const totalBusinessesSupported = impactRows.reduce(
        (sum, row) => sum + toNumber(row.businesses_supported),
        0
      )
      const totalReviewsLeft = impactRows.reduce(
        (sum, row) => sum + toNumber(row.reviews_left),
        0
      )
      const totalMissionsCompleted = impactRows.reduce(
        (sum, row) => sum + toNumber(row.missions_completed),
        0
      )

      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
      const activeUsers = impactRows.filter((row) => {
        const updatedAt = new Date(row.last_updated || 0).getTime()
        const hasActivity =
          toNumber(row.total_check_ins) > 0 ||
          toNumber(row.reviews_left) > 0 ||
          toNumber(row.businesses_supported) > 0 ||
          toNumber(row.missions_completed) > 0 ||
          toNumber(row.estimated_dollars_kept_local) > 0
        return hasActivity && updatedAt >= thirtyDaysAgo
      }).length

      const fallbackActiveUsers =
        activeUsers > 0
          ? activeUsers
          : impactRows.filter((row) => {
              return (
                toNumber(row.total_check_ins) > 0 ||
                toNumber(row.reviews_left) > 0 ||
                toNumber(row.businesses_supported) > 0 ||
                toNumber(row.missions_completed) > 0 ||
                toNumber(row.estimated_dollars_kept_local) > 0
              )
            }).length

      const pulseScore = Math.round(
        totalDollarsKept / 1000 + totalReviewsLeft * 10 + totalMissionsCompleted * 50
      )

      return NextResponse.json({
        pulse_score: pulseScore,
        total_dollars_kept_local: totalDollarsKept,
        total_businesses_supported: totalBusinessesSupported,
        total_reviews_left: totalReviewsLeft,
        active_users: fallbackActiveUsers,
      })
    }

    // Final fallback: latest row from community_pulse even when empty.
    const { data: pulseData, error } = await supabase
      .from('community_pulse')
      .select('*')
      .order('date', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      console.error('Error fetching community pulse:', error)
      // Return default values if no data exists yet
      return NextResponse.json({
        pulse_score: 0,
        total_dollars_kept_local: 0,
        total_businesses_supported: 0,
        total_reviews_left: 0,
        active_users: 0,
      })
    }

    return NextResponse.json({
      id: pulseData?.id || '',
      date: pulseData?.date || new Date().toISOString(),
      pulse_score: pulseData?.pulse_score || 0,
      total_dollars_kept_local: pulseData?.total_dollars_kept_local || 0,
      total_businesses_supported: pulseData?.total_businesses_supported || 0,
      total_reviews_left: pulseData?.total_reviews_left || 0,
      active_users: pulseData?.active_users || 0,
      new_businesses_added: pulseData?.new_businesses_added || 0,
      total_missions_completed: pulseData?.total_missions_completed || 0,
      created_at: pulseData?.created_at || new Date().toISOString(),
      updated_at: pulseData?.updated_at || new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error in community pulse API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
