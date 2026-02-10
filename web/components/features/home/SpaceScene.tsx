'use client'

// IMPORTANT: Import patch before any Three.js/drei imports to fix texture loading errors
import '@/lib/three-patches'

import { Suspense, useState, useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Stars, Preload } from '@react-three/drei'
import { Rocket3DModel } from './Rocket3DModel'
import { AsteroidField } from './AsteroidField'

interface SpaceSceneProps {
  scrollProgress: number
}

// Lerp helper
function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

function SceneContent({ scrollProgress }: SpaceSceneProps) {
  // Three-phase rocket movement:
  // Phase 0 (0-50%): Rocket hidden, nose peeks in at bottom
  // Phase 1 (50-85%): Very slow ascent during asteroid section
  // Phase 2 (85-100%): Zoom away after asteroids are done
  const rocketY = useMemo(() => {
    const REVEAL_POINT = 0.50  // Rocket stays at bottom for half the scroll
    const ASTEROID_END = 0.85  // When last asteroid disappears

    if (scrollProgress <= REVEAL_POINT) {
      // Phase 0: Rocket hidden below screen, just starts to peek
      // Start at -15 (completely off-screen), rise to -10 (nose visible at bottom)
      const revealProgress = scrollProgress / REVEAL_POINT
      return lerp(-15, -10, revealProgress)
    } else if (scrollProgress <= ASTEROID_END) {
      // Phase 1: Very slow ascent during asteroid section
      // Move from -10 to -6 (only 4 units over 35% scroll - barely moves)
      const slowProgress = (scrollProgress - REVEAL_POINT) / (ASTEROID_END - REVEAL_POINT)
      return lerp(-10, -6, slowProgress)
    } else {
      // Phase 2: Zoom away after asteroids
      // Accelerate from -6 to 50+ for dramatic exit
      const zoomProgress = (scrollProgress - ASTEROID_END) / (1 - ASTEROID_END)
      const eased = zoomProgress * zoomProgress // Quadratic easing for acceleration
      return lerp(-6, 50, eased)
    }
  }, [scrollProgress])

  return (
    <>
      {/* Lighting - adjusted for front view */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 10, 15]}
        intensity={1.2}
        castShadow
      />
      <pointLight position={[0, 0, 10]} intensity={0.6} color="#6366f1" />
      <pointLight position={[-5, -5, 5]} intensity={0.4} color="#f97316" />

      {/* Stars background */}
      <Stars
        radius={100}
        depth={50}
        count={5000}
        factor={6}
        saturation={0}
        fade
        speed={0.5}
      />

      {/* Rocket flying vertically upward */}
      <Suspense fallback={null}>
        <Rocket3DModel scrollProgress={scrollProgress} rocketY={rocketY} />
      </Suspense>

      {/* Asteroids with feature cards positioned on sides */}
      <AsteroidField scrollProgress={scrollProgress} rocketY={rocketY} />
    </>
  )
}

export function SpaceScene({ scrollProgress }: SpaceSceneProps) {
  const [mounted, setMounted] = useState(false)

  // SSR protection
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Placeholder during SSR
    return (
      <div className="w-full h-full bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading 3D scene...</div>
      </div>
    )
  }

  return (
    <Canvas
      camera={{
        // Front view: camera centered vertically to see rocket at bottom of screen
        position: [0, 0, 20],
        fov: 60,
        near: 0.1,
        far: 200,
      }}
      dpr={[1, 2]}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      }}
      style={{ background: 'transparent' }}
    >
      {/* No scene rotation needed for front view */}
      <SceneContent scrollProgress={scrollProgress} />
      <Preload all />
    </Canvas>
  )
}
