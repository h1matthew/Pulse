interface GaugeProps {
  x: number
  y: number
  radius?: number
  value: number
  label?: string
  color?: string
  showTicks?: boolean
}

export function Gauge({
  x,
  y,
  radius = 50,
  value,
  label,
  color = '#60A5FA',
  showTicks = true,
}: GaugeProps) {
  const clampedValue = Math.max(0, Math.min(1, value))

  // Arc from -135deg to 135deg (270deg sweep)
  const startAngle = -135
  const endAngle = 135
  const totalSweep = endAngle - startAngle // 270

  const toRad = (deg: number) => (deg * Math.PI) / 180

  // Arc background path
  const arcPath = (fromDeg: number, toDeg: number, r: number) => {
    const fromRad = toRad(fromDeg - 90) // offset so 0 is top
    const toRad2 = toRad(toDeg - 90)
    const x1 = Math.cos(fromRad) * r
    const y1 = Math.sin(fromRad) * r
    const x2 = Math.cos(toRad2) * r
    const y2 = Math.sin(toRad2) * r
    const largeArc = toDeg - fromDeg > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`
  }

  // Needle angle
  const needleAngle = startAngle + clampedValue * totalSweep
  const needleRad = toRad(needleAngle - 90)
  const needleLen = radius * 0.75
  const needleX = Math.cos(needleRad) * needleLen
  const needleY = Math.sin(needleRad) * needleLen

  // Tick marks
  const tickCount = 10
  const ticks = Array.from({ length: tickCount + 1 }).map((_, i) => {
    const t = i / tickCount
    const angle = startAngle + t * totalSweep
    const rad = toRad(angle - 90)
    const innerR = radius * 0.82
    const outerR = radius * 0.95
    return {
      x1: Math.cos(rad) * innerR,
      y1: Math.sin(rad) * innerR,
      x2: Math.cos(rad) * outerR,
      y2: Math.sin(rad) * outerR,
    }
  })

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Background arc */}
      <path
        d={arcPath(startAngle, endAngle, radius)}
        fill="none"
        stroke="#333"
        strokeWidth={8}
        strokeLinecap="round"
      />

      {/* Value arc */}
      {clampedValue > 0.005 && (
        <path
          d={arcPath(startAngle, startAngle + clampedValue * totalSweep, radius)}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
        />
      )}

      {/* Tick marks */}
      {showTicks &&
        ticks.map((tick, i) => (
          <line
            key={i}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke="#666"
            strokeWidth={1.5}
          />
        ))}

      {/* Needle */}
      <line
        x1={0}
        y1={0}
        x2={needleX}
        y2={needleY}
        stroke="#EEE"
        strokeWidth={2.5}
        strokeLinecap="round"
      />

      {/* Center dot */}
      <circle cx={0} cy={0} r={4} fill="#EEE" />

      {/* Value text */}
      <text
        x={0}
        y={radius * 0.35}
        textAnchor="middle"
        fontSize={14}
        fontWeight="bold"
        fill={color}
      >
        {Math.round(clampedValue * 100)}%
      </text>

      {/* Label */}
      {label && (
        <text
          x={0}
          y={radius * 0.55}
          textAnchor="middle"
          fontSize={10}
          fill="#999"
        >
          {label}
        </text>
      )}
    </g>
  )
}
