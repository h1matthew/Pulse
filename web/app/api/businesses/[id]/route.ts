import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { shouldSyncReviews } from '@/lib/reviews/sync-shared'
import { triggerBackgroundSync } from '@/lib/reviews/sync-server'

/**
 * GET /api/businesses/[id]
 *
 * Fetch a single business with its category, reviews (newest first, limit 50),
 * active deals, and the current user's bookmark status. Triggers a background
 * Google review sync if the cached reviews are stale.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  try {
    // Fetch business with category
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*, category:categories(*)')
      .eq('id', id)
      .single()

    if (businessError) {
      if (businessError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Business not found' },
          { status: 404 }
        )
      }
      throw businessError
    }

    // Trigger background sync if reviews are stale and business has a place_id
    // This happens non-blocking - we return cached reviews immediately
    if (
      business.place_id &&
      shouldSyncReviews({
        place_id: business.place_id,
        last_synced_at: business.last_synced_at,
      })
    ) {
      triggerBackgroundSync(id, business.place_id)
    }

    // Fetch reviews
    const { data: reviews } = await supabase
      .from('reviews')
      .select('*, user:profiles(id, full_name, avatar_url)')
      .eq('business_id', id)
      .order('created_at', { ascending: false })
      .limit(50)

    // Fetch deals
    const { data: deals } = await supabase
      .from('deals')
      .select('*')
      .eq('business_id', id)
      .eq('is_active', true)
      .gte('end_date', new Date().toISOString())
      .or('end_date.is.null')

    // Check if user has bookmarked this business
    const { data: { user } } = await supabase.auth.getUser()
    let isBookmarked = false

    if (user) {
      const { data: bookmark } = await supabase
        .from('business_bookmarks')
        .select('id')
        .eq('business_id', id)
        .eq('user_id', user.id)
        .maybeSingle()

      isBookmarked = !!bookmark
    }

    return NextResponse.json({
      ...business,
      reviews: reviews || [],
      deals: deals || [],
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
