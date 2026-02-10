'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface RocketIconProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  direction?: 'up' | 'right' | 'diagonal'
  animate?: boolean
  hoverLaunch?: boolean
  onClick?: () => void
}

export function RocketIcon({
  className,
  size = 'md',
  direction = 'up',
  animate = true,
  hoverLaunch = true,
  onClick,
}: RocketIconProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isLaunching, setIsLaunching] = useState(false)
  const [flameIntensity, setFlameIntensity] = useState(1)
  const animationRef = useRef<number | null>(null)

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
    xl: 'w-32 h-32',
  }

  const rotationMap = {
    up: 0,
    right: 90,
    diagonal: -45,
  }

  useEffect(() => {
    if (!animate) return

    const flicker = () => {
      setFlameIntensity(0.7 + Math.random() * 0.3)
      animationRef.current = requestAnimationFrame(flicker)
    }

    animationRef.current = requestAnimationFrame(flicker)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [animate])

  const handleMouseEnter = () => {
    setIsHovered(true)
    if (hoverLaunch) {
      setIsLaunching(true)
      setTimeout(() => setIsLaunching(false), 800)
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
  }

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center cursor-pointer',
        sizeClasses[size],
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        transform: `rotate(${rotationMap[direction]}deg)`,
      }}
    >
      {/* Flame effect */}
      {(animate || isHovered) && (
        <div
          className={cn(
            'absolute -bottom-2 left-1/2 transition-all duration-300',
            isLaunching ? 'scale-150' : 'scale-100'
          )}
          style={{
            opacity: flameIntensity,
            transform: `translateX(-50%) scaleY(${flameIntensity})`,
          }}
        >
          {/* Main flame */}
          <svg
            width={size === 'sm' ? 12 : size === 'md' ? 20 : size === 'lg' ? 32 : 48}
            height={size === 'sm' ? 16 : size === 'md' ? 24 : size === 'lg' ? 40 : 60}
            viewBox="0 0 20 30"
            className="animate-flame-flicker"
          >
            <defs>
              <linearGradient id={`flame-gradient-${size}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="50%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>
            <path
              d="M10 30 Q5 20 8 10 Q10 0 10 0 Q10 0 12 10 Q15 20 10 30"
              fill={`url(#flame-gradient-${size})`}
              opacity={0.9}
            />
            <path
              d="M10 25 Q7 18 9 12 Q10 5 10 5 Q10 5 11 12 Q13 18 10 25"
              fill="#fcd34d"
              opacity={0.7}
            />
          </svg>
        </div>
      )}

      {/* Rocket body */}
      <svg
        viewBox="0 0 48 48"
        className={cn(
          'relative z-10 w-full h-full transition-transform duration-300',
          animate && 'animate-rocket-float',
          isLaunching && 'animate-rocket-launch'
        )}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`rocket-body-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.65 0.2 250)" />
            <stop offset="100%" stopColor="oklch(0.45 0.18 250)" />
          </linearGradient>
          <linearGradient id={`rocket-nose-${size}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.7 0.15 195)" />
            <stop offset="100%" stopColor="oklch(0.65 0.2 250)" />
          </linearGradient>
        </defs>

        {/* Left fin */}
        <path
          d="M12 32 L4 44 L14 40 L16 34 Z"
          fill="oklch(0.35 0.15 250)"
          className={cn(
            'transition-transform duration-300',
            isHovered && 'translate-x-0.5'
          )}
        />

        {/* Right fin */}
        <path
          d="M36 32 L44 44 L34 40 L32 34 Z"
          fill="oklch(0.35 0.15 250)"
          className={cn(
            'transition-transform duration-300',
            isHovered && '-translate-x-0.5'
          )}
        />

        {/* Main body */}
        <ellipse
          cx="24"
          cy="26"
          rx="10"
          ry="18"
          fill={`url(#rocket-body-${size})`}
        />

        {/* Nose cone */}
        <path
          d="M14 14 Q24 -4 34 14 Z"
          fill={`url(#rocket-nose-${size})`}
        />

        {/* Window */}
        <circle cx="24" cy="20" r="5" fill="oklch(0.9 0.05 250)" />
        <circle cx="24" cy="20" r="4" fill="oklch(0.75 0.15 195)" />
        <circle cx="26" cy="18" r="1.5" fill="white" opacity="0.8" />

        {/* Center fin */}
        <path
          d="M22 38 L24 46 L26 38 Z"
          fill="oklch(0.35 0.15 250)"
        />

        {/* Detail lines */}
        <path
          d="M18 30 Q24 32 30 30"
          stroke="oklch(0.55 0.15 250)"
          strokeWidth="1"
          fill="none"
          opacity="0.5"
        />
      </svg>

      {/* Glow effect */}
      {isHovered && (
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse-soft" />
      )}
    </div>
  )
}

// Mini rocket for scroll indicator or small decorations
export function MiniRocket({
  className,
  progress = 0,
}: {
  className?: string
  progress?: number
}) {
  return (
    <div
      className={cn(
        'relative w-6 h-6 transition-transform duration-100',
        className
      )}
      style={{
        transform: `translateY(${-progress * 10}px)`,
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
        <path
          d="M12 2L8 10H16L12 2Z"
          fill="oklch(0.65 0.2 250)"
        />
        <rect x="10" y="10" width="4" height="8" rx="1" fill="oklch(0.55 0.18 250)" />
        <path d="M8 14L6 20H10V14H8Z" fill="oklch(0.45 0.15 250)" />
        <path d="M16 14L18 20H14V14H16Z" fill="oklch(0.45 0.15 250)" />
        <circle cx="12" cy="12" r="2" fill="oklch(0.85 0.1 250)" />
      </svg>

      {/* Mini flame */}
      {progress > 0 && (
        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-3 animate-flame-flicker"
          style={{
            background: 'linear-gradient(to bottom, #fbbf24, #f97316)',
            borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
          }}
        />
      )}
    </div>
  )
}
