import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createBookmarkSchema, formatZodError } from '@/lib/validation'
import { ensureProfile } from '@/lib/ensure-profile'

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

    const { data: bookmarks, error, count } = await supabase
      .from('business_bookmarks')
      .select(`
        *,
        business:businesses(*, category:categories(*))
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch bookmarks' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      bookmarks: bookmarks || [],
      total: count || 0,
      hasMore: count ? offset + limit < count : false,
    })
  } catch (error) {
    console.error('Error fetching bookmarks:', error)
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

    await ensureProfile(supabase, user)

    const body = await request.json()
    const validation = createBookmarkSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: formatZodError(validation.error) },
        { status: 400 }
      )
    }

    const { business_id, note } = validation.data

    // Check if bookmark already exists
    const { data: existing } = await supabase
      .from('business_bookmarks')
      .select('id')
      .eq('user_id', user.id)
      .eq('business_id', business_id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Business already bookmarked' },
        { status: 409 }
      )
    }

    // Create bookmark
    const { data: bookmark, error } = await supabase
      .from('business_bookmarks')
      .insert({
        user_id: user.id,
        business_id,
        note: note || null,
      })
      .select('*, business:businesses(*, category:categories(*))')
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to create bookmark' },
        { status: 500 }
      )
    }

    return NextResponse.json(bookmark, { status: 201 })
  } catch (error) {
    console.error('Error creating bookmark:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
