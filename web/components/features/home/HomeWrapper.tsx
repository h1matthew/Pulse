import type { ReactNode } from 'react'

interface HomeWrapperProps {
  children: ReactNode
}

/**
 * Marketing homepage shell. Theme-agnostic: it renders against the semantic
 * background/foreground tokens, so it follows the app's light theme (and would
 * track dark too) with identical SSR/client markup — no hydration mismatch.
 */
export function HomeWrapper({ children }: HomeWrapperProps) {
  // No opaque background — the root layout's AppBackground shows through.
  return (
    <div className="relative min-h-screen overflow-hidden text-foreground">
      {children}
    </div>
  )
}
