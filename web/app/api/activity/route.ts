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

    // Fetch recent check-ins with business names
    const { data: checkIns, error: checkInsError } = await supabase
      .from('business_check_ins')
      .select(`
        id,
        created_at,
        spend_amount,
        businesses (name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (checkInsError) {
      console.error('Error fetching check-ins:', checkInsError)
    }

    // Fetch recent reviews with business names
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select(`
        id,
        created_at,
        businesses (name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError)
    }

    // Fetch recent bookmarks with business names
    const { data: bookmarks, error: bookmarksError } = await supabase
      .from('business_bookmarks')
      .select(`
        id,
        created_at,
        businesses (name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (bookmarksError) {
      console.error('Error fetching bookmarks:', bookmarksError)
    }

    // Fetch recent deal claims with business and deal info
    const { data: dealClaims, error: dealClaimsError } = await supabase
      .from('deal_claims')
      .select(`
        id,
        created_at,
        deals (title, businesses (name))
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (dealClaimsError) {
      console.error('Error fetching deal claims:', dealClaimsError)
    }

    // Combine and format all activities
    // Note: Supabase returns one-to-one relationships as arrays with single elements
    const activities = [
      ...(checkIns?.map((checkIn) => ({
        id: `check-in-${checkIn.id}`,
        type: 'check_in' as const,
        business: (checkIn.businesses as unknown as { name: string }[] | null)?.[0]?.name || 'Unknown Business',
        time: checkIn.created_at,
        impact: 5,
      })) || []),
      ...(reviews?.map((review) => ({
        id: `review-${review.id}`,
        type: 'review' as const,
        business: (review.businesses as unknown as { name: string }[] | null)?.[0]?.name || 'Unknown Business',
        time: review.created_at,
        impact: 25,
      })) || []),
      ...(bookmarks?.map((bookmark) => ({
        id: `bookmark-${bookmark.id}`,
        type: 'bookmark' as const,
        business: (bookmark.businesses as unknown as { name: string }[] | null)?.[0]?.name || 'Unknown Business',
        time: bookmark.created_at,
        impact: 2,
      })) || []),
      ...(dealClaims?.map((claim) => ({
        id: `deal-${claim.id}`,
        type: 'deal_claimed' as const,
        business: ((claim.deals as unknown as { businesses: { name: string }[] }[] | null)?.[0]?.businesses?.[0]?.name) || 'Unknown Business',
        time: claim.created_at,
        impact: 10,
      })) || []),
    ]

    // Sort by time (newest first) and take top 10
    activities.sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
    )

    // Format time as relative
    const formattedActivities = activities.slice(0, 10).map((activity) => ({
      ...activity,
      time: formatRelativeTime(activity.time),
    }))

    return NextResponse.json(formattedActivities)
  } catch (error) {
    console.error('Error in activity API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}
