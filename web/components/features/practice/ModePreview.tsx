'use client'

import { cn } from '@/lib/utils'
import type { StudyMode } from '@/types/flashcards'

interface ModePreviewProps {
  mode: StudyMode
  className?: string
}

/**
 * Small animated SVG previews for each study mode
 * Respects prefers-reduced-motion via CSS
 */
export function ModePreview({ mode, className }: ModePreviewProps) {
  const baseClasses = 'w-full h-24 rounded-lg bg-muted/30 [&_animate]:motion-reduce:hidden'

  if (mode === 'learn') {
    // Flashcard flip animation
    return (
      <div className={cn(baseClasses, className)}>
        <svg viewBox="0 0 200 96" fill="none" className="w-full h-full">
          <rect
            x="40"
            y="20"
            width="120"
            height="56"
            rx="8"
            className="fill-primary/20 stroke-primary stroke-2"
          >
            <animate
              attributeName="transform"
              values="rotateY(0deg);rotateY(180deg);rotateY(0deg)"
              dur="3s"
              repeatCount="indefinite"
            />
          </rect>
          <text
            x="100"
            y="50"
            textAnchor="middle"
            className="fill-primary text-xs font-medium"
          >
            ?
          </text>
        </svg>
      </div>
    )
  }

  if (mode === 'match') {
    // Grid tiles with connecting lines
    return (
      <div className={cn(baseClasses, className)}>
        <svg viewBox="0 0 200 96" fill="none" className="w-full h-full">
          {/* Grid of tiles */}
          <rect x="20" y="20" width="35" height="25" rx="4" className="fill-primary/20 stroke-primary stroke-2" />
          <rect x="65" y="20" width="35" height="25" rx="4" className="fill-chart-2/20 stroke-chart-2 stroke-2" />
          <rect x="110" y="20" width="35" height="25" rx="4" className="fill-primary/20 stroke-primary stroke-2" />
          <rect x="155" y="20" width="35" height="25" rx="4" className="fill-chart-2/20 stroke-chart-2 stroke-2" />

          <rect x="20" y="55" width="35" height="25" rx="4" className="fill-chart-2/20 stroke-chart-2 stroke-2" />
          <rect x="65" y="55" width="35" height="25" rx="4" className="fill-primary/20 stroke-primary stroke-2" />
          <rect x="110" y="55" width="35" height="25" rx="4" className="fill-chart-2/20 stroke-chart-2 stroke-2" />
          <rect x="155" y="55" width="35" height="25" rx="4" className="fill-primary/20 stroke-primary stroke-2" />

          {/* Connecting line */}
          <line
            x1="37.5"
            y1="45"
            x2="37.5"
            y2="55"
            className="stroke-primary stroke-2"
            opacity="0"
          >
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              dur="2s"
              repeatCount="indefinite"
            />
          </line>
        </svg>
      </div>
    )
  }

  if (mode === 'test') {
    // Checkbox being checked
    return (
      <div className={cn(baseClasses, className)}>
        <svg viewBox="0 0 200 96" fill="none" className="w-full h-full">
          {/* Multiple choice options */}
          <circle cx="30" cy="25" r="8" className="fill-background stroke-muted-foreground stroke-2" />
          <circle cx="30" cy="48" r="8" className="fill-background stroke-muted-foreground stroke-2" />
          <circle cx="30" cy="71" r="8" className="fill-background stroke-primary stroke-2">
            <animate
              attributeName="fill"
              values="hsl(var(--background));hsl(var(--primary));hsl(var(--primary))"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>

          {/* Checkmark */}
          <path
            d="M 26 71 L 29 74 L 34 68"
            className="stroke-primary-foreground stroke-2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0"
          >
            <animate
              attributeName="opacity"
              values="0;0;1;1"
              dur="2s"
              repeatCount="indefinite"
            />
          </path>

          {/* Option lines */}
          <line x1="45" y1="25" x2="170" y2="25" className="stroke-muted-foreground/30 stroke-2" />
          <line x1="45" y1="48" x2="170" y2="48" className="stroke-muted-foreground/30 stroke-2" />
          <line x1="45" y1="71" x2="170" y2="71" className="stroke-muted-foreground/30 stroke-2" />
        </svg>
      </div>
    )
  }

  if (mode === 'write') {
    // Typing cursor animation
    return (
      <div className={cn(baseClasses, className)}>
        <svg viewBox="0 0 200 96" fill="none" className="w-full h-full">
          {/* Text lines */}
          <line x1="30" y1="35" x2="120" y2="35" className="stroke-muted-foreground/30 stroke-2" />
          <line x1="30" y1="50" x2="100" y2="50" className="stroke-muted-foreground/30 stroke-2" />
          <line x1="30" y1="65" x2="140" y2="65" className="stroke-muted-foreground/30 stroke-2" />

          {/* Typing cursor */}
          <rect
            x="145"
            y="60"
            width="3"
            height="10"
            className="fill-primary"
          >
            <animate
              attributeName="opacity"
              values="1;1;0;0"
              dur="1s"
              repeatCount="indefinite"
            />
          </rect>

          {/* Pen icon */}
          <path
            d="M 160 25 L 175 40 L 165 50 L 150 35 Z"
            className="fill-primary/20 stroke-primary stroke-2"
          />
          <line x1="165" y1="50" x2="155" y2="60" className="stroke-primary stroke-2" />
        </svg>
      </div>
    )
  }

  return null
}
