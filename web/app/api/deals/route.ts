import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const DEMO_DEAL_BUSINESS_NAMES = [
  'H Mart Diamond Bar',
  '99 Ranch Market',
  'The Boiling Crab',
  'Chubby Cattle BBQ | Rowland Heights',
  'AMC Puente Hills 20',
  'Round1 Bowling & Arcade - Puente Hills Mall',
] as const

const DEMO_DEAL_TEMPLATES = [
  {
    businessName: 'H Mart Diamond Bar',
    title: 'Weeknight Bento Bundle',
    description: 'Save on ready-to-serve meal sets from 5pm to close.',
    deal_type: 'standard',
    discount_type: 'percentage',
    discount_value: 15,
    code: 'HMART15',
    expiresInDays: 18,
  },
  {
    businessName: '99 Ranch Market',
    title: 'Fresh Produce Friday',
    description: 'Get a produce discount when your basket includes 5+ produce items.',
    deal_type: 'flash',
    discount_type: 'percentage',
    discount_value: 20,
    code: 'RANCH20',
    expiresInDays: 10,
  },
  {
    businessName: 'The Boiling Crab',
    title: 'Seafood Combo Perk',
    description: 'Receive a discounted combo add-on with any two-pound seafood order.',
    deal_type: 'standard',
    discount_type: 'fixed_amount',
    discount_value: 8,
    code: 'CRAB8',
    expiresInDays: 14,
  },
  {
    businessName: 'Chubby Cattle BBQ | Rowland Heights',
    title: 'Boost Mission: Bring a Friend',
    description: 'Complete a mission visit with a friend and unlock a reward discount.',
    deal_type: 'boost_mission',
    discount_type: 'percentage',
    discount_value: 12,
    code: 'CHUBBY12',
    mission_requirement: 'Check in with 1 friend this week',
    expiresInDays: 21,
  },
  {
    businessName: 'AMC Puente Hills 20',
    title: 'Matinee Movie Saver',
    description: 'Save on weekday matinee tickets before 4 PM.',
    deal_type: 'flash',
    discount_type: 'fixed_amount',
    discount_value: 5,
    code: 'AMC5',
    expiresInDays: 12,
  },
  {
    businessName: 'Round1 Bowling & Arcade - Puente Hills Mall',
    title: 'Arcade Credit Bonus',
    description: 'Buy credits and receive bonus arcade credits on your first swipe.',
    deal_type: 'standard',
    discount_type: 'free_item',
    discount_value: null,
    code: 'ROUND1BONUS',
    expiresInDays: 20,
  },
] as const

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

    // Fallback demo deals for presentations when there are no real deal rows yet.
    if (!error && (!deals || deals.length === 0)) {
      const demoDeals = await buildDemoDeals(supabase, { businessId, categoryId })
      const paginated = demoDeals.slice(offset, offset + limit)
      deals = paginated
      count = demoDeals.length
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

function dateDaysFromNow(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

async function buildDemoDeals(
  supabase: SupabaseClient,
  { businessId, categoryId }: { businessId: string | null; categoryId: string | null }
) {
  let businessQuery = supabase
    .from('businesses')
    .select(`
      id,
      name,
      category_id,
      average_rating,
      review_count,
      category:categories(*)
    `)
    .in('name', [...DEMO_DEAL_BUSINESS_NAMES])

  if (businessId) {
    businessQuery = businessQuery.eq('id', businessId)
  }
  if (categoryId) {
    businessQuery = businessQuery.eq('category_id', categoryId)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: businesses } = (await businessQuery) as { data: any[] | null }
  if (!businesses || businesses.length === 0) return []

  const byName = new Map(businesses.map((b) => [b.name, b]))
  const now = new Date().toISOString()

  return DEMO_DEAL_TEMPLATES.flatMap((template, index) => {
    const business = byName.get(template.businessName)
    if (!business) return []

    return [
      {
        id: `demo-${business.id}-${index + 1}`,
        business_id: business.id,
        title: template.title,
        description: template.description,
        deal_type: template.deal_type,
        discount_type: template.discount_type,
        discount_value: template.discount_value,
        minimum_purchase: null,
        mission_requirement:
          'mission_requirement' in template ? template.mission_requirement : null,
        code: template.code,
        qr_code_url: null,
        usage_limit: null,
        usage_count: 0,
        start_date: now,
        end_date: dateDaysFromNow(template.expiresInDays),
        is_active: true,
        source: 'manual',
        created_at: now,
        updated_at: now,
        business,
      },
    ]
  })
}
