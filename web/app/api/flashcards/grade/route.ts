import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { gradeWrittenAnswer } from '@/lib/gemini'

/**
 * Calculate enhanced SM-2 algorithm with AI score adjustment
 */
function calculateSM2Enhanced(params: {
  quality: number
  aiScore?: number
  currentEaseFactor: number
  currentInterval: number
  currentRepetitions: number
}): {
  easeFactor: number
  intervalDays: number
  repetitions: number
  nextReviewAt: string
} {
  let { quality, aiScore, currentEaseFactor, currentInterval, currentRepetitions } = params

  // Adjust quality based on AI score if available
  if (aiScore !== undefined && quality > 0) {
    if (aiScore >= 0.95) {
      quality = Math.min(5, quality + 0.5)
    } else if (aiScore >= 0.85) {
      // No adjustment needed
    } else if (aiScore >= 0.70) {
      quality = Math.max(2, quality - 0.5)
    } else {
      quality = Math.max(1, quality - 1)
    }
  }

  let easeFactor = currentEaseFactor
  let interval = currentInterval
  let repetitions = currentRepetitions

  // Standard SM-2 algorithm
  if (quality < 3) {
    // Failed - reset progress
    repetitions = 0
    interval = 1
  } else {
    // Successful recall
    if (repetitions === 0) {
      interval = 1
    } else if (repetitions === 1) {
      interval = 6
    } else {
      interval = Math.round(currentInterval * currentEaseFactor)
    }

    repetitions += 1

    // Update ease factor
    easeFactor = currentEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    easeFactor = Math.max(1.3, easeFactor)
  }

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
    const { flashcardId, userAnswer, correctAnswer, hint, moduleId } = body

    // Validate inputs
    if (!flashcardId || !userAnswer || !correctAnswer || !moduleId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get the flashcard question for context
    const question = body.question || 'Answer the flashcard question'

    // Grade the answer using Gemini AI
    const gradingResult = await gradeWrittenAnswer({
      question,
      userAnswer: userAnswer.trim(),
      correctAnswer,
      hint,
      moduleContext: `Module ${moduleId}`,
    })

    // Get current flashcard progress (if exists)
    const { data: existingProgress } = await supabase
      .from('user_flashcard_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('flashcard_id', flashcardId)
      .single()

    // Calculate SM-2 with enhanced algorithm
    const sm2Result = calculateSM2Enhanced({
      quality: gradingResult.quality,
      aiScore: gradingResult.score,
      currentEaseFactor: existingProgress?.ease_factor || 2.5,
      currentInterval: existingProgress?.interval_days || 1,
      currentRepetitions: existingProgress?.repetitions || 0,
    })

    // Update or insert flashcard progress
    const { error: progressError } = await supabase
      .from('user_flashcard_progress')
      .upsert(
        {
          user_id: user.id,
          flashcard_id: flashcardId,
          module_id: moduleId,
          ease_factor: sm2Result.easeFactor,
          interval_days: sm2Result.intervalDays,
          repetitions: sm2Result.repetitions,
          next_review_at: sm2Result.nextReviewAt,
          last_reviewed_at: new Date().toISOString(),
          is_ai_generated: body.isAiGenerated || false,
          last_ai_score: gradingResult.score,
        },
        {
          onConflict: 'user_id,flashcard_id',
        }
      )

    if (progressError) {
      console.error('Error updating flashcard progress:', progressError)
      return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 })
    }

    // Save grading history
    const { error: historyError } = await supabase.from('ai_grading_history').insert({
      user_id: user.id,
      flashcard_id: flashcardId,
      user_answer: userAnswer,
      correct_answer: correctAnswer,
      ai_score: gradingResult.score,
      ai_feedback: gradingResult.feedback,
      was_correct: gradingResult.wasCorrect,
    })

    if (historyError) {
      console.error('Error saving grading history:', historyError)
      // Don't fail the request if history save fails
    }

    // Increment usage count for AI-generated cards
    if (body.isAiGenerated) {
      await supabase.rpc('increment_flashcard_usage', { card_id: flashcardId })
    }

    return NextResponse.json({
      result: gradingResult,
      nextReview: sm2Result,
    })
  } catch (error) {
    console.error('Error grading flashcard:', error)
    return NextResponse.json(
      { error: 'Failed to grade answer', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
