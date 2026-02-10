import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Mark a flashcard as known or unknown
 * POST: Add/remove knowledge marker
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { flashcardId, moduleId, isKnown, isAiGenerated } = body

    // Validate inputs
    if (!flashcardId || !moduleId || typeof isKnown !== 'boolean') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (isKnown) {
      // Mark as known - insert into knowledge table
      const { error: insertError } = await supabase
        .from('user_flashcard_knowledge')
        .insert({
          user_id: user.id,
          flashcard_id: flashcardId,
          module_id: moduleId,
          is_ai_generated: isAiGenerated || false,
        })
        .select()
        .single()

      if (insertError) {
        // Check if it's a unique constraint violation (already marked)
        if (insertError.code === '23505') {
          return NextResponse.json({
            message: 'Flashcard already marked as known',
            success: true,
          })
        }

        console.error('Error marking flashcard as known:', insertError)
        return NextResponse.json({ error: 'Failed to mark flashcard as known' }, { status: 500 })
      }

      return NextResponse.json({
        message: 'Flashcard marked as known',
        success: true,
      })
    } else {
      // Mark as unknown - remove from knowledge table
      const { error: deleteError } = await supabase
        .from('user_flashcard_knowledge')
        .delete()
        .eq('user_id', user.id)
        .eq('flashcard_id', flashcardId)

      if (deleteError) {
        console.error('Error unmarking flashcard:', deleteError)
        return NextResponse.json({ error: 'Failed to unmark flashcard' }, { status: 500 })
      }

      return NextResponse.json({
        message: 'Flashcard unmarked as known',
        success: true,
      })
    }
  } catch (error) {
    console.error('Error updating flashcard knowledge:', error)
    return NextResponse.json(
      { error: 'Failed to update knowledge', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Get known flashcard IDs for a module
 * GET: Retrieve user's known flashcards
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get module ID from query params
    const { searchParams } = new URL(request.url)
    const moduleId = searchParams.get('moduleId')

    if (!moduleId) {
      return NextResponse.json({ error: 'Module ID is required' }, { status: 400 })
    }

    // Fetch known flashcard IDs for the module
    const { data: knownCards, error } = await supabase
      .from('user_flashcard_knowledge')
      .select('flashcard_id, is_ai_generated, marked_known_at')
      .eq('user_id', user.id)
      .eq('module_id', moduleId)

    if (error) {
      console.error('Error fetching known flashcards:', error)
      return NextResponse.json({ error: 'Failed to fetch known flashcards' }, { status: 500 })
    }

    return NextResponse.json({
      knownCardIds: knownCards.map((card) => card.flashcard_id),
      knownCards,
    })
  } catch (error) {
    console.error('Error fetching flashcard knowledge:', error)
    return NextResponse.json(
      { error: 'Failed to fetch knowledge', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
