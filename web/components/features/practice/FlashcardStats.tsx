'use client'

import { BookOpen, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FlashcardStatsProps {
  totalCards: number
  dueCards?: number
  masteredCards: number
  loading?: boolean
}

export function FlashcardStats({ totalCards, masteredCards, loading }: FlashcardStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-lg border border-border/50 bg-card p-4 text-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary mx-auto mb-2">
          <BookOpen className="h-4 w-4" />
        </div>
        <p className="text-2xl font-bold text-foreground">{totalCards}</p>
        <p className="text-xs text-muted-foreground">Total Cards</p>
      </div>

      <div className="rounded-lg border border-border/50 bg-card p-4 text-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mx-auto mb-2">
          <Trophy className="h-4 w-4" />
        </div>
        {loading ? (
          <div className="h-8 w-8 mx-auto bg-muted animate-pulse rounded" />
        ) : (
          <p className="text-2xl font-bold text-foreground">{masteredCards}</p>
        )}
        <p className="text-xs text-muted-foreground">Mastered</p>
      </div>
    </div>
  )
}

interface ModuleSelectorProps {
  modules: { id: string; title: string; cardCount: number }[]
  selectedModule: string
  onSelect: (moduleId: string) => void
}

export function ModuleSelector({ modules, selectedModule, onSelect }: ModuleSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {modules.map((module) => (
        <button
          key={module.id}
          onClick={() => onSelect(module.id)}
          className={cn(
            'rounded-lg px-3 py-2 text-sm font-medium transition-all',
            selectedModule === module.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
          )}
        >
          {module.title}
          <span className="ml-1.5 text-xs opacity-70">({module.cardCount})</span>
        </button>
      ))}
    </div>
  )
}
