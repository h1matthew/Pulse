'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, RotateCcw, Lightbulb, CheckCircle, Check } from 'lucide-react'
import type { Flashcard } from '@/types/flashcards'
import { cn } from '@/lib/utils'

interface FlashcardsModeProps {
  cards: Flashcard[]
  onComplete?: () => void
  onMarkKnown?: (cardId: string) => Promise<void>
}

/**
 * FlashcardsMode - Traditional flip-card study mode with spaced repetition
 * Users flip cards at their own pace and can mark cards as known
 */
export function FlashcardsMode({ cards, onComplete, onMarkKnown }: FlashcardsModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [knownCards, setKnownCards] = useState<Set<string>>(new Set())
  const [isMarkingKnown, setIsMarkingKnown] = useState(false)

  const currentCard = cards[currentIndex]
  const isComplete = currentIndex >= cards.length - 1 && isFlipped

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
    setShowHint(false)
  }

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setIsFlipped(false)
      setShowHint(false)
    } else if (onComplete) {
      onComplete()
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setIsFlipped(false)
      setShowHint(false)
    }
  }

  const handleMarkKnown = async () => {
    if (!currentCard) return

    const isCurrentlyKnown = knownCards.has(currentCard.id)

    // Update local state immediately for UI feedback
    setKnownCards((prev) => {
      const next = new Set(prev)
      if (isCurrentlyKnown) {
        next.delete(currentCard.id)
      } else {
        next.add(currentCard.id)
      }
      return next
    })

    // Call API if callback provided (only when marking as known, not unmarking)
    if (onMarkKnown && !isCurrentlyKnown) {
      try {
        setIsMarkingKnown(true)
        await onMarkKnown(currentCard.id)
      } catch (error) {
        console.error('Error marking card as known:', error)
        // Revert local state on error
        setKnownCards((prev) => {
          const next = new Set(prev)
          next.delete(currentCard.id)
          return next
        })
        alert('Failed to mark card as known. Please try again.')
      } finally {
        setIsMarkingKnown(false)
      }
    }
  }

  const handleRestart = () => {
    setCurrentIndex(0)
    setIsFlipped(false)
    setShowHint(false)
  }

  if (!currentCard) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No flashcards available.
      </div>
    )
  }

  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-xl font-semibold text-foreground">Session Complete!</h3>
        <p className="text-muted-foreground">
          You&apos;ve reviewed all {cards.length} cards.
        </p>
        {knownCards.size > 0 && (
          <p className="text-sm text-muted-foreground">
            {knownCards.size} marked as known
          </p>
        )}
        <Button onClick={handleRestart} variant="outline" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Study Again
        </Button>
      </div>
    )
  }

  const isKnown = knownCards.has(currentCard.id)

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Card {currentIndex + 1} of {cards.length}
        </span>
        <span className="text-muted-foreground">
          {knownCards.size} known
        </span>
      </div>

      {/* Card */}
      <div
        className={cn(
          'relative min-h-[280px] cursor-pointer rounded-xl border border-border/50 bg-card p-6 transition-all duration-300',
          'hover:shadow-lg hover:border-primary/20',
          isFlipped && 'bg-primary/5'
        )}
        onClick={handleFlip}
      >
        <div className="flex flex-col items-center justify-center min-h-[200px] text-center">
          {!isFlipped ? (
            <>
              <p className="text-xs text-muted-foreground mb-4">QUESTION</p>
              <p className="text-xl font-medium text-foreground">{currentCard.front}</p>

              {currentCard.hint && !showHint && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4 gap-1 text-muted-foreground"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowHint(true)
                  }}
                >
                  <Lightbulb className="h-4 w-4" />
                  Show Hint
                </Button>
              )}

              {showHint && currentCard.hint && (
                <p className="mt-4 text-sm text-muted-foreground italic">
                  Hint: {currentCard.hint}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-4">ANSWER</p>
              <p className="text-lg text-foreground">{currentCard.back}</p>
            </>
          )}
        </div>

        <p className="absolute bottom-4 left-0 right-0 text-center text-xs text-muted-foreground">
          {isFlipped ? 'Tap to see question' : 'Tap to reveal answer'}
        </p>
      </div>

      {/* Mark as Known - only show when flipped */}
      {isFlipped && (
        <Button
          variant="outline"
          className={cn(
            'w-full transition-all',
            isKnown && 'border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400'
          )}
          onClick={handleMarkKnown}
          disabled={isMarkingKnown}
        >
          {isKnown ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Marked as Known
            </>
          ) : isMarkingKnown ? (
            'Marking...'
          ) : (
            'Mark as Known'
          )}
        </Button>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleNext}
          className="gap-1"
        >
          {currentIndex === cards.length - 1 ? 'Finish' : 'Next'}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
