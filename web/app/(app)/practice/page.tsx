'use client'

import { useState, Suspense } from 'react'
import { BookOpen, Loader2 } from 'lucide-react'
import { ModeSelectorStep } from '@/components/features/practice/ModeSelectorStep'
import { SessionConfigurator } from '@/components/features/practice/SessionConfigurator'
import { FlashcardsMode } from '@/components/features/practice/modes/FlashcardsMode'
import { MatchMode } from '@/components/features/practice/modes/MatchMode'
import { TestMode } from '@/components/features/practice/modes/TestMode'
import { WriteMode } from '@/components/features/practice/modes/WriteMode'
import { COURSE_MODULES } from '@/lib/constants/modules'
import { FLASHCARDS } from '@/lib/content/flashcards'
import { shuffleArray } from '@/lib/utils/flashcardUtils'
import type { StudyMode, Flashcard, FlashcardSourceConfig } from '@/types/flashcards'

type PageStep = 'mode-selection' | 'config' | 'generating' | 'studying'

function FlashcardsContent() {
  const [step, setStep] = useState<PageStep>('mode-selection')
  const [config, setConfig] = useState<FlashcardSourceConfig | null>(null)
  const [studyMode, setStudyMode] = useState<StudyMode | null>(null)
  const [cards, setCards] = useState<Flashcard[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)

  // Get available modules with lessons (excluding quizzes)
  const availableModules = COURSE_MODULES.map((module) => ({
    id: module.id,
    title: module.title,
    lessonCount: module.lessons.length,
    lessons: module.lessons
      .filter((l) => !l.isQuiz)
      .map((l) => ({ id: l.id, title: l.title })),
  })).filter((m) => m.lessonCount > 0)

  const handleModeSelect = (mode: StudyMode) => {
    setStudyMode(mode)
    setStep('config')
  }

  const handleConfigComplete = async (cfg: FlashcardSourceConfig) => {
    setConfig(cfg)
    setGenerationError(null)

    let finalCards: Flashcard[] = []

    try {
      // Fetch existing cards if needed
      if (cfg.mode === 'existing' || cfg.mode === 'mixed') {
        const moduleIds = cfg.moduleIds || []
        const includeAI = cfg.mode === 'mixed'
        const excludeKnown = cfg.excludeKnown !== false

        // Fetch cards for each module
        for (const moduleId of moduleIds) {
          const params = new URLSearchParams({
            moduleId,
            includeAI: includeAI.toString(),
            excludeKnown: excludeKnown.toString(),
          })

          const response = await fetch(`/api/flashcards/cards?${params}`)
          if (response.ok) {
            const data = await response.json()
            finalCards.push(...data.cards)
          }
        }

        // If no API call was made, use hardcoded flashcards
        if (moduleIds.length === 0) {
          finalCards = [...FLASHCARDS]
        }
      }

      // Generate AI cards if needed
      if (cfg.mode === 'generate' || cfg.mode === 'mixed') {
        if (!cfg.generationRequest) {
          throw new Error('Generation request is required for AI mode')
        }

        setIsGenerating(true)
        setStep('generating')

        const response = await fetch('/api/flashcards/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cfg.generationRequest),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to generate flashcards')
        }

        const data = await response.json()
        finalCards.push(...data.cards)

        setIsGenerating(false)
      }

      // Shuffle and limit cards
      const shuffled = shuffleArray(finalCards)
      const limited = cfg.cardCount && cfg.cardCount > 0
        ? shuffled.slice(0, Math.min(cfg.cardCount, shuffled.length))
        : shuffled

      setCards(limited)
      setStep('studying')
    } catch (error) {
      console.error('Error setting up flashcard session:', error)
      setGenerationError(error instanceof Error ? error.message : 'Unknown error')
      setIsGenerating(false)
      setStep('config')
    }
  }

  const handleMarkKnown = async (cardId: string) => {
    if (!config) return

    try {
      // Determine module ID from the card
      const card = cards.find((c) => c.id === cardId)
      if (!card) return

      const response = await fetch('/api/flashcards/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flashcardId: cardId,
          moduleId: card.moduleId,
          isKnown: true,
          isAiGenerated: card.isAiGenerated || false,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to mark card as known')
      }

      // Remove the card from the current session
      setCards((prevCards) => prevCards.filter((c) => c.id !== cardId))
    } catch (error) {
      console.error('Error marking card as known:', error)
      throw error
    }
  }

  const handleBackToModeSelection = () => {
    setStep('mode-selection')
    setStudyMode(null)
    setConfig(null)
    setGenerationError(null)
  }

  const handleBackToConfig = () => {
    setStep('config')
    setCards([])
    setGenerationError(null)
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <BookOpen className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Practice</h1>
          <p className="text-sm text-muted-foreground">
            Master rocket science with multiple study methods
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Breadcrumb */}
        {step !== 'mode-selection' && (
          <div className="text-sm text-muted-foreground">
            {step === 'config' && 'Step 2 of 2: Configure Session'}
            {step === 'generating' && 'Generating flashcards...'}
            {step === 'studying' && studyMode && (
              <>Studying with <span className="capitalize font-medium text-foreground">{studyMode}</span> mode</>
            )}
          </div>
        )}

        {/* Mode Selection Step */}
        {step === 'mode-selection' && (
          <ModeSelectorStep onModeSelect={handleModeSelect} />
        )}

        {/* Configuration Step */}
        {step === 'config' && studyMode && (
          <>
            {generationError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-400">
                <p className="font-medium mb-1">Error</p>
                <p>{generationError}</p>
              </div>
            )}
            <SessionConfigurator
              selectedMode={studyMode}
              onComplete={handleConfigComplete}
              onBack={handleBackToModeSelection}
              availableModules={availableModules}
            />
          </>
        )}

        {/* Generating Step */}
        {step === 'generating' && isGenerating && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Generating Flashcards</h3>
              <p className="text-sm text-muted-foreground">
                Our AI is creating custom flashcards from your selected lessons...
              </p>
            </div>
          </div>
        )}

        {/* Studying Step */}
        {step === 'studying' && cards.length > 0 && studyMode && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {cards.length} card{cards.length !== 1 ? 's' : ''} • <span className="capitalize">{studyMode}</span> mode
              </div>
              <button
                onClick={handleBackToConfig}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Change Settings
              </button>
            </div>

            {/* Mode-specific component */}
            {studyMode === 'learn' && (
              <FlashcardsMode
                cards={cards}
                onMarkKnown={handleMarkKnown}
              />
            )}
            {studyMode === 'match' && (
              <MatchMode cards={cards} />
            )}
            {studyMode === 'test' && (
              <TestMode cards={cards} />
            )}
            {studyMode === 'write' && (
              <WriteMode cards={cards} />
            )}
          </div>
        )}

        {/* No cards fallback */}
        {step === 'studying' && cards.length === 0 && (
          <div className="text-center py-12 space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-foreground">No Practice Cards Found</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Try selecting different topics or generating new cards with AI.
            </p>
            <button
              onClick={handleBackToConfig}
              className="text-sm text-primary hover:underline"
            >
              Change Settings
            </button>
          </div>
        )}
      </div>
    </main>
  )
}

export default function FlashcardsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading flashcards...</div>
        </div>
      }
    >
      <FlashcardsContent />
    </Suspense>
  )
}
