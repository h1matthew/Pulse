import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

    // Fetch user impact data
    const { data: impact, error } = await supabase
      .from('user_impact')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('Error fetching impact:', error)
      return NextResponse.json(
        { error: 'Failed to fetch impact data' },
        { status: 500 }
      )
    }

    // If no impact data exists yet, return default values
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

    return NextResponse.json(impact)
  } catch (error) {
    console.error('Error in impact API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
