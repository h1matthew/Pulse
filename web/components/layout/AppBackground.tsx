'use client'

import { cn } from '@/lib/utils'

interface AppBackgroundProps {
  className?: string
}

/**
 * AppBackground - Subtle animated background for app pages
 *
 * Features smooth gradient orbs that drift slowly, creating an ambient effect.
 */
export function AppBackground({ className }: AppBackgroundProps) {
  return (
    <div className={cn('fixed inset-0 -z-10 overflow-hidden pointer-events-none', className)}>
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/30" />

      {/* Gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Primary blue orb - top right */}
        <div
          className="absolute -top-[30%] -right-[20%] h-[800px] w-[800px] animate-drift"
          style={{
            background: 'radial-gradient(circle, oklch(0.55 0.2 250 / 0.15), transparent 50%)',
            filter: 'blur(100px)',
          }}
        />

        {/* Teal orb - bottom left */}
        <div
          className="absolute -bottom-[20%] -left-[15%] h-[700px] w-[700px] animate-drift [animation-delay:-20s]"
          style={{
            background: 'radial-gradient(circle, oklch(0.6 0.15 195 / 0.12), transparent 50%)',
            filter: 'blur(90px)',
          }}
        />

        {/* Purple accent - center */}
        <div
          className="absolute top-[30%] left-[50%] h-[600px] w-[600px] animate-drift [animation-delay:-10s]"
          style={{
            background: 'radial-gradient(circle, oklch(0.5 0.12 280 / 0.1), transparent 50%)',
            filter: 'blur(80px)',
          }}
        />

        {/* Warm accent - top left */}
        <div
          className="absolute -top-[10%] -left-[10%] h-[500px] w-[500px] animate-drift [animation-delay:-15s]"
          style={{
            background: 'radial-gradient(circle, oklch(0.6 0.1 30 / 0.08), transparent 50%)',
            filter: 'blur(70px)',
          }}
        />

        {/* Secondary blue - bottom right */}
        <div
          className="absolute bottom-[10%] right-[10%] h-[450px] w-[450px] animate-drift [animation-delay:-25s]"
          style={{
            background: 'radial-gradient(circle, oklch(0.5 0.18 250 / 0.1), transparent 50%)',
            filter: 'blur(60px)',
          }}
        />
      </div>
    </div>
  )
}
