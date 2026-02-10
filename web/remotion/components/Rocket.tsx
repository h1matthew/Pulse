import { interpolate, useCurrentFrame } from 'remotion'

interface RocketProps {
  x: number
  y: number
  scale?: number
  rotation?: number
  showExhaust?: boolean
  exhaustIntensity?: number
}

export function RocketSVG({ x, y, scale = 1, rotation = 0, showExhaust = false, exhaustIntensity = 1 }: RocketProps) {
  const frame = useCurrentFrame()

  return (
    <g transform={`translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`}>
      {/* Exhaust */}
      {showExhaust && (
        <g>
          {Array.from({ length: 8 }).map((_, i) => {
            const flicker = Math.sin(frame * 0.5 + i * 0.8) * 0.3 + 0.7
            const yOffset = 45 + i * 8 * exhaustIntensity
            const xOffset = Math.sin(frame * 0.3 + i) * 3
            const opacity = interpolate(i, [0, 7], [0.9, 0.1]) * flicker * exhaustIntensity
            const size = interpolate(i, [0, 7], [6, 14]) * exhaustIntensity

            return (
              <ellipse
                key={i}
                cx={xOffset}
                cy={yOffset}
                rx={size * 0.6}
                ry={size}
                fill={i < 3 ? '#FFE0A0' : i < 5 ? '#FFA040' : '#FF4020'}
                opacity={opacity}
              />
            )
          })}
        </g>
      )}

      {/* Rocket body */}
      <ellipse cx={0} cy={0} rx={12} ry={40} fill="#E8E8EC" stroke="#999" strokeWidth={1} />

      {/* Nose cone */}
      <path d="M -12 -10 Q -12 -45 0 -55 Q 12 -45 12 -10" fill="#3B82F6" stroke="#2563EB" strokeWidth={1} />

      {/* Window */}
      <circle cx={0} cy={-15} r={5} fill="#60A5FA" stroke="#2563EB" strokeWidth={1} />

      {/* Left fin */}
      <path d="M -12 25 L -25 45 L -12 40 Z" fill="#EF4444" stroke="#DC2626" strokeWidth={0.5} />

      {/* Right fin */}
      <path d="M 12 25 L 25 45 L 12 40 Z" fill="#EF4444" stroke="#DC2626" strokeWidth={0.5} />

      {/* Engine bell */}
      <path d="M -8 38 L -10 48 L 10 48 L 8 38 Z" fill="#666" stroke="#444" strokeWidth={0.5} />
    </g>
  )
}
