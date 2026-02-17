import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { syncGoogleReviews } from '@/lib/reviews/sync-server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: businessId } = await params

  try {
    // Get the business details including place_id
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('place_id, name')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
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
    const result = await syncGoogleReviews(businessId, business.place_id)

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
