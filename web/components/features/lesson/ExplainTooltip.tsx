'use client'

import { useState, useEffect, useRef } from 'react'
import { X, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { InlineLatex } from '@/components/features/lesson/InlineLatex'
import type { ExplainContext } from '@/types/chat'

interface ExplainTooltipProps {
  selectedText: string
  explanation: string | null
  isLoading: boolean
  isStreaming?: boolean
  position: { x: number; y: number }
  onClose: () => void
  onAskFollowUp: (context: ExplainContext) => void
}

const TOOLTIP_HEIGHT_ESTIMATE = 300 // Approximate height for positioning calculation
const TOOLTIP_WIDTH = 320

export function ExplainTooltip({
  selectedText,
  explanation,
  isLoading,
  isStreaming = false,
  position,
  onClose,
  onAskFollowUp,
}: ExplainTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [tooltipPosition, setTooltipPosition] = useState<'below' | 'above'>('below')
  const [adjustedLeft, setAdjustedLeft] = useState(position.x)

  // Calculate tooltip position based on viewport
  useEffect(() => {
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth
    const spaceBelow = viewportHeight - position.y - 16
    const spaceAbove = position.y

    // Determine if tooltip should appear above or below
    if (spaceBelow < TOOLTIP_HEIGHT_ESTIMATE && spaceAbove > TOOLTIP_HEIGHT_ESTIMATE) {
      setTooltipPosition('above')
    } else {
      setTooltipPosition('below')
    }

    // Adjust horizontal position to keep tooltip in viewport
    const centerX = position.x
    let left = centerX - TOOLTIP_WIDTH / 2
    if (left < 16) {
      left = 16
    } else if (left + TOOLTIP_WIDTH > viewportWidth - 16) {
      left = viewportWidth - TOOLTIP_WIDTH - 16
    }
    setAdjustedLeft(left)
  }, [position.x, position.y])

  const handleAskFollowUp = () => {
    if (explanation) {
      onAskFollowUp({
        selectedText,
        explanation,
      })
    }
  }

  const showCursor = isStreaming && !explanation?.endsWith('.')

  return (
    <div
      ref={tooltipRef}
      className={cn(
        'fixed z-50 w-80 max-w-[90vw]',
        'bg-card border border-border/50 rounded-xl shadow-xl',
        tooltipPosition === 'below' ? 'animate-fade-in-up' : 'animate-fade-in'
      )}
      style={{
        left: adjustedLeft,
        top: tooltipPosition === 'below' ? position.y + 16 : undefined,
        bottom: tooltipPosition === 'above' ? window.innerHeight - position.y + 16 : undefined,
        maxHeight: '60vh',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-3 border-b border-border/50">
        <div className="flex-1 min-w-0 pr-2">
          <p className="text-xs text-muted-foreground mb-1">Explaining:</p>
          <p className="text-sm font-medium text-foreground line-clamp-2">
            &ldquo;{selectedText}&rdquo;
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-muted transition-colors flex-shrink-0"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="p-3 max-h-64 overflow-y-auto">
        {isLoading && !explanation ? (
          <div className="flex items-center gap-2 py-2">
            <span className="inline-block w-2 h-4 bg-primary animate-pulse rounded-sm" />
            <p className="text-sm text-muted-foreground">Generating explanation...</p>
          </div>
        ) : explanation ? (
          <div className="prose prose-sm max-w-none">
            <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              <InlineLatex>{explanation}</InlineLatex>
              {showCursor && (
                <span className="inline-block w-2 h-4 bg-primary animate-pulse rounded-sm ml-0.5 align-text-bottom" />
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Something went wrong. Please try again.
          </p>
        )}
      </div>

      {/* Footer */}
      {!isLoading && explanation && !isStreaming && (
        <div className="p-3 border-t border-border/50">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAskFollowUp}
            className="w-full gap-2"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Ask follow-up
          </Button>
        </div>
      )}
    </div>
  )
}
