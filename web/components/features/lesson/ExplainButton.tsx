'use client'

import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExplainButtonProps {
  position: { x: number; y: number }
  onClick: () => void
  visible: boolean
}

export function ExplainButton({ position, onClick, visible }: ExplainButtonProps) {
  if (!visible) return null

  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed z-50 flex items-center gap-1.5',
        'bg-primary text-primary-foreground',
        'rounded-full px-3 py-1.5',
        'shadow-lg shadow-primary/30',
        'hover:shadow-xl hover:shadow-primary/40',
        'hover:scale-105 transition-all duration-200',
        'text-sm font-medium',
        'animate-fade-in'
      )}
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%) translateY(-8px)',
      }}
    >
      <Sparkles className="h-3.5 w-3.5" />
      Explain
    </button>
  )
}
