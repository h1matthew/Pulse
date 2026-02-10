'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface FloatingElementProps {
  children: React.ReactNode
  className?: string
  amplitude?: number
  duration?: number
  delay?: number
  mouseFollow?: boolean
  mouseFactor?: number
}

export function FloatingElement({
  children,
  className,
  amplitude = 10,
  duration = 4,
  delay = 0,
  mouseFollow = false,
  mouseFactor = 0.02,
}: FloatingElementProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (!mouseFollow) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!ref.current) return

      const rect = ref.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      const deltaX = (e.clientX - centerX) * mouseFactor
      const deltaY = (e.clientY - centerY) * mouseFactor

      setMouseOffset({ x: deltaX, y: deltaY })
    }

    const handleMouseLeave = () => {
      setMouseOffset({ x: 0, y: 0 })
      setIsHovered(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    ref.current?.addEventListener('mouseenter', () => setIsHovered(true))
    ref.current?.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [mouseFollow, mouseFactor])

  return (
    <div
      ref={ref}
      className={cn(
        'will-change-transform',
        className
      )}
      style={{
        animation: `float-bob ${duration}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
        transform: mouseFollow
          ? `translate(${mouseOffset.x}px, ${mouseOffset.y}px) ${isHovered ? 'scale(1.02)' : 'scale(1)'}`
          : undefined,
        transition: mouseFollow ? 'transform 0.2s ease-out' : undefined,
      }}
    >
      {children}
    </div>
  )
}

// Simple floating wrapper without mouse follow
interface SimpleFloatProps {
  children: React.ReactNode
  className?: string
  y?: number
  duration?: number
  delay?: number
}

export function SimpleFloat({
  children,
  className,
  y = 10,
  duration = 3,
  delay = 0,
}: SimpleFloatProps) {
  return (
    <div
      className={cn('will-change-transform', className)}
      style={{
        animation: `float ${duration}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
        ['--float-y' as string]: `${y}px`,
      }}
    >
      {children}
    </div>
  )
}

// Add custom float keyframe with variable
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(var(--float-y, 10px)); }
    }
  `
  document.head.appendChild(style)
}
