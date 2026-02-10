import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Find similar flashcards for deduplication (admin only)
 * GET /api/admin/flashcards/[id]/similar
 */
export async function GET(
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

    // Get the flashcard to compare
    const { data: card, error: cardError } = await supabase
      .from('community_flashcards')
      .select('module_id, front')
      .eq('id', id)
      .single()

    if (cardError || !card) {
      return NextResponse.json({ error: 'Flashcard not found' }, { status: 404 })
    }

    // Call RPC function to find similar flashcards
    const { data: similarCards, error: similarError } = await supabase.rpc(
      'find_similar_flashcards',
      {
        p_module_id: card.module_id,
        p_front: card.front,
        p_limit: 5,
      }
    )

    if (similarError) {
      console.error('Error finding similar flashcards:', similarError)
      return NextResponse.json({ error: 'Failed to find similar flashcards' }, { status: 500 })
    }

    // Filter out the card itself
    const filteredCards = (similarCards || []).filter((c: any) => c.id !== id)

    return NextResponse.json({ similarCards: filteredCards })
  } catch (error) {
    console.error('Error in similar flashcards endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
