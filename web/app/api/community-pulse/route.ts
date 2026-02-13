import { createClient } from '@/lib/supabase/server'
import { getCommunityImpact } from '@/lib/impact-calculator'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Try to get from the calculator function first
    const communityImpact = await getCommunityImpact()

    if (communityImpact) {
      return NextResponse.json({
        pulse_score: communityImpact.pulseScore,
        total_dollars_kept_local: communityImpact.totalDollarsKept,
        total_businesses_supported: communityImpact.totalBusinessesSupported,
        total_reviews_left: communityImpact.totalReviews,
        active_users: communityImpact.activeUsers,
      })
    }

    // Fallback: query the database directly
    const supabase = await createClient()

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
