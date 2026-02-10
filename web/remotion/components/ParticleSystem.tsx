import { useCurrentFrame } from 'remotion'

interface ParticleSystemProps {
  x: number
  y: number
  count?: number
  spread?: number
  speed?: number
  color?: string
  direction?: 'down' | 'up' | 'radial'
  intensity?: number
}

// Deterministic pseudo-random from seed
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

export function ParticleSystem({
  x,
  y,
  count = 20,
  spread = 30,
  speed = 2,
  color = '#FFA040',
  direction = 'down',
  intensity = 1,
}: ParticleSystemProps) {
  const frame = useCurrentFrame()
  const clampedIntensity = Math.max(0, Math.min(1, intensity))

  if (clampedIntensity === 0) return null

  const visibleCount = Math.ceil(count * clampedIntensity)

  const particles = Array.from({ length: visibleCount }).map((_, i) => {
    const seed = i * 7 + 3
    const rPhase = seededRandom(seed) * 100
    const rSpread = (seededRandom(seed + 1) - 0.5) * 2
    const rSpeed = 0.7 + seededRandom(seed + 2) * 0.6
    const rSize = 1.5 + seededRandom(seed + 3) * 3

    // Particle lifecycle: loops based on frame
    const lifetime = 40 + seededRandom(seed + 4) * 30
    const t = ((frame * speed * rSpeed + rPhase) % lifetime) / lifetime // 0-1

    let px: number
    let py: number

    if (direction === 'down') {
      px = rSpread * spread * (0.5 + t * 0.5)
      py = t * spread * 2
    } else if (direction === 'up') {
      px = rSpread * spread * (0.5 + t * 0.5)
      py = -t * spread * 2
    } else {
      // radial
      const angle = seededRandom(seed + 5) * Math.PI * 2
      const dist = t * spread * 1.5
      px = Math.cos(angle) * dist
      py = Math.sin(angle) * dist
    }

    const opacity = clampedIntensity * (1 - t) * 0.8

    return (
      <circle
        key={i}
        cx={px}
        cy={py}
        r={rSize * (1 - t * 0.5)}
        fill={color}
        opacity={opacity}
      />
    )
  })

  return <g transform={`translate(${x}, ${y})`}>{particles}</g>
}
