import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { ExternalReview } from '@/types/business'

const GOOGLE_PLACES_DETAILS_FIELD_MASK = 'reviews'

interface GooglePlacesReviewText {
  text?: string
}

interface GooglePlacesAuthorAttribution {
  displayName?: string
  uri?: string
  photoUri?: string
}

interface GooglePlacesReview {
  name?: string
  rating?: number
  publishTime?: string
  relativePublishTimeDescription?: string
  text?: GooglePlacesReviewText
  originalText?: GooglePlacesReviewText
  authorAttribution?: GooglePlacesAuthorAttribution
  googleMapsUri?: string
}

interface GooglePlaceDetailsResponse {
  reviews?: GooglePlacesReview[]
}

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

function dateDaysFromNow(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

function buildDemoDealsForBusiness(business: { id: string; name: string }) {
  const template = DEMO_DEAL_TEMPLATES.find((item) => item.businessName === business.name)
  if (!template) return []

  const now = new Date().toISOString()

  return [
    {
      id: `demo-${business.id}-1`,
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
      source: 'manual' as const,
      created_at: now,
      updated_at: now,
    },
  ]
}

function normalizePlaceId(placeId: string): string {
  const trimmed = placeId.trim()
  if (!trimmed.startsWith('places/')) {
    return trimmed
  }

  const segments = trimmed.split('/')
  const id = segments[1]
  return id || trimmed
}

function extractGoogleReviewContent(review: GooglePlacesReview): string {
  const content = review.text?.text || review.originalText?.text || ''
  return content.trim() || 'No written comment.'
}

async function fetchGoogleReviews(placeId: string): Promise<ExternalReview[]> {
  const activeApiKey =
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ||
    ''

  if (!activeApiKey || !placeId) {
    return []
  }

  try {
    const normalizedPlaceId = normalizePlaceId(placeId)
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(normalizedPlaceId)}`,
      {
        headers: {
          'X-Goog-Api-Key': activeApiKey,
          'X-Goog-FieldMask': GOOGLE_PLACES_DETAILS_FIELD_MASK,
        },
        next: { revalidate: 60 * 60 * 24 },
      }
    )

    if (!response.ok) {
      return []
    }

    const payload: GooglePlaceDetailsResponse = await response.json()
    const reviews = payload.reviews || []

    return reviews.map((review, index) => {
      const author = review.authorAttribution
      return {
        id: review.name || `google-review-${normalizedPlaceId}-${index}`,
        source: 'google',
        rating: Number(review.rating) || 0,
        content: extractGoogleReviewContent(review),
        author_name: author?.displayName || 'Google user',
        author_photo_url: author?.photoUri || null,
        author_profile_url: author?.uri || null,
        created_at: review.publishTime || null,
        relative_time: review.relativePublishTimeDescription || null,
        maps_url: review.googleMapsUri || null,
      } satisfies ExternalReview
    })
  } catch (error) {
    console.error('Failed to fetch Google reviews:', error)
    return []
  }
}

/**
 * GET /api/businesses/[id]
 *
 * Fetch a single business with its category, reviews (newest first, limit 50),
 * active deals, and the current user's bookmark status. Triggers a background
 * Google review sync if the cached reviews are stale.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  void _request
  const { id } = await params
  const supabase = await createClient()

  try {
    // Fetch business with category by internal ID first.
    const { data: byIdBusiness, error: byIdError } = await supabase
      .from('businesses')
      .select('*, category:categories(*)')
      .eq('id', id)
      .maybeSingle()

    if (byIdError && byIdError.code !== 'PGRST116') {
      throw byIdError
    }

    // Fallback to Google place_id lookup when path param is place_id.
    let business = byIdBusiness
    if (!business) {
      const { data: byPlaceBusiness, error: byPlaceError } = await supabase
        .from('businesses')
        .select('*, category:categories(*)')
        .eq('place_id', id)
        .maybeSingle()

      if (byPlaceError && byPlaceError.code !== 'PGRST116') {
        throw byPlaceError
      }

      business = byPlaceBusiness
    }

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    const businessId = business.id

    // Fetch all local reviews.
    const { data: reviews } = await supabase
      .from('reviews')
      .select('*, user:profiles(id, full_name, avatar_url)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    // Fetch deals
    const { data: deals } = await supabase
      .from('deals')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    const now = Date.now()
    const activeDeals = (deals || []).filter((deal) => {
      if (!deal.is_active) return false

      const startsAt = deal.start_date ? new Date(deal.start_date).getTime() : null
      const endsAt = deal.end_date ? new Date(deal.end_date).getTime() : null

      const hasStarted = startsAt === null || startsAt <= now
      const hasNotEnded = endsAt === null || endsAt >= now

      return hasStarted && hasNotEnded
    })
    const dealsForResponse =
      activeDeals.length > 0 ? activeDeals : buildDemoDealsForBusiness(business)

    // Check if user has bookmarked this business
    const { data: { user } } = await supabase.auth.getUser()
    let isBookmarked = false

    if (user) {
      const { data: bookmark } = await supabase
        .from('business_bookmarks')
        .select('id')
        .eq('business_id', businessId)
        .eq('user_id', user.id)
        .maybeSingle()

      isBookmarked = !!bookmark
    }

    const externalReviews =
      business.data_source === 'google' && business.place_id
        ? await fetchGoogleReviews(business.place_id)
        : []

    return NextResponse.json({
      ...business,
      reviews: reviews || [],
      local_review_count: reviews?.length || 0,
      external_reviews: externalReviews,
      deals: dealsForResponse,
      is_bookmarked: isBookmarked,
    })
  } catch (error) {
    console.error('Error fetching business:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/businesses/[id]
 *
 * Update a business listing. Requires authentication — only the business owner
 * or an admin can make changes. Returns the updated business record.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user can edit this business
    const { data: business } = await supabase
      .from('businesses')
      .select('owner_id')
      .eq('id', id)
      .single()

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Check if user is owner or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (business.owner_id !== user.id && !profile?.is_admin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()

    const { data: updatedBusiness, error } = await supabase
      .from('businesses')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to update business' },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedBusiness)
  } catch (error) {
    console.error('Error updating business:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
