import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit } from '@/lib/security/rateLimitHelper'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: businessId } = await params
  const supabase = await createClient()

  try {
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Rate limiting
    const rateLimitResponse = await enforceRateLimit(request, 'progress')
    if (rateLimitResponse) return rateLimitResponse

    // Get business details
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Check if user already checked in today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: existingCheckIn } = await supabase
      .from('business_check_ins')
      .select('id')
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .gte('check_in_at', today.toISOString())
      .single()

    if (existingCheckIn) {
      return NextResponse.json(
        { error: 'Already checked in today' },
        { status: 409 }
      )
    }

    // Create check-in
    const { data: checkIn, error } = await supabase
      .from('business_check_ins')
      .insert({
        business_id: businessId,
        user_id: user.id,
        check_in_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to create check-in' },
        { status: 500 }
      )
    }

    // Update user impact metrics
    await supabase.rpc('update_user_impact', {
      p_user_id: user.id
    })

    return NextResponse.json({
      message: 'Checked in successfully!',
      checkIn,
      impact: {
        businesses_supported: 1,
        estimated_dollars: 25 // Estimated economic impact
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating check-in:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: businessId } = await params
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's check-ins for this business
    const { data: checkIns, error } = await supabase
      .from('business_check_ins')
      .select('*')
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .order('check_in_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch check-ins' },
        { status: 500 }
      )
    }

    // Check if checked in today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkedInToday = checkIns?.some(
      ci => new Date(ci.check_in_at) >= today
    ) || false

    return NextResponse.json({
      checkIns: checkIns || [],
      checkedInToday,
      totalCheckIns: checkIns?.length || 0
    })

  } catch (error) {
    console.error('Error fetching check-ins:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
