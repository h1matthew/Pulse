import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface CreateReviewInput {
  business_id: string
  rating: number
  content: string
  photos?: string[]
}

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

function isValidUrl(str: string): boolean {
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

function validateReviewInput(body: unknown): { valid: true; data: CreateReviewInput } | { valid: false; error: string } {
  if (typeof body !== 'object' || body === null) {
    return { valid: false, error: 'Invalid input: expected object' }
  }

  const b = body as Record<string, unknown>

  if (typeof b.business_id !== 'string' || !isValidUUID(b.business_id)) {
    return { valid: false, error: 'Invalid business_id: expected valid UUID' }
  }

  if (typeof b.rating !== 'number' || b.rating < 1 || b.rating > 5) {
    return { valid: false, error: 'Invalid rating: expected number between 1 and 5' }
  }

  if (typeof b.content !== 'string' || b.content.length < 10 || b.content.length > 2000) {
    return { valid: false, error: 'Invalid content: expected string between 10 and 2000 chars' }
  }

  if (b.photos !== undefined) {
    if (!Array.isArray(b.photos) || b.photos.length > 5) {
      return { valid: false, error: 'Invalid photos: expected array with max 5 items' }
    }
    if (!b.photos.every(p => typeof p === 'string' && isValidUrl(p))) {
      return { valid: false, error: 'Invalid photos: expected array of valid URLs' }
    }
  }

  return {
    valid: true,
    data: {
      business_id: b.business_id,
      rating: b.rating,
      content: b.content,
      photos: b.photos as string[] | undefined,
    },
  }
}

export async function GET(request: Request) {
  const supabase = await createClient()

  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const userId = searchParams.get('userId')
    const page = Number(searchParams.get('page')) || 1
    const limit = Number(searchParams.get('limit')) || 10
    const offset = (page - 1) * limit
    const sortBy = searchParams.get('sortBy') || 'newest'

    let query = supabase
      .from('reviews')
      .select(`
        *,
        user:profiles(id, full_name, avatar_url)
      `, { count: 'exact' })

    if (businessId) {
      query = query.eq('business_id', businessId)
    }

    if (userId) {
      query = query.eq('user_id', userId)
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        query = query.order('created_at', { ascending: false })
        break
      case 'oldest':
        query = query.order('created_at', { ascending: true })
        break
      case 'highest':
        query = query.order('rating', { ascending: false })
        break
      case 'lowest':
        query = query.order('rating', { ascending: true })
        break
      case 'helpful':
        query = query.order('helpful_count', { ascending: false })
        break
      default:
        query = query.order('created_at', { ascending: false })
    }

    query = query.range(offset, offset + limit - 1)

    const { data: reviews, error, count } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch reviews' },
        { status: 500 }
      )
    }

    // Get current user's review if authenticated
    const { data: { user } } = await supabase.auth.getUser()
    let userReview = null

    if (user && businessId) {
      const { data: userRev } = await supabase
        .from('reviews')
        .select(`
          *,
          user:profiles(id, full_name, avatar_url)
        `)
        .eq('business_id', businessId)
        .eq('user_id', user.id)
        .single()

      userReview = userRev
    }

    return NextResponse.json({
      reviews: reviews || [],
      total: count || 0,
      hasMore: count ? offset + limit < count : false,
      userReview,
    })
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validation = validateReviewInput(body)

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const { business_id, rating, content, photos } = validation.data

    // Check if user already reviewed this business
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('business_id', business_id)
      .eq('user_id', user.id)
      .single()

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this business' },
        { status: 409 }
      )
    }

    // Check for verified purchase (has a check-in)
    const { data: checkIn } = await supabase
      .from('business_check_ins')
      .select('id')
      .eq('business_id', business_id)
      .eq('user_id', user.id)
      .limit(1)

    const verified_purchase = checkIn && checkIn.length > 0

    // Create review
    const { data: review, error } = await supabase
      .from('reviews')
      .insert({
        business_id,
        user_id: user.id,
        rating,
        content,
        photos: photos || [],
        verified_purchase,
      })
      .select(`
        *,
        user:profiles(id, full_name, avatar_url)
      `)
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to create review' },
        { status: 500 }
      )
    }

    return NextResponse.json(review, { status: 201 })
  } catch (error) {
    console.error('Error creating review:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
