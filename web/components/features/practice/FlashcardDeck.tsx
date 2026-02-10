'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, RotateCcw, Lightbulb, CheckCircle, Check } from 'lucide-react'
import type { Flashcard, FlashcardRating } from '@/types/flashcards'
import { cn } from '@/lib/utils'

interface FlashcardDeckProps {
  cards: Flashcard[]
  onRate?: (cardId: string, rating: FlashcardRating) => void
  onMarkKnown?: (cardId: string) => Promise<void>
}

export function FlashcardDeck({ cards, onRate, onMarkKnown }: FlashcardDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [completedCards, setCompletedCards] = useState<Set<string>>(new Set())
  const [isMarkingKnown, setIsMarkingKnown] = useState(false)

  const currentCard = cards[currentIndex]
  const isComplete = completedCards.size === cards.length

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
    setShowHint(false)
  }

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setIsFlipped(false)
      setShowHint(false)
      ratingInProgress.current = false
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setIsFlipped(false)
      setShowHint(false)
    }
  }

  const ratingInProgress = useRef(false)

  const handleRate = (rating: FlashcardRating) => {
    if (ratingInProgress.current) return
    ratingInProgress.current = true
    if (onRate && currentCard) {
      onRate(currentCard.id, rating)
    }
    setCompletedCards(prev => new Set([...prev, currentCard.id]))

    // Auto-advance to next card
    if (currentIndex < cards.length - 1) {
      setTimeout(() => {
        handleNext()
      }, 300)
    }
  }

  const handleRestart = () => {
    setCurrentIndex(0)
    setIsFlipped(false)
    setShowHint(false)
    setCompletedCards(new Set())
  }

  const handleMarkKnown = async () => {
    if (!onMarkKnown || !currentCard) return

    const confirmed = window.confirm(
      'Mark this card as known? It will be excluded from future study sessions unless you choose to include known cards.'
    )

    if (!confirmed) return

    try {
      setIsMarkingKnown(true)
      await onMarkKnown(currentCard.id)

      // Show success message (in a real app, use a toast notification)
      alert('Card marked as known! It will be filtered out in future sessions.')

      // Auto-advance to next card or finish if last card
      if (currentIndex < cards.length - 1) {
        handleNext()
      } else {
        setCompletedCards(new Set([...completedCards, currentCard.id]))
      }
    } catch (error) {
      console.error('Error marking card as known:', error)
      alert('Failed to mark card as known. Please try again.')
    } finally {
      setIsMarkingKnown(false)
    }
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
        <p className="text-muted-foreground">You&apos;ve reviewed all {cards.length} cards.</p>
        <Button onClick={handleRestart} variant="outline" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Study Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Card {currentIndex + 1} of {cards.length}
        </span>
        <span className="text-muted-foreground">
          {completedCards.size} reviewed
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

      {/* Mark as Known button */}
      {onMarkKnown && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkKnown}
            disabled={isMarkingKnown}
            className="gap-2 text-muted-foreground hover:text-primary"
          >
            <Check className="h-4 w-4" />
            {isMarkingKnown ? 'Marking...' : 'I already know this'}
          </Button>
        </div>
      )}

      {/* Rating buttons - only show when flipped */}
      {isFlipped && (
        <div className="grid grid-cols-4 gap-2">
          <Button
            variant="outline"
            className="flex flex-col h-auto py-3 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950"
            onClick={() => handleRate('again')}
          >
            <span className="text-lg">😟</span>
            <span className="text-xs text-red-600 dark:text-red-400">Again</span>
          </Button>
          <Button
            variant="outline"
            className="flex flex-col h-auto py-3 border-orange-200 dark:border-orange-900 hover:bg-orange-50 dark:hover:bg-orange-950"
            onClick={() => handleRate('hard')}
          >
            <span className="text-lg">🤔</span>
            <span className="text-xs text-orange-600 dark:text-orange-400">Hard</span>
          </Button>
          <Button
            variant="outline"
            className="flex flex-col h-auto py-3 border-green-200 dark:border-green-900 hover:bg-green-50 dark:hover:bg-green-950"
            onClick={() => handleRate('good')}
          >
            <span className="text-lg">😊</span>
            <span className="text-xs text-green-600 dark:text-green-400">Good</span>
          </Button>
          <Button
            variant="outline"
            className="flex flex-col h-auto py-3 border-blue-200 dark:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-950"
            onClick={() => handleRate('easy')}
          >
            <span className="text-lg">🎉</span>
            <span className="text-xs text-blue-600 dark:text-blue-400">Easy</span>
          </Button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
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
          variant="ghost"
          size="sm"
          onClick={handleNext}
          disabled={currentIndex === cards.length - 1}
          className="gap-1"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
