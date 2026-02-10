import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Update a community flashcard (admin only)
 * PATCH /api/admin/flashcards/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { front, back, hint, difficulty } = body

    // Validate inputs
    const updates: any = {}
    if (front !== undefined) updates.front = front
    if (back !== undefined) updates.back = back
    if (hint !== undefined) updates.hint = hint
    if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
      updates.difficulty = difficulty
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Update flashcard
    const { data: updatedCard, error } = await supabase
      .from('community_flashcards')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating flashcard:', error)
      return NextResponse.json({ error: 'Failed to update flashcard' }, { status: 500 })
    }

    return NextResponse.json({ card: updatedCard })
  } catch (error) {
    console.error('Error in update flashcard endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
