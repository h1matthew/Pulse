import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()

  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const categoryId = searchParams.get('category')
    const activeOnly = searchParams.get('active') !== 'false'
    const page = Number(searchParams.get('page')) || 1
    const limit = Number(searchParams.get('limit')) || 20
    const offset = (page - 1) * limit

    let query = supabase
      .from('deals')
      .select(`
        *,
        business:businesses(*, category:categories(*))
      `, { count: 'exact' })

    if (businessId) {
      query = query.eq('business_id', businessId)
    }

    if (categoryId) {
      query = query.eq('business.category_id', categoryId)
    }

    if (activeOnly) {
      query = query.eq('is_active', true)
        .or('end_date.is.null,end_date.gte.now()')
        .or('start_date.is.null,start_date.lte.now()')
    }

    // Try to filter by source=scraped (only available after migration)
    // If the column doesn't exist yet, fall back to showing all deals
    let deals: any[] | null = null
    let error: any = null
    let count: number | null = null

    const filteredQuery = query.eq('source', 'scraped')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const filteredResult = await filteredQuery

    if (filteredResult.error?.code === '42703') {
      // Column doesn't exist yet — fall back to unfiltered query
      const fallbackQuery = supabase
        .from('deals')
        .select(`
          *,
          business:businesses(*, category:categories(*))
        `, { count: 'exact' })
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      const fallbackResult = await fallbackQuery
      deals = fallbackResult.data
      error = fallbackResult.error
      count = fallbackResult.count
    } else {
      deals = filteredResult.data
      error = filteredResult.error
      count = filteredResult.count
    }

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch deals' },
        { status: 500 }
      )
    }

    // Get user's claimed deals if authenticated
    const { data: { user } } = await supabase.auth.getUser()
    let userClaims: string[] = []

    if (user) {
      const { data: claims } = await supabase
        .from('deal_claims')
        .select('deal_id')
        .eq('user_id', user.id)

      userClaims = claims?.map(c => c.deal_id) || []
    }

    const dealsWithClaimStatus = (deals || []).map(deal => ({
      ...deal,
      isClaimed: userClaims.includes(deal.id),
    }))

    return NextResponse.json({
      deals: dealsWithClaimStatus,
      total: count || 0,
      hasMore: count ? offset + limit < count : false,
    })
  } catch (error) {
    console.error('Error fetching deals:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
