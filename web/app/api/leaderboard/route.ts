import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isDemoContentEnabled, shouldUseDemoStatsForUser, getDemoLeaderboard } from '@/lib/demo/demo-account-stats'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'global'
    const timeframe = searchParams.get('timeframe') || 'all_time'
    const limit = parseInt(searchParams.get('limit') || '100', 10)

    const supabase = await createClient()

    // Get current user for rank context
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user && shouldUseDemoStatsForUser(user)) {
      return NextResponse.json(getDemoLeaderboard(user.id))
    }

    // Try to use the database function first
    const { data: leaderboardData, error: fnError } = await supabase.rpc(
      'get_impact_leaderboard',
      { p_limit: limit }
    )

    if (!fnError && leaderboardData) {
      // Find current user's rank if logged in
      let userRank = null
      if (user) {
        const userEntry = leaderboardData.find(
          (entry: { user_id: string }) => entry.user_id === user.id
        )
        if (userEntry) {
          userRank = userEntry.rank
        }
      }

      return NextResponse.json({
        entries: leaderboardData,
        userRank,
        totalCount: leaderboardData.length,
      })
    }

    // Fallback: query user_impact directly and join with profiles
    const { data: impactData, error } = await supabase
      .from('user_impact')
      .select(`
        user_id,
        estimated_dollars_kept_local,
        businesses_supported,
        reviews_left,
        missions_completed,
        total_check_ins,
        profiles (full_name, avatar_url)
      `)
      .gt('estimated_dollars_kept_local', 0)
      .order('estimated_dollars_kept_local', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching leaderboard:', error)
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard' },
        { status: 500 }
      )
    }

    // Calculate scores and ranks
    const entries =
      impactData?.map((entry, index) => {
        // Calculate a total score based on various metrics
        const dollarsScore =
          Number(entry.estimated_dollars_kept_local) / 10
        const businessesScore = entry.businesses_supported * 50
        const reviewsScore = entry.reviews_left * 25
        const missionsScore = entry.missions_completed * 100
        const checkInsScore = entry.total_check_ins * 5

        const totalScore = Math.floor(
          dollarsScore +
            businessesScore +
            reviewsScore +
            missionsScore +
            checkInsScore
        )

        // Note: Supabase returns one-to-one relationships as arrays with single elements
        const profile = (entry.profiles as unknown as { full_name: string; avatar_url: string }[] | null)?.[0]

        return {
          rank: index + 1,
          user_id: entry.user_id,
          display_name: profile?.full_name || 'Anonymous',
          avatar_url: profile?.avatar_url,
          dollars_kept_local: Number(entry.estimated_dollars_kept_local),
          businesses_supported: entry.businesses_supported,
          reviews_left: entry.reviews_left,
          missions_completed: entry.missions_completed,
          impact_score: totalScore,
        }
      }) || []

    // Find current user's rank if logged in
    let userRank = null
    if (user) {
      const userEntry = entries.find((entry) => entry.user_id === user.id)
      if (userEntry) {
        userRank = userEntry.rank
      }
    }

    return NextResponse.json(
      {
        entries,
        userRank,
        totalCount: entries.length,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    )
  } catch (error) {
    console.error('Error in leaderboard API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
