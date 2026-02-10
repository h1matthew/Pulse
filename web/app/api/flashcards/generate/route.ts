import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateFlashcards } from '@/lib/gemini'
import { findDuplicates, generateFlashcardId } from '@/lib/utils/flashcardDeduplication'
import { getModuleLessonContent } from '@/lib/content/utils'

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

    // Rate limiting is now handled by middleware

    // Parse request body
    const body = await request.json()
    const { moduleId, lessonIds, count, difficulty } = body

    // Validate inputs
    if (!moduleId || !lessonIds || !Array.isArray(lessonIds) || lessonIds.length === 0) {
      return NextResponse.json({ error: 'Invalid module or lesson IDs' }, { status: 400 })
    }

    if (!count || count < 1 || count > 30) {
      return NextResponse.json({ error: 'Count must be between 1 and 30' }, { status: 400 })
    }

    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return NextResponse.json({ error: 'Invalid difficulty level' }, { status: 400 })
    }

    // Fetch lesson content using the utility function that properly maps module IDs to content
    const lessonContent = getModuleLessonContent(moduleId, lessonIds, { excludeQuizzes: true })

    if (!lessonContent || lessonContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'No content found for specified lessons' },
        { status: 404 }
      )
    }

    // Generate flashcards using Gemini
    const generatedCards = await generateFlashcards({
      lessonContent,
      count,
      difficulty,
      moduleId,
      lessonIds,
    })

    // Fetch existing AI flashcards for duplicate detection
    const { data: existingCards } = await supabase
      .from('ai_generated_flashcards')
      .select('front, back, flashcard_id')
      .eq('module_id', moduleId)

    const existingCardsForComparison = existingCards || []

    // Filter out duplicates and prepare for insertion
    const uniqueCards: any[] = []
    const skippedCount = { duplicates: 0 }

    for (const card of generatedCards) {
      // Check for duplicates
      const duplicates = findDuplicates(
        card.front,
        card.back,
        existingCardsForComparison.map((c) => ({ front: c.front, back: c.back })),
        0.9 // 90% similarity threshold
      )

      if (duplicates.length > 0) {
        skippedCount.duplicates++
        continue
      }

      // Generate unique ID
      const flashcardId = generateFlashcardId(card.front, card.back)

      uniqueCards.push({
        flashcard_id: flashcardId,
        module_id: moduleId,
        lesson_ids: lessonIds,
        front: card.front,
        back: card.back,
        hint: card.hint || null,
        difficulty,
        created_by_user_id: user.id,
        usage_count: 0,
      })

      // Add to comparison list for subsequent cards
      existingCardsForComparison.push({
        front: card.front,
        back: card.back,
        flashcard_id: flashcardId,
      })
    }

    // Insert unique cards into database
    if (uniqueCards.length > 0) {
      const { data: insertedCards, error: insertError } = await supabase
        .from('ai_generated_flashcards')
        .insert(uniqueCards)
        .select()

      if (insertError) {
        console.error('Error inserting flashcards:', insertError)
        return NextResponse.json({ error: 'Failed to save flashcards' }, { status: 500 })
      }

      // Also submit to community review queue (best effort - don't fail if this errors)
      try {
        const communityCards = uniqueCards.map((card) => ({
          module_id: card.module_id,
          front: card.front,
          back: card.back,
          hint: card.hint,
          difficulty: card.difficulty,
          status: 'pending' as const,
          submitted_by: user.id,
        }))

        await supabase
          .from('community_flashcards')
          .insert(communityCards)
          .select()
      } catch (communityError) {
        // Log but don't fail the request
        console.warn('Failed to submit to community review queue:', communityError)
      }

      // Transform to match Flashcard interface
      const formattedCards = insertedCards.map((card: any) => ({
        id: card.flashcard_id,
        moduleId: card.module_id,
        front: card.front,
        back: card.back,
        hint: card.hint,
        isAiGenerated: true,
        difficulty: card.difficulty,
      }))

      return NextResponse.json({
        cards: formattedCards,
        generated: uniqueCards.length,
        skipped: skippedCount.duplicates,
        message: `Generated ${uniqueCards.length} flashcards${skippedCount.duplicates > 0 ? `, skipped ${skippedCount.duplicates} duplicates` : ''}`,
      })
    } else {
      return NextResponse.json({
        cards: [],
        generated: 0,
        skipped: skippedCount.duplicates,
        message: 'All generated flashcards were duplicates',
      })
    }
  } catch (error) {
    console.error('Error generating flashcards:', error)
    return NextResponse.json(
      { error: 'Failed to generate flashcards' },
      { status: 500 }
    )
  }
}
