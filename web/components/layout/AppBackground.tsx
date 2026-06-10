'use client'

import { cn } from '@/lib/utils'

interface AppBackgroundProps {
  className?: string
}

interface InkDrop {
  /** Outer wrapper: position + size + entrance delay */
  wrapper: string
  /** Stagger for the "drop landing" entrance, seconds */
  dropDelay: number
  /** Negative offset so the endless sway starts mid-cycle, seconds */
  swayDelay: number
  background: string
  blur: number
  borderRadius: string
}

/**
 * Each blotch is two nested layers because the entrance and the idle motion
 * fight over `transform`: the outer layer plays the one-shot `ink-drop`
 * bloom (a drop of pigment landing and spreading), while the inner layer
 * loops `ink-sway` (the settled cloud slowly swirling, edges morphing).
 */
const INK_DROPS: InkDrop[] = [
  {
    // Primary blue — top right
    wrapper: 'absolute -top-[28%] -right-[18%] h-[780px] w-[780px]',
    dropDelay: 0.5,
    swayDelay: 0,
    background:
      'radial-gradient(circle at 48% 44%, oklch(0.55 0.2 258 / 0.14), oklch(0.58 0.17 252 / 0.06) 48%, transparent 72%)',
    blur: 70,
    borderRadius: '46% 54% 61% 39% / 51% 44% 56% 49%',
  },
  {
    // Splatter droplet flung off the top-right drop
    wrapper: 'absolute top-[6%] right-[20%] h-[200px] w-[200px]',
    dropDelay: 0.85,
    swayDelay: -9,
    background:
      'radial-gradient(circle at 50% 50%, oklch(0.55 0.2 256 / 0.12), oklch(0.58 0.16 250 / 0.05) 52%, transparent 74%)',
    blur: 32,
    borderRadius: '58% 42% 47% 53% / 45% 56% 44% 55%',
  },
  {
    // Deep blue — bottom left
    wrapper: 'absolute -bottom-[22%] -left-[14%] h-[700px] w-[700px]',
    dropDelay: 1.1,
    swayDelay: -13,
    background:
      'radial-gradient(circle at 52% 50%, oklch(0.48 0.18 262 / 0.12), oklch(0.52 0.15 258 / 0.05) 50%, transparent 72%)',
    blur: 66,
    borderRadius: '57% 43% 42% 58% / 44% 57% 43% 56%',
  },
  {
    // Splatter droplet above the bottom-left drop
    wrapper: 'absolute bottom-[22%] left-[14%] h-[170px] w-[170px]',
    dropDelay: 1.45,
    swayDelay: -31,
    background:
      'radial-gradient(circle at 50% 50%, oklch(0.5 0.18 260 / 0.11), oklch(0.54 0.14 256 / 0.05) 52%, transparent 74%)',
    blur: 28,
    borderRadius: '47% 53% 58% 42% / 56% 44% 57% 43%',
  },
  {
    // Teal wash — center
    wrapper: 'absolute top-[26%] left-[44%] h-[600px] w-[600px]',
    dropDelay: 1.75,
    swayDelay: -25,
    background:
      'radial-gradient(circle at 50% 46%, oklch(0.6 0.13 215 / 0.09), oklch(0.6 0.1 205 / 0.04) 48%, transparent 70%)',
    blur: 60,
    borderRadius: '39% 61% 56% 44% / 58% 41% 52% 48%',
  },
  {
    // Soft sky blue — top left
    wrapper: 'absolute -top-[8%] -left-[8%] h-[480px] w-[480px]',
    dropDelay: 2.1,
    swayDelay: -7,
    background:
      'radial-gradient(circle at 46% 52%, oklch(0.65 0.14 248 / 0.1), oklch(0.68 0.1 244 / 0.04) 46%, transparent 70%)',
    blur: 54,
    borderRadius: '52% 48% 44% 56% / 47% 53% 46% 54%',
  },
  {
    // Indigo accent — bottom right
    wrapper: 'absolute bottom-[8%] right-[8%] h-[440px] w-[440px]',
    dropDelay: 2.5,
    swayDelay: -19,
    background:
      'radial-gradient(circle at 50% 48%, oklch(0.5 0.17 268 / 0.1), oklch(0.52 0.13 262 / 0.04) 48%, transparent 70%)',
    blur: 50,
    borderRadius: '44% 56% 52% 48% / 55% 46% 54% 45%',
  },
]

/**
 * AppBackground - Watercolor wash behind every page
 *
 * Blue pigment drops land in sequence on page load, bloom outward like
 * ink diffusing in still water, then keep slowly swirling.
 */
export function AppBackground({ className }: AppBackgroundProps) {
  return (
    <div className={cn('fixed inset-0 -z-10 overflow-hidden pointer-events-none', className)}>
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/30" />

      {/* Watercolor ink drops */}
      <div className="absolute inset-0 overflow-hidden">
        {INK_DROPS.map((drop, index) => (
          <div
            key={index}
            className={cn(drop.wrapper, 'animate-ink-drop')}
            style={{ animationDelay: `${drop.dropDelay}s` }}
          >
            <div
              className="h-full w-full animate-ink-sway"
              style={{
                animationDelay: `${drop.swayDelay}s`,
                background: drop.background,
                filter: `blur(${drop.blur}px)`,
                borderRadius: drop.borderRadius,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
