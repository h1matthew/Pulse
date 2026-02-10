'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ModePreview } from './ModePreview'
import type { StudyMode } from '@/types/flashcards'
import type { LucideIcon } from 'lucide-react'

interface ModeSelectionCardProps {
  mode: StudyMode
  name: string
  icon: LucideIcon
  description: string
  bestFor: string
  isSelected: boolean
  onClick: () => void
  animationDelay?: string
}

/**
 * Individual mode card for the mode selection step
 * Shows icon, name, description, "best for" badge, and animated preview
 */
export function ModeSelectionCard({
  mode,
  name,
  icon: Icon,
  description,
  bestFor,
  isSelected,
  onClick,
  animationDelay,
}: ModeSelectionCardProps) {
  return (
    <Card
      className={cn(
        'group cursor-pointer transition-all duration-200 relative overflow-hidden animate-tilt-in',
        'hover:-translate-y-1 hover:shadow-lg hover:border-primary/30',
        isSelected && 'border-primary border-2 bg-primary/5'
      )}
      style={animationDelay ? { animationDelay } : undefined}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`Select ${name} mode`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
              isSelected ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
            )}>
              <Icon className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg">{name}</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            {bestFor}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
        <ModePreview mode={mode} />
      </CardContent>
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)', backgroundSize: '200% 100%', animation: 'shimmer 2s linear infinite' }} />
    </Card>
  )
}
