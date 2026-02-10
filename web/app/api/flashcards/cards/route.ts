import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FLASHCARDS } from '@/lib/content/flashcards'
import type { Flashcard } from '@/types/flashcards'

/**
 * Fetch flashcards for a module with optional AI generation and knowledge filtering
 * GET /api/flashcards/cards?moduleId=X&includeAI=true&excludeKnown=true
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const moduleId = searchParams.get('moduleId')
    const includeAI = searchParams.get('includeAI') === 'true'
    const excludeKnown = searchParams.get('excludeKnown') === 'true'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10) || 50))

    // Get authenticated user (optional for reading cards, required for filtering)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Start with hardcoded flashcards
    let cards: Flashcard[] = []

    if (moduleId) {
      // Filter by module
      cards = FLASHCARDS.filter((card) => card.moduleId === moduleId)
    } else {
      // Return all hardcoded cards
      cards = [...FLASHCARDS]
    }

    // Include approved community flashcards with pagination
    try {
      const offset = (page - 1) * pageSize
      let communityQuery = supabase
        .from('community_flashcards')
        .select('*', { count: 'exact' })
        .eq('status', 'approved')
        .range(offset, offset + pageSize - 1)

      if (moduleId) {
        communityQuery = communityQuery.eq('module_id', moduleId)
      }

      const { data: communityCards, error: communityError } = await communityQuery

      if (!communityError && communityCards && communityCards.length > 0) {
        const transformedCommunityCards: Flashcard[] = communityCards.map((card) => ({
          id: card.id,
          moduleId: card.module_id,
          front: card.front,
          back: card.back,
          hint: card.hint || undefined,
          isAiGenerated: true, // Mark as AI-generated since they came from AI generation
          difficulty: card.difficulty as 'easy' | 'medium' | 'hard',
        }))

        cards = [...cards, ...transformedCommunityCards]
      }
    } catch (communityError) {
      // Log but don't fail the request
      console.warn('Failed to fetch community flashcards:', communityError)
    }

    // Include AI-generated flashcards if requested with pagination
    if (includeAI) {
      const offset = (page - 1) * pageSize
      let aiQuery = supabase
        .from('ai_generated_flashcards')
        .select('*')
        .range(offset, offset + pageSize - 1)

      if (moduleId) {
        aiQuery = aiQuery.eq('module_id', moduleId)
      }

      const { data: aiCards, error: aiError } = await aiQuery

      if (aiError) {
        console.error('Error fetching AI flashcards:', aiError)
      } else if (aiCards && aiCards.length > 0) {
        // Transform AI cards to match Flashcard interface
        const transformedAICards: Flashcard[] = aiCards.map((card) => ({
          id: card.flashcard_id,
          moduleId: card.module_id,
          front: card.front,
          back: card.back,
          hint: card.hint || undefined,
          isAiGenerated: true,
          difficulty: card.difficulty as 'easy' | 'medium' | 'hard',
        }))

        cards = [...cards, ...transformedAICards]
      }
    }

    // Filter out known cards if requested and user is authenticated
    if (excludeKnown && user) {
      let knownQuery = supabase
        .from('user_flashcard_knowledge')
        .select('flashcard_id')
        .eq('user_id', user.id)

      if (moduleId) {
        knownQuery = knownQuery.eq('module_id', moduleId)
      }

      const { data: knownCards, error: knownError } = await knownQuery

      if (knownError) {
        console.error('Error fetching known flashcards:', knownError)
      } else if (knownCards && knownCards.length > 0) {
        const knownCardIds = new Set(knownCards.map((k) => k.flashcard_id))
        cards = cards.filter((card) => !knownCardIds.has(card.id))
      }
    }

    return NextResponse.json({
      cards,
      count: cards.length,
      page,
      pageSize,
    })
  } catch (error) {
    console.error('Error fetching flashcards:', error)
    return NextResponse.json(
      { error: 'Failed to fetch flashcards', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
