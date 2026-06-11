'use client'

import { useState } from 'react'

// Lives in the browser bundle, so it survives client-side navigations but
// resets on a full page load — exactly when the watercolor splash replays.
let introPlayed = false

/**
 * Root template — remounts on every navigation. On first load the content
 * holds back (`animate-page-enter-delayed`) while the watercolor splashes
 * land, then rises in over them. Client-side navigations render instantly:
 * replaying an entrance on every nav makes in-app navigation feel like a
 * full page reload. Reduced-motion users get an instant appearance via the
 * global override in theme.css.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const [delayed] = useState(() => {
    // SSR always emits the delayed intro; it hydrates as the first load.
    if (typeof window === 'undefined') return true
    if (introPlayed) return false
    introPlayed = true
    return true
  })

  return (
    <div className={delayed ? 'animate-page-enter-delayed' : undefined}>
      {children}
    </div>
  )
}
