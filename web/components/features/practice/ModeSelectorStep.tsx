'use client'

import { useState, useEffect, useRef } from 'react'
import { BookOpen, Grid3x3, ClipboardCheck, PenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ModeSelectionCard } from './ModeSelectionCard'
import type { StudyMode } from '@/types/flashcards'

interface ModeSelectorStepProps {
  onModeSelect: (mode: StudyMode) => void
}

const MODES = [
  {
    id: 'learn' as StudyMode,
    name: 'Flashcards',
    icon: BookOpen,
    description: 'Classic flip cards with spaced repetition tracking',
    bestFor: 'Review',
  },
  {
    id: 'match' as StudyMode,
    name: 'Match',
    icon: Grid3x3,
    description: 'Fast-paced memory game to test quick recall',
    bestFor: 'Quick drill',
  },
  {
    id: 'test' as StudyMode,
    name: 'Test',
    icon: ClipboardCheck,
    description: 'Multiple choice quiz to check your knowledge',
    bestFor: 'Self-test',
  },
  {
    id: 'write' as StudyMode,
    name: 'Write',
    icon: PenLine,
    description: 'Free-form answers graded by AI for deep learning',
    bestFor: 'Deep recall',
  },
]

/**
 * Step 1: Mode Selection UI
 * Shows 4 large visual mode cards upfront with clear descriptions
 * Users select their preferred study method before configuring content
 */
export function ModeSelectorStep({ onModeSelect }: ModeSelectorStepProps) {
  const [selectedMode, setSelectedMode] = useState<StudyMode | null>(null)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const continueButtonRef = useRef<HTMLButtonElement>(null)

  const handleSelect = (mode: StudyMode) => {
    setSelectedMode(mode)
  }

  const handleContinue = () => {
    if (selectedMode) {
      onModeSelect(selectedMode)
    }
  }

  // Focus continue button when a mode is selected
  useEffect(() => {
    if (selectedMode && continueButtonRef.current) {
      continueButtonRef.current.focus()
    }
  }, [selectedMode])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setFocusedIndex((prev) => Math.min(prev + 1, MODES.length - 1))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setFocusedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'ArrowDown' && focusedIndex < MODES.length - 2) {
        e.preventDefault()
        setFocusedIndex((prev) => Math.min(prev + 2, MODES.length - 1))
      } else if (e.key === 'ArrowUp' && focusedIndex >= 2) {
        e.preventDefault()
        setFocusedIndex((prev) => Math.max(prev - 2, 0))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [focusedIndex])

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">Step 1 of 2</p>
        <h2 className="text-xl font-semibold text-foreground">Choose Your Study Method</h2>
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
          Select how you want to practice. Each mode offers a different learning experience.
        </p>
      </div>

      {/* Mode cards grid - 2x2 on desktop, stack on mobile */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        role="radiogroup"
        aria-label="Select study method"
      >
        {MODES.map((mode, index) => (
          <ModeSelectionCard
            key={mode.id}
            mode={mode.id}
            name={mode.name}
            icon={mode.icon}
            description={mode.description}
            bestFor={mode.bestFor}
            isSelected={selectedMode === mode.id}
            onClick={() => handleSelect(mode.id)}
            animationDelay={`${index * 0.08}s`}
          />
        ))}
      </div>

      {/* Continue button */}
      <div className="flex justify-end pt-4">
        <Button
          ref={continueButtonRef}
          onClick={handleContinue}
          disabled={!selectedMode}
          size="lg"
          className="min-w-[150px]"
          aria-label="Continue to session configuration"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
