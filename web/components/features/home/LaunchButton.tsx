'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface LaunchButtonProps {
  children: React.ReactNode
  className?: string
}

export function LaunchButton({ children, className }: LaunchButtonProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Button
      size="lg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group relative h-12 px-8 text-base font-semibold overflow-hidden transition-all duration-300",
        'bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:-translate-y-0.5',
        className
      )}
    >
      {/* Launch countdown effect on hover */}
      {isHovered && (
        <>
          <span className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 animate-shimmer" />
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-8 bg-gradient-to-t from-primary/40 to-transparent blur-md animate-pulse" />
        </>
      )}
      {/* Magnetic hover effect overlay */}
      <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <span className="relative flex items-center">
        {children}
      </span>
    </Button>
  )
}
