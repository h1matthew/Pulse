import { useCurrentFrame, interpolate } from 'remotion'

interface PlanetProps {
  x: number
  y: number
  type: 'earth' | 'moon' | 'mars'
  radius?: number
  showAtmosphere?: boolean
}

export function Planet({ x, y, type, radius = 60, showAtmosphere = true }: PlanetProps) {
  const frame = useCurrentFrame()

  const atmosphereOpacity = interpolate(
    Math.sin(frame * 0.03),
    [-1, 1],
    [0.15, 0.3]
  )

  return (
    <g transform={`translate(${x}, ${y})`}>
      <defs>
        {/* Earth gradient */}
        <radialGradient id={`planet-earth-${x}-${y}`} cx="40%" cy="35%">
          <stop offset="0%" stopColor="#4AA3DF" />
          <stop offset="40%" stopColor="#2E86C1" />
          <stop offset="70%" stopColor="#1B6B3A" />
          <stop offset="100%" stopColor="#1A5276" />
        </radialGradient>

        {/* Moon gradient */}
        <radialGradient id={`planet-moon-${x}-${y}`} cx="40%" cy="35%">
          <stop offset="0%" stopColor="#D5D5D5" />
          <stop offset="50%" stopColor="#B0B0B0" />
          <stop offset="100%" stopColor="#808080" />
        </radialGradient>

        {/* Mars gradient */}
        <radialGradient id={`planet-mars-${x}-${y}`} cx="40%" cy="35%">
          <stop offset="0%" stopColor="#E07040" />
          <stop offset="50%" stopColor="#C0502A" />
          <stop offset="100%" stopColor="#8B3A1A" />
        </radialGradient>

        {/* Atmosphere glow */}
        <radialGradient id={`atmo-${x}-${y}`} cx="50%" cy="50%">
          <stop offset="70%" stopColor="transparent" />
          <stop
            offset="85%"
            stopColor={type === 'earth' ? '#87CEEB' : type === 'mars' ? '#E08050' : '#CCCCCC'}
            stopOpacity="0.3"
          />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        <clipPath id={`planet-clip-${x}-${y}`}>
          <circle cx={0} cy={0} r={radius} />
        </clipPath>
      </defs>

      {/* Atmosphere ring */}
      {showAtmosphere && type !== 'moon' && (
        <circle
          cx={0}
          cy={0}
          r={radius * 1.15}
          fill={`url(#atmo-${x}-${y})`}
          opacity={atmosphereOpacity}
        />
      )}

      {/* Planet body */}
      <circle
        cx={0}
        cy={0}
        r={radius}
        fill={`url(#planet-${type}-${x}-${y})`}
      />

      {/* Surface details clipped to planet */}
      <g clipPath={`url(#planet-clip-${x}-${y})`}>
        {type === 'earth' && (
          <>
            {/* Continent-like patches */}
            <ellipse cx={-radius * 0.2} cy={-radius * 0.15} rx={radius * 0.35} ry={radius * 0.25} fill="#2D8B4E" opacity={0.6} />
            <ellipse cx={radius * 0.3} cy={radius * 0.2} rx={radius * 0.2} ry={radius * 0.3} fill="#2D8B4E" opacity={0.5} />
            {/* Cloud wisps */}
            <ellipse
              cx={-radius * 0.1 + Math.sin(frame * 0.02) * 3}
              cy={-radius * 0.35}
              rx={radius * 0.3}
              ry={radius * 0.06}
              fill="white"
              opacity={0.5}
            />
            <ellipse
              cx={radius * 0.2 + Math.sin(frame * 0.015 + 1) * 3}
              cy={radius * 0.1}
              rx={radius * 0.25}
              ry={radius * 0.05}
              fill="white"
              opacity={0.4}
            />
            <ellipse
              cx={-radius * 0.25 + Math.sin(frame * 0.018 + 2) * 2}
              cy={radius * 0.35}
              rx={radius * 0.2}
              ry={radius * 0.04}
              fill="white"
              opacity={0.35}
            />
          </>
        )}

        {type === 'moon' && (
          <>
            {/* Craters */}
            <circle cx={-radius * 0.25} cy={-radius * 0.2} r={radius * 0.12} fill="#909090" stroke="#7A7A7A" strokeWidth={1} />
            <circle cx={radius * 0.3} cy={radius * 0.1} r={radius * 0.08} fill="#959595" stroke="#808080" strokeWidth={0.8} />
            <circle cx={radius * 0.05} cy={radius * 0.35} r={radius * 0.1} fill="#8A8A8A" stroke="#7A7A7A" strokeWidth={0.8} />
            <circle cx={-radius * 0.35} cy={radius * 0.15} r={radius * 0.06} fill="#929292" stroke="#828282" strokeWidth={0.5} />
            <circle cx={radius * 0.2} cy={-radius * 0.35} r={radius * 0.07} fill="#8E8E8E" stroke="#7E7E7E" strokeWidth={0.5} />
          </>
        )}

        {type === 'mars' && (
          <>
            {/* Dark patches */}
            <ellipse cx={-radius * 0.2} cy={-radius * 0.1} rx={radius * 0.25} ry={radius * 0.15} fill="#A04020" opacity={0.5} />
            <ellipse cx={radius * 0.25} cy={radius * 0.25} rx={radius * 0.2} ry={radius * 0.12} fill="#903518" opacity={0.4} />
            {/* Polar cap */}
            <ellipse cx={0} cy={-radius * 0.8} rx={radius * 0.4} ry={radius * 0.12} fill="#F0E8E0" opacity={0.6} />
          </>
        )}
      </g>
    </g>
  )
}
