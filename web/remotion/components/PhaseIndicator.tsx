interface PhaseIndicatorProps {
  x: number
  y: number
  phases: string[]
  activePhase: number
}

export function PhaseIndicator({ x, y, phases, activePhase }: PhaseIndicatorProps) {
  if (phases.length === 0) return null

  const spacing = 120
  const totalWidth = (phases.length - 1) * spacing
  const startX = -totalWidth / 2

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Connecting line */}
      <line
        x1={startX}
        y1={0}
        x2={startX + totalWidth}
        y2={0}
        stroke="#444"
        strokeWidth={2}
      />

      {phases.map((phase, i) => {
        const px = startX + i * spacing
        const isActive = i === activePhase
        const isPast = i < activePhase

        return (
          <g key={i} transform={`translate(${px}, 0)`}>
            {/* Dot */}
            <circle
              cx={0}
              cy={0}
              r={isActive ? 8 : 6}
              fill={isActive ? '#60A5FA' : isPast ? '#3B82F6' : '#444'}
              stroke={isActive ? '#93C5FD' : 'none'}
              strokeWidth={isActive ? 2 : 0}
            />

            {/* Label */}
            <text
              x={0}
              y={22}
              textAnchor="middle"
              fontSize={isActive ? 11 : 10}
              fontWeight={isActive ? 'bold' : 'normal'}
              fill={isActive ? '#E0E0E0' : isPast ? '#999' : '#666'}
            >
              {phase}
            </text>
          </g>
        )
      })}
    </g>
  )
}
