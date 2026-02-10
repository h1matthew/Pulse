'use client'

import { useMemo } from 'react'
import { Html } from '@react-three/drei'
import { BookOpen, Rocket, Brain, type LucideIcon } from 'lucide-react'
import { Asteroid } from './Asteroid'
import { FEATURES, type FeatureData } from './FeatureCard3D'

const iconMap: Record<FeatureData['icon'], LucideIcon> = {
  book: BookOpen,
  rocket: Rocket,
  brain: Brain,
}

function FeatureCardContent({ feature, opacity }: { feature: FeatureData; opacity: number }) {
  const Icon = iconMap[feature.icon]

  return (
    <div
      className="flex flex-col items-center justify-center text-center w-[320px] p-6 rounded-xl bg-background/70 backdrop-blur-md border border-primary/30 shadow-2xl"
      style={{ opacity }}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary backdrop-blur-sm border border-primary/30 shadow-lg shadow-primary/20">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="mb-2 font-bold text-foreground text-2xl">{feature.title}</h3>
      <p className="text-base leading-relaxed text-muted-foreground">{feature.description}</p>
    </div>
  )
}

interface AsteroidFieldProps {
  scrollProgress: number
  rocketY: number
}

export function AsteroidField({ scrollProgress, rocketY }: AsteroidFieldProps) {
  // Asteroid configurations - asteroids come from BELOW and travel UPWARD past the rocket
  // Creates effect of rocket flying through asteroid field, asteroids whizzing by from below
  // Each asteroid appears one at a time based on scroll progress
  // Pattern: LEFT - RIGHT - LEFT (alternating sides)
  // Velocity determines how much the asteroid drifts during its scroll window
  // Camera is at y=5, so asteroids visible from roughly y=-6 to y=16
  // Feature cards are rendered at cardOffset positions using drei's Html component
  const asteroidConfigs = useMemo(
    () => [
      // Asteroid 1 - Far left, travels up and slightly right
      // Card centered on asteroid
      {
        position: [-12, -4, 0] as [number, number, number],
        velocity: [1, 12, 0] as [number, number, number],
        scale: 7.0,
        showStart: 0,
        showEnd: 0.35,
        cardOffset: [-2, 2, 0] as [number, number, number],
      },
      // Asteroid 2 - Far right, travels up and slightly left
      // Card centered on asteroid
      {
        position: [11, -3, 0] as [number, number, number],
        velocity: [-1, 10, 0] as [number, number, number],
        scale: 6.5,
        showStart: 0.25,
        showEnd: 0.55,
        cardOffset: [1, 2, 0] as [number, number, number],
      },
      // Asteroid 3 - Far left, travels up and slightly right
      // Card centered on asteroid
      {
        position: [-10, -5, 0] as [number, number, number],
        velocity: [1, 11, 0] as [number, number, number],
        scale: 6.0,
        showStart: 0.45,
        showEnd: 0.85,
        cardOffset: [-2, 2, 0] as [number, number, number],
      },
    ],
    []
  )

  return (
    <group>
      {/* Main feature asteroids */}
      {asteroidConfigs.map((config, index) => {
        // Only show this asteroid during its scroll window
        const isInWindow = scrollProgress >= config.showStart && scrollProgress <= config.showEnd

        if (!isInWindow) {
          return null
        }

        // Calculate how far through this asteroid's window we are (0 to 1)
        const windowProgress = (scrollProgress - config.showStart) / (config.showEnd - config.showStart)

        // Calculate animated position based on velocity
        // Asteroid drifts from start position by velocity * progress
        const animatedPosition: [number, number, number] = [
          config.position[0] + config.velocity[0] * windowProgress,
          config.position[1] + config.velocity[1] * windowProgress,
          config.position[2] + config.velocity[2] * windowProgress,
        ]

        // Calculate fade in/out within the window
        const windowDuration = config.showEnd - config.showStart
        const fadeInEnd = config.showStart + windowDuration * 0.15
        const fadeOutStart = config.showEnd - windowDuration * 0.15

        let asteroidOpacity = 1
        if (scrollProgress < fadeInEnd) {
          // Fading in
          asteroidOpacity = (scrollProgress - config.showStart) / (fadeInEnd - config.showStart)
        } else if (scrollProgress > fadeOutStart) {
          // Fading out
          asteroidOpacity = (config.showEnd - scrollProgress) / (config.showEnd - fadeOutStart)
        }
        asteroidOpacity = Math.max(0, Math.min(1, asteroidOpacity))

        // Calculate card position by adding offset to animated position
        const cardPosition: [number, number, number] = [
          animatedPosition[0] + config.cardOffset[0],
          animatedPosition[1] + config.cardOffset[1],
          animatedPosition[2] + config.cardOffset[2],
        ]

        return (
          <group key={index}>
            <Asteroid
              position={animatedPosition}
              scale={config.scale}
              asteroidOpacity={asteroidOpacity}
              rotationSpeed={0}
            />
            <Html
              position={cardPosition}
              center
              style={{
                pointerEvents: 'none',
                transform: 'scale(0.75)',
              }}
            >
              <FeatureCardContent feature={FEATURES[index]} opacity={asteroidOpacity} />
            </Html>
          </group>
        )
      })}
    </group>
  )
}
