'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Lightbulb } from 'lucide-react'
import { WorkedExampleStep } from '@/types/course'
import { InlineLatex } from './InlineLatex'
import { cn } from '@/lib/utils'

interface WorkedExampleProps {
  title: string
  steps: WorkedExampleStep[]
}

export function WorkedExample({ title, steps }: WorkedExampleProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [revealedSteps, setRevealedSteps] = useState<Set<number>>(new Set())
  const [showingHints, setShowingHints] = useState<Set<number>>(new Set())

  const toggleStep = (index: number) => {
    const newRevealed = new Set(revealedSteps)
    if (newRevealed.has(index)) {
      newRevealed.delete(index)
    } else {
      newRevealed.add(index)
    }
    setRevealedSteps(newRevealed)
  }

  const toggleHint = (index: number) => {
    const newHints = new Set(showingHints)
    if (newHints.has(index)) {
      newHints.delete(index)
    } else {
      newHints.add(index)
    }
    setShowingHints(newHints)
  }

  const revealAll = () => {
    setRevealedSteps(new Set(steps.map((_, i) => i)))
  }

  return (
    <div className="my-4 rounded-lg border border-chart-2/30 bg-chart-2/5 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-chart-2/10 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-chart-2 shrink-0" />
        ) : (
          <ChevronRight className="h-5 w-5 text-chart-2 shrink-0" />
        )}
        <span className="text-sm font-semibold text-foreground flex-1">
          <InlineLatex>{title}</InlineLatex>
        </span>
        <span className="text-xs text-muted-foreground">
          {steps.length} steps
        </span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-chart-2/20 px-4 py-4">
          <div className="flex justify-end mb-3">
            <button
              onClick={revealAll}
              className="text-xs text-chart-2 hover:text-chart-2/80 transition-colors"
            >
              Reveal all steps
            </button>
          </div>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {/* Step number */}
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-chart-2/20 text-xs font-semibold text-chart-2 shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    {/* Instruction */}
                    <p className="text-sm text-foreground mb-2">
                      <InlineLatex>{step.instruction}</InlineLatex>
                    </p>

                    {/* Hint button */}
                    {step.hint && (
                      <button
                        onClick={() => toggleHint(index)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-chart-2 transition-colors mb-2"
                      >
                        <Lightbulb className="h-3.5 w-3.5" />
                        {showingHints.has(index) ? 'Hide hint' : 'Show hint'}
                      </button>
                    )}

                    {/* Hint content */}
                    {step.hint && showingHints.has(index) && (
                      <div className="text-xs text-muted-foreground bg-chart-2/10 rounded px-3 py-2 mb-2">
                        <InlineLatex>{step.hint}</InlineLatex>
                      </div>
                    )}

                    {/* Answer reveal */}
                    {!revealedSteps.has(index) ? (
                      <button
                        onClick={() => toggleStep(index)}
                        className="text-xs font-medium text-chart-2 hover:text-chart-2/80 transition-colors"
                      >
                        Reveal answer
                      </button>
                    ) : (
                      <div className={cn(
                        "text-sm font-medium text-chart-2 bg-chart-2/10 rounded px-3 py-2",
                        "animate-fade-in"
                      )}>
                        <InlineLatex>{step.answer}</InlineLatex>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
