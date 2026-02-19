import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { syncGoogleReviews } from '@/lib/reviews/sync-server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: businessLookupId } = await params

  try {
    // Resolve either by internal business id or by Google place_id.
    const { data: byIdBusiness, error: byIdError } = await supabase
      .from('businesses')
      .select('id, place_id, name')
      .eq('id', businessLookupId)
      .maybeSingle()

    if (byIdError && byIdError.code !== 'PGRST116') {
      throw byIdError
    }

    let business = byIdBusiness
    if (!business) {
      const { data: byPlaceBusiness, error: byPlaceError } = await supabase
        .from('businesses')
        .select('id, place_id, name')
        .eq('place_id', businessLookupId)
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

    // If no place_id, can't fetch Google reviews
    if (!business.place_id) {
      return NextResponse.json(
        { error: 'No Google Place ID for this business' },
        { status: 400 }
      )
    }

    // Use the shared sync function
    const result = await syncGoogleReviews(business.id, business.place_id)

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.skipped ? 503 : 500 }
      )
    }

    return NextResponse.json({
      synced: result.synced,
      google_rating: result.googleRating,
      google_review_count: result.googleReviewCount,
    })
  } catch (error) {
    console.error('Error syncing Google reviews:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
