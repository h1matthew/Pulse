'use client'

import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { RotateCcw, Trophy } from 'lucide-react'
import type { Flashcard } from '@/types/flashcards'
import { shuffleArray } from '@/lib/utils/flashcardUtils'
import { cn } from '@/lib/utils'

interface MatchPair {
  id: string
  termId: string
  defId: string
  term: string
  definition: string
}

interface MatchModeProps {
  cards: Flashcard[]
  onComplete?: () => void
}

export function MatchMode({ cards, onComplete }: MatchModeProps) {
  const BATCH_SIZE = 6

  const [currentBatchIndex, setCurrentBatchIndex] = useState(0)
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null)
  const [selectedDef, setSelectedDef] = useState<string | null>(null)
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set())
  const [score, setScore] = useState(0)
  const [wrongMatch, setWrongMatch] = useState(false)

  // Create all pairs and shuffle them
  const allPairs = useMemo(() => {
    return cards.map(card => ({
      id: card.id,
      termId: `term-${card.id}`,
      defId: `def-${card.id}`,
      term: card.front,
      definition: card.back,
    }))
  }, [cards])

  // Get current batch
  const currentBatch = useMemo(() => {
    const start = currentBatchIndex * BATCH_SIZE
    const batchCards = allPairs.slice(start, start + BATCH_SIZE)

    if (batchCards.length === 0) return { terms: [], definitions: [] }

    // Shuffle terms and definitions separately
    return {
      terms: shuffleArray(batchCards.map(c => ({ id: c.termId, text: c.term, pairId: c.id }))),
      definitions: shuffleArray(batchCards.map(c => ({ id: c.defId, text: c.definition, pairId: c.id }))),
    }
  }, [currentBatchIndex, allPairs])

  const isComplete = matchedPairs.size === allPairs.length
  const batchComplete = matchedPairs.size > 0 && matchedPairs.size % BATCH_SIZE === 0 && !isComplete

  // Check for match when both are selected
  useEffect(() => {
    if (selectedTerm && selectedDef) {
      // Find the pair IDs
      const termPairId = currentBatch.terms.find(t => t.id === selectedTerm)?.pairId
      const defPairId = currentBatch.definitions.find(d => d.id === selectedDef)?.pairId

      if (termPairId === defPairId) {
        // Correct match!
        setMatchedPairs(prev => new Set([...prev, termPairId!]))
        setScore(prev => prev + 1)
        setSelectedTerm(null)
        setSelectedDef(null)
      } else {
        // Wrong match
        setWrongMatch(true)
        setTimeout(() => {
          setSelectedTerm(null)
          setSelectedDef(null)
          setWrongMatch(false)
        }, 600)
      }
    }
  }, [selectedTerm, selectedDef, currentBatch])

  // Auto-advance to next batch when current batch is complete
  useEffect(() => {
    if (batchComplete) {
      const timer = setTimeout(() => {
        setCurrentBatchIndex(prev => prev + 1)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [batchComplete])

  const handleTermClick = (id: string, pairId: string) => {
    if (matchedPairs.has(pairId)) return
    setSelectedTerm(selectedTerm === id ? null : id)
  }

  const handleDefClick = (id: string, pairId: string) => {
    if (matchedPairs.has(pairId)) return
    setSelectedDef(selectedDef === id ? null : id)
  }

  const handleRestart = () => {
    setCurrentBatchIndex(0)
    setSelectedTerm(null)
    setSelectedDef(null)
    setMatchedPairs(new Set())
    setScore(0)
  }

  if (cards.length < 2) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Need at least 2 cards for Match mode.</p>
        <p className="text-sm mt-2">Try Learn or Write mode!</p>
      </div>
    )
  }

  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <Trophy className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-xl font-semibold text-foreground">Perfect Score!</h3>
        <p className="text-muted-foreground">
          You matched all {cards.length} pairs!
        </p>
        <Button onClick={handleRestart} variant="outline" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Play Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Score */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Score: {score} / {allPairs.length}
        </span>
        <span className="text-muted-foreground">
          Batch {currentBatchIndex + 1}
        </span>
      </div>

      {/* Matching Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Terms Column */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground mb-2">Terms</p>
          {currentBatch.terms.map((item) => {
            const isMatched = matchedPairs.has(item.pairId)
            const isSelected = selectedTerm === item.id
            const showWrong = wrongMatch && isSelected

            return (
              <Button
                key={item.id}
                variant="outline"
                className={cn(
                  'w-full h-auto py-4 px-4 text-left whitespace-normal transition-all duration-150',
                  'hover:bg-muted/50 hover:border-primary/50 active:scale-[0.98]',
                  isMatched && 'opacity-30 pointer-events-none bg-green-50 dark:bg-green-950/30 border-green-500',
                  isSelected && !showWrong && 'border-primary border-2 bg-primary/20 ring-2 ring-primary/30 shadow-md',
                  showWrong && 'border-red-500 border-2 bg-red-100 dark:bg-red-950/50 animate-pulse'
                )}
                onClick={() => handleTermClick(item.id, item.pairId)}
                disabled={isMatched}
              >
                {item.text}
              </Button>
            )
          })}
        </div>

        {/* Definitions Column */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground mb-2">Definitions</p>
          {currentBatch.definitions.map((item) => {
            const isMatched = matchedPairs.has(item.pairId)
            const isSelected = selectedDef === item.id
            const showWrong = wrongMatch && isSelected

            return (
              <Button
                key={item.id}
                variant="outline"
                className={cn(
                  'w-full h-auto py-4 px-4 text-left whitespace-normal transition-all duration-150',
                  'hover:bg-muted/50 hover:border-primary/50 active:scale-[0.98]',
                  isMatched && 'opacity-30 pointer-events-none bg-green-50 dark:bg-green-950/30 border-green-500',
                  isSelected && !showWrong && 'border-primary border-2 bg-primary/20 ring-2 ring-primary/30 shadow-md',
                  showWrong && 'border-red-500 border-2 bg-red-100 dark:bg-red-950/50 animate-pulse'
                )}
                onClick={() => handleDefClick(item.id, item.pairId)}
                disabled={isMatched}
              >
                {item.text}
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
