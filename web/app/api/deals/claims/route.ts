import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get('page')) || 1
    const limit = Number(searchParams.get('limit')) || 20
    const offset = (page - 1) * limit
    const redeemed = searchParams.get('redeemed')

    let query = supabase
      .from('deal_claims')
      .select(`
        *,
        deal:deals(*, business:businesses(*, category:categories(*)))
      `, { count: 'exact' })
      .eq('user_id', user.id)

    if (redeemed === 'true') {
      query = query.not('redeemed_at', 'is', null)
    } else if (redeemed === 'false') {
      query = query.is('redeemed_at', null)
    }

    query = query.order('claimed_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: claims, error, count } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch deal claims' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      claims: claims || [],
      total: count || 0,
      hasMore: count ? offset + limit < count : false,
    })
  } catch (error) {
    console.error('Error fetching deal claims:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
