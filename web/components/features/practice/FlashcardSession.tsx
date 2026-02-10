'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { FlashcardDeck } from './FlashcardDeck'
import type { Flashcard, FlashcardRating } from '@/types/flashcards'
import { Loader2 } from 'lucide-react'

export interface FlashcardProgress {
  flashcard_id: string
  ease_factor: number
  interval_days: number
  repetitions: number
  next_review_at: string
}

interface FlashcardSessionProps {
  cards: Flashcard[]
  moduleId: string
  onSessionComplete?: () => void
  initialProgress?: Record<string, FlashcardProgress>
  onProgressUpdate?: (cardId: string, progress: FlashcardProgress) => void
}

export function FlashcardSession({ cards, moduleId, onSessionComplete, initialProgress, onProgressUpdate }: FlashcardSessionProps) {
  const [progress, setProgress] = useState<Record<string, FlashcardProgress>>(initialProgress ?? {})
  const [loading, setLoading] = useState(!initialProgress)

  // Fetch existing progress only if not provided via props
  useEffect(() => {
    if (initialProgress) return

    async function fetchProgress() {
      try {
        const res = await fetch(`/api/flashcards?moduleId=${moduleId}`)
        if (res.ok) {
          const data = await res.json()
          const progressMap: Record<string, FlashcardProgress> = {}
          for (const p of data.progress || []) {
            progressMap[p.flashcard_id] = p
          }
          setProgress(progressMap)
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false)
      }
    }

    fetchProgress()
  }, [moduleId, initialProgress])

  const ratingRef = useRef<Set<string>>(new Set())

  const handleRate = useCallback(async (cardId: string, rating: FlashcardRating) => {
    const card = cards.find(c => c.id === cardId)
    if (!card) return
    if (ratingRef.current.has(cardId)) return
    ratingRef.current.add(cardId)

    const existingProgress = progress[cardId]

    try {
      const res = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flashcardId: cardId,
          moduleId: card.moduleId,
          rating,
          currentEaseFactor: existingProgress?.ease_factor ?? 2.5,
          currentInterval: existingProgress?.interval_days ?? 1,
          currentRepetitions: existingProgress?.repetitions ?? 0,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const newProgress: FlashcardProgress = {
          flashcard_id: cardId,
          ease_factor: data.nextReview.easeFactor,
          interval_days: data.nextReview.intervalDays,
          repetitions: data.nextReview.repetitions,
          next_review_at: data.nextReview.nextReviewAt,
        }
        setProgress(prev => ({
          ...prev,
          [cardId]: newProgress,
        }))
        onProgressUpdate?.(cardId, newProgress)
      }
    } catch {
      // Silently fail - progress not saved but user can continue
    } finally {
      ratingRef.current.delete(cardId)
    }
  }, [cards, progress, onProgressUpdate])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <FlashcardDeck
      cards={cards}
      onRate={handleRate}
    />
  )
}
