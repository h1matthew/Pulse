'use client'

import { useEffect, useState } from 'react'

export function ScrollIndicator() {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const handleScroll = () => {
      // Hide after scrolling past 100px
      const scrolled = window.scrollY
      setIsVisible(scrolled < 100)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleClick = () => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: 'smooth'
    })
  }

  return (
    <button
      onClick={handleClick}
      className={`
        absolute bottom-10 flex flex-col items-center gap-2
        transition-all duration-500 ease-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
      `}
      aria-label="Scroll to explore"
    >
      <span className="text-xs text-muted-foreground/60">Scroll to explore</span>
      <div className="h-12 w-7 rounded-full border-2 border-muted-foreground/20 p-1.5">
        <div className="h-2 w-full rounded-full bg-muted-foreground/40 animate-bounce-subtle" />
      </div>
    </button>
  )
}
