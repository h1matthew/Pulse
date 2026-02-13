import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface UpdateReviewInput {
  rating?: number
  content?: string
  photos?: string[]
}

function isValidUrl(str: string): boolean {
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

function validateUpdateReviewInput(body: unknown): { valid: true; data: UpdateReviewInput } | { valid: false; error: string } {
  if (typeof body !== 'object' || body === null) {
    return { valid: false, error: 'Invalid input: expected object' }
  }

  const b = body as Record<string, unknown>

  if (b.rating !== undefined && (typeof b.rating !== 'number' || b.rating < 1 || b.rating > 5)) {
    return { valid: false, error: 'Invalid rating: expected number between 1 and 5' }
  }

  if (b.content !== undefined && (typeof b.content !== 'string' || b.content.length < 10 || b.content.length > 2000)) {
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
      rating: b.rating as number | undefined,
      content: b.content as string | undefined,
      photos: b.photos as string[] | undefined,
    },
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validation = validateUpdateReviewInput(body)

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Verify ownership
    const { data: review } = await supabase
      .from('reviews')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    if (review.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { data: updated, error } = await supabase
      .from('reviews')
      .update({
        ...validation.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        user:profiles(id, full_name, avatar_url)
      `)
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to update review' },
        { status: 500 }
      )
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating review:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify ownership
    const { data: review } = await supabase
      .from('reviews')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    if (review.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to delete review' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting review:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
