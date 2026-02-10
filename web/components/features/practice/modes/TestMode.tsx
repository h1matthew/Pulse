'use client'

import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, ArrowRight, RotateCcw } from 'lucide-react'
import type { Flashcard } from '@/types/flashcards'
import { shuffleArray } from '@/lib/utils/flashcardUtils'

interface QuizQuestion {
  question: string
  options: string[]
  correctAnswer: string
  explanation: string
}

interface TestModeProps {
  cards: Flashcard[]
  onComplete?: (score: number, total: number) => void
}

export function TestMode({ cards, onComplete }: TestModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [isFinished, setIsFinished] = useState(false)

  // Generate quiz questions from flashcards
  const questions = useMemo<QuizQuestion[]>(() => {
    if (cards.length < 4) return []

    return cards.map(card => {
      const wrongAnswers = shuffleArray(
        cards.filter(c => c.id !== card.id).map(c => c.back)
      ).slice(0, 3)

      return {
        question: card.front,
        options: shuffleArray([card.back, ...wrongAnswers]),
        correctAnswer: card.back,
        explanation: card.hint || 'Review this concept to strengthen your understanding.',
      }
    })
  }, [cards])

  const currentQuestion = questions[currentIndex]

  const handleSubmit = useCallback(() => {
    if (!selectedAnswer) return
    setIsSubmitted(true)
    if (selectedAnswer === currentQuestion.correctAnswer) {
      setScore(s => s + 1)
    }
  }, [selectedAnswer, currentQuestion])

  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= questions.length) {
      const finalScore = selectedAnswer === currentQuestion.correctAnswer ? score + 1 : score
      setIsFinished(true)
      if (onComplete) {
        onComplete(finalScore, questions.length)
      }
      return
    }
    setCurrentIndex(i => i + 1)
    setSelectedAnswer(null)
    setIsSubmitted(false)
  }, [currentIndex, questions.length, currentQuestion, selectedAnswer, score, onComplete])

  const handleRestart = () => {
    setCurrentIndex(0)
    setSelectedAnswer(null)
    setIsSubmitted(false)
    setScore(0)
    setIsFinished(false)
  }

  if (cards.length < 4) {
    return (
      <div className="text-center py-12 text-muted-foreground space-y-2">
        <p>Need at least 4 cards for Test mode.</p>
        <p className="text-sm">Try Learn or Write mode!</p>
      </div>
    )
  }

  if (isFinished) {
    const percentage = Math.round((score / questions.length) * 100)

    return (
      <div className="mt-8 rounded-xl border border-border/50 bg-card p-8 text-center animate-fade-in-up">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">Test Complete!</h3>
        <p className="text-muted-foreground">
          You got {score} out of {questions.length} correct
        </p>
        <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden max-w-xs mx-auto">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <Button onClick={handleRestart} variant="outline" className="gap-2 mt-6">
          <RotateCcw className="h-4 w-4" />
          Retake Test
        </Button>
      </div>
    )
  }

  const isCorrect = selectedAnswer === currentQuestion.correctAnswer

  return (
    <div className="mt-8 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Test Mode</h3>
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} / {questions.length}
        </span>
      </div>

      {/* Question */}
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <p className="font-medium text-foreground mb-4">
          {currentQuestion.question}
        </p>

        {/* Options */}
        <div className="space-y-2">
          {currentQuestion.options.map((option, i) => {
            const letter = String.fromCharCode(65 + i)
            const isSelected = selectedAnswer === option
            const isCorrectOption = option === currentQuestion.correctAnswer
            const showCorrect = isSubmitted && isCorrectOption
            const showWrong = isSubmitted && isSelected && !isCorrectOption

            return (
              <button
                key={i}
                onClick={() => !isSubmitted && setSelectedAnswer(option)}
                disabled={isSubmitted}
                className={`w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all ${
                  showCorrect
                    ? 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400'
                    : showWrong
                    ? 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400'
                    : isSelected
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border/50 hover:border-primary/30 text-foreground hover:text-foreground'
                } ${isSubmitted ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold shrink-0 ${
                  showCorrect
                    ? 'bg-green-500 text-white'
                    : showWrong
                    ? 'bg-red-500 text-white'
                    : isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {letter}
                </span>
                <span className="flex-1">{option}</span>
                {showCorrect && <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />}
                {showWrong && <XCircle className="h-4 w-4 text-red-600 shrink-0" />}
              </button>
            )
          })}
        </div>

        {/* Feedback */}
        {isSubmitted && (
          <div className={`mt-4 rounded-lg px-4 py-3 text-sm ${
            isCorrect
              ? 'bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400'
          }`}>
            <p className="font-medium mb-1">
              {isCorrect ? 'Correct!' : 'Not quite.'}
            </p>
            <p className="text-xs opacity-90">
              {currentQuestion.explanation}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      {!isSubmitted ? (
        <Button
          onClick={handleSubmit}
          disabled={!selectedAnswer}
          className="w-full shadow-lg shadow-primary/20"
          size="lg"
        >
          Check Answer
        </Button>
      ) : (
        <Button
          onClick={handleNext}
          variant="outline"
          className="w-full gap-2"
          size="lg"
        >
          {currentIndex + 1 >= questions.length ? 'Finish Test' : 'Next Question'}
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
