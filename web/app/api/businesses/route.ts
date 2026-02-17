import { createClient } from '@/lib/supabase/server'
import { searchBusinesses } from '@/lib/google-places'
import { isRealBusinessRecord } from '@/lib/business/display'
import { NextResponse } from 'next/server'
import { createBusinessSchema, formatZodError } from '@/lib/validation'
import type { BusinessSearchFilters } from '@/types/business'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const filters: BusinessSearchFilters = {
    category: searchParams.get('category') || undefined,
    priceRange: searchParams.get('priceRange')?.split(',').map(Number),
    rating: searchParams.get('rating') ? Number(searchParams.get('rating')) : undefined,
    openNow: searchParams.get('openNow') === 'true',
    distance: searchParams.get('distance') ? Number(searchParams.get('distance')) : undefined,
    sortBy: (searchParams.get('sortBy') as BusinessSearchFilters['sortBy']) || 'rating',
  }

  const page = Number(searchParams.get('page')) || 1
  const limit = Number(searchParams.get('limit')) || 20
  const offset = (page - 1) * limit

  const supabase = await createClient()

  try {
    let query = supabase
      .from('businesses')
      .select('*, category:categories(*)', { count: 'exact' })

    // Apply filters
    if (filters.category) {
      query = query.eq('categories.slug', filters.category)
    }

    if (filters.priceRange && filters.priceRange.length > 0) {
      query = query.in('price_range', filters.priceRange)
    }

    if (filters.rating) {
      query = query.gte('average_rating', filters.rating)
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'rating':
        query = query.order('average_rating', { ascending: false })
        break
      case 'name':
        query = query.order('name', { ascending: true })
        break
      case 'review_count':
        query = query.order('review_count', { ascending: false })
        break
      default:
        query = query.order('average_rating', { ascending: false })
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: businesses, error, count } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch businesses' },
        { status: 500 }
      )
    }

    const filteredBusinesses = (businesses || []).filter((business) =>
      isRealBusinessRecord({
        data_source: business.data_source,
        tags: business.tags,
        name: business.name,
      })
    )

    return NextResponse.json({
      businesses: filteredBusinesses,
      total: count || 0,
      hasMore: count ? offset + limit < count : false,
    })
  } catch (error) {
    console.error('Error fetching businesses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validation = createBusinessSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: formatZodError(validation.error) },
        { status: 400 }
      )
    }

    const businessData = validation.data

    // Create slug from name
    const slug = businessData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const { data: business, error } = await supabase
      .from('businesses')
      .insert({
        ...businessData,
        slug,
        owner_id: user.id,
        data_source: 'user_added',
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to create business' },
        { status: 500 }
      )
    }

    return NextResponse.json(business, { status: 201 })
  } catch (error) {
    console.error('Error creating business:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
