'use client'

import { useRef, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { gsap, ScrollTrigger } from '@/lib/gsap'

// Lazy-load SpaceScene (Three.js ~1.2MB, @react-three/fiber, @react-three/drei)
const SpaceScene = dynamic(
  () => import('./SpaceScene').then(m => ({ default: m.SpaceScene })),
  {
    ssr: false,
    loading: () => <div className="w-full h-full bg-background" />,
  }
)

export function AsteroidParallax() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    if (!containerRef.current || prefersReducedMotion) return

    // Create ScrollTrigger for tracking scroll progress
    const trigger = ScrollTrigger.create({
      trigger: containerRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.5,
      onUpdate: (self) => {
        setScrollProgress(self.progress)
      },
    })

    return () => {
      trigger.kill()
    }
  }, [prefersReducedMotion])

  // For reduced motion, show a static version
  if (prefersReducedMotion) {
    return (
      <section className="relative px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything you need to understand rockets
            </h2>
            <p className="mt-4 text-muted-foreground">
              A structured course from the fundamentals to advanced model rocketry.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {/* Static feature cards for reduced motion */}
            <StaticFeatureCard
              title="Structured Modules"
              description="6 modules taking you from propulsion basics to building advanced multi-stage rockets."
            />
            <StaticFeatureCard
              title="Visual Simulations"
              description="Animated visualizations of thrust, drag, orbits, and rocket assembly powered by Remotion."
            />
            <StaticFeatureCard
              title="AI Tutor"
              description="Ask questions about any concept and get clear explanations from our Gemini-powered tutor."
            />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      ref={containerRef}
      className="relative h-[800vh]"
      aria-label="Features showcase with 3D rocket and asteroids"
    >
      {/* Section header - visible at start */}
      <div className="absolute top-0 left-0 right-0 pt-32 pb-8 text-center z-10 pointer-events-none">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Everything you need to understand rockets
        </h2>
        <p className="mt-4 text-muted-foreground">
          Scroll to explore our features
        </p>
      </div>

      {/* Sticky 3D scene - feature cards now rendered inside via drei Html */}
      <div className="sticky top-0 h-screen w-full">
        <SpaceScene scrollProgress={scrollProgress} />
      </div>

      {/* Scroll progress indicator */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div className="h-1 w-32 bg-muted/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-75"
            style={{ width: `${scrollProgress * 100}%` }}
          />
        </div>
      </div>
    </section>
  )
}

function StaticFeatureCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-6">
      <h3 className="mb-2 font-semibold text-card-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  )
}
