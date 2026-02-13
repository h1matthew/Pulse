import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface UpdateBookmarkInput {
  note?: string
}

function validateUpdateBookmarkInput(body: unknown): { valid: true; data: UpdateBookmarkInput } | { valid: false; error: string } {
  if (typeof body !== 'object' || body === null) {
    return { valid: false, error: 'Invalid input: expected object' }
  }

  const b = body as Record<string, unknown>

  if (b.note !== undefined && (typeof b.note !== 'string' || b.note.length > 500)) {
    return { valid: false, error: 'Invalid note: expected string with max 500 chars' }
  }

  return {
    valid: true,
    data: {
      note: b.note as string | undefined,
    },
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
    const { data: bookmark } = await supabase
      .from('business_bookmarks')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (!bookmark) {
      return NextResponse.json(
        { error: 'Bookmark not found' },
        { status: 404 }
      )
    }

    if (bookmark.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from('business_bookmarks')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to delete bookmark' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting bookmark:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
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
    const validation = validateUpdateBookmarkInput(body)

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Verify ownership
    const { data: bookmark } = await supabase
      .from('business_bookmarks')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (!bookmark) {
      return NextResponse.json(
        { error: 'Bookmark not found' },
        { status: 404 }
      )
    }

    if (bookmark.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { data: updated, error } = await supabase
      .from('business_bookmarks')
      .update(validation.data)
      .eq('id', id)
      .select('*, business:businesses(*, category:categories(*))')
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to update bookmark' },
        { status: 500 }
      )
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating bookmark:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
