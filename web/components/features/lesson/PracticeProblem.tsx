'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, Lightbulb, Eye, PenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InlineLatex } from './InlineLatex'
import { cn } from '@/lib/utils'

interface PracticeProblemProps {
  question: string
  answer: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  revealMode?: 'click' | 'input' | 'hints'
  hints?: string[]
  inputPlaceholder?: string
}

const difficultyColors = {
  beginner: 'bg-green-500/10 text-green-600 border-green-500/30',
  intermediate: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  advanced: 'bg-red-500/10 text-red-600 border-red-500/30',
}

const difficultyLabels = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

export function PracticeProblem({
  question,
  answer,
  difficulty = 'beginner',
  revealMode = 'click',
  hints = [],
  inputPlaceholder = 'Enter your answer...',
}: PracticeProblemProps) {
  const [revealed, setRevealed] = useState(false)
  const [currentHintIndex, setCurrentHintIndex] = useState(-1)
  const [userInput, setUserInput] = useState('')
  const [isChecked, setIsChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  const showNextHint = () => {
    if (currentHintIndex < hints.length - 1) {
      setCurrentHintIndex(currentHintIndex + 1)
    } else {
      // All hints shown, reveal answer
      setRevealed(true)
    }
  }

  const checkAnswer = () => {
    // Normalize both answers for comparison
    const normalizedUser = userInput.toLowerCase().trim().replace(/\s+/g, '')
    const normalizedAnswer = answer.toLowerCase().trim().replace(/\s+/g, '')

    // Also try comparing without LaTeX delimiters
    const cleanUser = normalizedUser.replace(/\$/g, '').replace(/\\text\{([^}]*)\}/g, '$1')
    const cleanAnswer = normalizedAnswer.replace(/\$/g, '').replace(/\\text\{([^}]*)\}/g, '$1')

    const correct = normalizedUser === normalizedAnswer || cleanUser === cleanAnswer
    setIsCorrect(correct)
    setIsChecked(true)
    if (correct) {
      setRevealed(true)
    }
  }

  const reset = () => {
    setRevealed(false)
    setCurrentHintIndex(-1)
    setUserInput('')
    setIsChecked(false)
    setIsCorrect(false)
  }

  return (
    <div className="my-4 rounded-lg border border-border/50 bg-card p-4">
      {/* Header with difficulty badge */}
      <div className="flex items-center gap-2 mb-3">
        <PenLine className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Practice Problem</span>
        <span className={cn(
          "text-xs px-2 py-0.5 rounded-full border",
          difficultyColors[difficulty]
        )}>
          {difficultyLabels[difficulty]}
        </span>
      </div>

      {/* Question */}
      <p className="text-sm text-foreground mb-4">
        <InlineLatex>{question}</InlineLatex>
      </p>

      {/* Interaction based on revealMode */}
      {!revealed && (
        <div className="space-y-3">
          {/* Click to reveal mode */}
          {revealMode === 'click' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRevealed(true)}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Reveal Answer
            </Button>
          )}

          {/* Input mode */}
          {revealMode === 'input' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={userInput}
                  onChange={(e) => {
                    setUserInput(e.target.value)
                    setIsChecked(false)
                  }}
                  placeholder={inputPlaceholder}
                  className="flex-1 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && userInput && checkAnswer()}
                />
                <Button
                  size="sm"
                  onClick={checkAnswer}
                  disabled={!userInput}
                >
                  Check
                </Button>
              </div>

              {/* Feedback for input mode */}
              {isChecked && !isCorrect && (
                <div className="flex items-center gap-2 text-xs text-red-600">
                  <XCircle className="h-4 w-4" />
                  <span>Not quite. Try again or reveal the answer.</span>
                  <button
                    onClick={() => setRevealed(true)}
                    className="text-primary hover:underline ml-auto"
                  >
                    Show answer
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Hints mode */}
          {revealMode === 'hints' && hints.length > 0 && (
            <div className="space-y-2">
              {/* Show revealed hints */}
              {currentHintIndex >= 0 && (
                <div className="space-y-2">
                  {hints.slice(0, currentHintIndex + 1).map((hint, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2 animate-fade-in"
                    >
                      <Lightbulb className="h-3.5 w-3.5 text-yellow-500 mt-0.5 shrink-0" />
                      <span><InlineLatex>{hint}</InlineLatex></span>
                    </div>
                  ))}
                </div>
              )}

              {/* Hint/reveal button */}
              <Button
                variant="outline"
                size="sm"
                onClick={showNextHint}
                className="gap-2"
              >
                {currentHintIndex < hints.length - 1 ? (
                  <>
                    <Lightbulb className="h-4 w-4" />
                    {currentHintIndex === -1 ? 'Get a hint' : `Next hint (${currentHintIndex + 2}/${hints.length})`}
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Reveal Answer
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Hints mode with no hints - fallback to click */}
          {revealMode === 'hints' && hints.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRevealed(true)}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Reveal Answer
            </Button>
          )}
        </div>
      )}

      {/* Answer revealed */}
      {revealed && (
        <div className="space-y-2 animate-fade-in">
          <div className={cn(
            "rounded-lg px-4 py-3",
            isChecked && isCorrect
              ? "bg-green-500/10 border border-green-500/30"
              : "bg-primary/5 border border-primary/20"
          )}>
            {isChecked && isCorrect && (
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Correct!</span>
              </div>
            )}
            <p className="text-sm font-medium text-foreground">
              <InlineLatex>{answer}</InlineLatex>
            </p>
          </div>
          <button
            onClick={reset}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
