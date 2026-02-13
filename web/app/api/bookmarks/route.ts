import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface CreateBookmarkInput {
  business_id: string
  note?: string
}

function validateBookmarkInput(body: unknown): { valid: true; data: CreateBookmarkInput } | { valid: false; error: string } {
  if (typeof body !== 'object' || body === null) {
    return { valid: false, error: 'Invalid input: expected object' }
  }

  const b = body as Record<string, unknown>

  if (typeof b.business_id !== 'string' || !b.business_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return { valid: false, error: 'Invalid business_id: expected valid UUID' }
  }

  if (b.note !== undefined && (typeof b.note !== 'string' || b.note.length > 500)) {
    return { valid: false, error: 'Invalid note: expected string with max 500 chars' }
  }

  return {
    valid: true,
    data: {
      business_id: b.business_id,
      note: b.note as string | undefined,
    },
  }
}

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

    const body = await request.json()
    const validation = validateBookmarkInput(body)

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
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
