import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncLeaderboardEntry } from '@/lib/leaderboard/syncLeaderboard'
import type { FlashcardRating, SM2Result } from '@/types/flashcards'

// SM-2 Algorithm implementation
function calculateSM2(
  rating: FlashcardRating,
  currentEaseFactor: number,
  currentInterval: number,
  currentRepetitions: number
): SM2Result {
  // Convert rating to quality (0-5 scale used in SM-2)
  const qualityMap: Record<FlashcardRating, number> = {
    again: 0,
    hard: 2,
    good: 4,
    easy: 5,
  }
  const quality = qualityMap[rating]

  let easeFactor = currentEaseFactor
  let interval = currentInterval
  let repetitions = currentRepetitions

  if (quality < 3) {
    // Failed - reset repetitions
    repetitions = 0
    interval = 1
  } else {
    // Successful recall
    if (repetitions === 0) {
      interval = 1
    } else if (repetitions === 1) {
      interval = 6
    } else {
      interval = Math.round(interval * easeFactor)
    }
    repetitions++
  }

  // Update ease factor (minimum 1.3)
  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  )

  // Calculate next review date
  const nextReviewAt = new Date()
  nextReviewAt.setDate(nextReviewAt.getDate() + interval)

  return {
    easeFactor,
    intervalDays: interval,
    repetitions,
    nextReviewAt: nextReviewAt.toISOString(),
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ progress: [] })
  }

  const moduleId = request.nextUrl.searchParams.get('moduleId')

  let query = supabase
    .from('user_flashcard_progress')
    .select('*')
    .eq('user_id', user.id)

  if (moduleId) {
    query = query.eq('module_id', moduleId)
  }

  const { data: progress, error } = await query

  if (error) {
    console.error('Error fetching flashcard progress:', error)
    return NextResponse.json({ error: 'Failed to fetch flashcard progress' }, { status: 500 })
  }

  return NextResponse.json(
    { progress: progress || [] },
    {
      headers: {
        'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
      },
    }
  )
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const {
      flashcardId,
      moduleId,
      rating,
      currentEaseFactor = 2.5,
      currentInterval = 1,
      currentRepetitions = 0,
    } = await request.json()

    if (!flashcardId || !moduleId || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Calculate new SM-2 values
    const nextReview = calculateSM2(
      rating as FlashcardRating,
      currentEaseFactor,
      currentInterval,
      currentRepetitions
    )

    // Upsert progress
    const { error: upsertError } = await supabase
      .from('user_flashcard_progress')
      .upsert({
        user_id: user.id,
        flashcard_id: flashcardId,
        module_id: moduleId,
        ease_factor: nextReview.easeFactor,
        interval_days: nextReview.intervalDays,
        repetitions: nextReview.repetitions,
        next_review_at: nextReview.nextReviewAt,
        last_reviewed_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,flashcard_id',
      })

    if (upsertError) {
      console.error('Error updating flashcard progress:', upsertError)
      return NextResponse.json({ error: 'Failed to update flashcard progress' }, { status: 500 })
    }

    // Sync leaderboard if card is now mastered (3+ repetitions)
    if (nextReview.repetitions >= 3) {
      await syncLeaderboardEntry(user.id, supabase)
    }

    return NextResponse.json({
      success: true,
      nextReview,
    })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
