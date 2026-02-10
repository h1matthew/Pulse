'use client'

import { useState, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle, XCircle, RotateCcw, Trophy, Loader2 } from 'lucide-react'
import type { Flashcard, AIGradingResult } from '@/types/flashcards'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface WriteModeProps {
  cards: Flashcard[]
  onComplete?: (score: number, total: number) => void
}

export function WriteMode({ cards, onComplete }: WriteModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [score, setScore] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [isGrading, setIsGrading] = useState(false)
  const [aiScore, setAiScore] = useState<number | null>(null)
  const [aiFeedback, setAiFeedback] = useState('')

  const currentCard = cards[currentIndex]

  const renderLatex = (text: string): string => {
    try {
      // Replace LaTeX patterns with rendered HTML
      return text.replace(/\$\$(.+?)\$\$/g, (match, latex) => {
        return katex.renderToString(latex, { displayMode: true, throwOnError: false })
      }).replace(/\$(.+?)\$/g, (match, latex) => {
        return katex.renderToString(latex, { displayMode: false, throwOnError: false })
      })
    } catch (error) {
      console.error('LaTeX rendering error:', error)
      return text
    }
  }

  const handleSubmit = async () => {
    if (!userAnswer.trim()) return

    setIsGrading(true)

    try {
      const response = await fetch('/api/flashcards/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flashcardId: currentCard.id,
          question: currentCard.front,
          userAnswer: userAnswer.trim(),
          correctAnswer: currentCard.back,
          hint: currentCard.hint,
          moduleId: currentCard.moduleId,
          isAiGenerated: currentCard.isAiGenerated || false,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to grade answer')
      }

      const data = await response.json()
      const result: AIGradingResult = data.result

      setAiScore(Math.round(result.score * 100))
      setAiFeedback(result.feedback)
      setIsCorrect(result.wasCorrect)
      setIsSubmitted(true)

      if (result.wasCorrect) {
        setScore((s) => s + 1)
      }
    } catch (error) {
      console.error('Error grading answer:', error)
      // Fallback to simple comparison on error
      const correct = userAnswer.toLowerCase().trim() === currentCard.back.toLowerCase().trim()
      setIsCorrect(correct)
      setIsSubmitted(true)
      setAiFeedback('AI grading unavailable. Showing basic comparison result.')
      if (correct) {
        setScore((s) => s + 1)
      }
    } finally {
      setIsGrading(false)
    }
  }

  const handleNext = () => {
    if (currentIndex + 1 >= cards.length) {
      setIsFinished(true)
      if (onComplete) {
        onComplete(score, cards.length)
      }
      return
    }
    setCurrentIndex((i) => i + 1)
    setUserAnswer('')
    setIsSubmitted(false)
    setIsCorrect(false)
    setAiScore(null)
    setAiFeedback('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (!isSubmitted) {
        handleSubmit()
      } else {
        handleNext()
      }
    }
  }

  const handleRestart = () => {
    setCurrentIndex(0)
    setUserAnswer('')
    setIsSubmitted(false)
    setIsCorrect(false)
    setScore(0)
    setIsFinished(false)
  }

  if (!currentCard) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No flashcards available.
      </div>
    )
  }

  if (isFinished) {
    const percentage = Math.round((score / cards.length) * 100)

    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <Trophy className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-xl font-semibold text-foreground">Session Complete!</h3>
        <p className="text-muted-foreground">
          You got {score} out of {cards.length} correct
        </p>
        <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden max-w-xs mx-auto">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <Button onClick={handleRestart} variant="outline" className="gap-2 mt-4">
          <RotateCcw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Question {currentIndex + 1} of {cards.length}
        </span>
        <span className="text-muted-foreground">
          Score: {score} / {currentIndex + (isSubmitted && isCorrect ? 1 : 0)}
        </span>
      </div>

      {/* Question Card */}
      <div className="rounded-xl border border-border/50 bg-card p-6 space-y-6">
        <div>
          <p className="text-xs text-muted-foreground mb-2">QUESTION</p>
          <p className="text-lg font-medium text-foreground">{currentCard.front}</p>
        </div>

        {/* Answer Input */}
        <div className="space-y-2">
          <label htmlFor="answer-input" className="text-sm font-medium text-foreground">
            Your Answer:
          </label>
          <Input
            id="answer-input"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer..."
            disabled={isSubmitted}
            className="text-base"
            autoFocus
          />
        </div>

        {/* Feedback */}
        {isSubmitted && (
          <div
            className={`rounded-lg px-4 py-3 text-sm animate-fade-in ${
              isCorrect
                ? 'bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400'
            }`}
          >
            <div className="flex items-start gap-2">
              {isCorrect ? (
                <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <p className="font-medium">
                    {isCorrect ? 'Correct!' : 'Not quite.'}
                  </p>
                  {aiScore !== null && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-background/50 font-mono">
                      {aiScore}%
                    </span>
                  )}
                </div>

                {aiFeedback && (
                  <div
                    className="text-sm prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: renderLatex(aiFeedback) }}
                  />
                )}

                {!isCorrect && !aiFeedback && (
                  <div className="text-xs space-y-1">
                    <p>
                      Correct answer: <span className="font-semibold">{currentCard.back}</span>
                    </p>
                    {currentCard.hint && (
                      <p className="italic opacity-90">Hint: {currentCard.hint}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {!isSubmitted ? (
        <Button
          onClick={handleSubmit}
          disabled={!userAnswer.trim() || isGrading}
          className="w-full shadow-lg shadow-primary/20"
          size="lg"
        >
          {isGrading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Grading...
            </>
          ) : (
            'Check Answer'
          )}
        </Button>
      ) : (
        <Button onClick={handleNext} variant="outline" className="w-full" size="lg">
          {currentIndex + 1 >= cards.length ? 'Finish' : 'Next Question'}
        </Button>
      )}

      {/* Hint about Enter key */}
      <p className="text-xs text-center text-muted-foreground">
        Press Enter to {isSubmitted ? 'continue' : 'submit'}
      </p>
    </div>
  )
}
