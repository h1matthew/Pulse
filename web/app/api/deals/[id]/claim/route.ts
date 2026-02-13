import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: dealId } = await params

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get deal details
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .single()

    if (dealError || !deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      )
    }

    // Check if deal is active
    if (!deal.is_active) {
      return NextResponse.json(
        { error: 'This deal is no longer active' },
        { status: 400 }
      )
    }

    // Check dates
    if (deal.start_date && new Date(deal.start_date) > new Date()) {
      return NextResponse.json(
        { error: 'This deal has not started yet' },
        { status: 400 }
      )
    }

    if (deal.end_date && new Date(deal.end_date) < new Date()) {
      return NextResponse.json(
        { error: 'This deal has expired' },
        { status: 400 }
      )
    }

    // Check usage limit
    if (deal.usage_limit && deal.usage_count >= deal.usage_limit) {
      return NextResponse.json(
        { error: 'This deal has reached its usage limit' },
        { status: 400 }
      )
    }

    // Check if user already claimed
    const { data: existingClaim } = await supabase
      .from('deal_claims')
      .select('id')
      .eq('deal_id', dealId)
      .eq('user_id', user.id)
      .single()

    if (existingClaim) {
      return NextResponse.json(
        { error: 'You have already claimed this deal' },
        { status: 409 }
      )
    }

    // Generate redemption code
    const redeemedCode = Math.random().toString(36).substring(2, 10).toUpperCase()

    // Create claim
    const { data: claim, error } = await supabase
      .from('deal_claims')
      .insert({
        deal_id: dealId,
        user_id: user.id,
        redeemed_code: redeemedCode,
      })
      .select(`
        *,
        deal:deals(*, business:businesses(*))
      `)
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to claim deal' },
        { status: 500 }
      )
    }

    // Increment usage count
    await supabase
      .from('deals')
      .update({ usage_count: deal.usage_count + 1 })
      .eq('id', dealId)

    return NextResponse.json(claim, { status: 201 })
  } catch (error) {
    console.error('Error claiming deal:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
