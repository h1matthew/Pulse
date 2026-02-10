interface ForceArrowProps {
  x: number
  y: number
  length: number
  angle: number // degrees, 0 = right, 90 = down
  color: string
  label?: string
  strokeWidth?: number
  opacity?: number
}

export function ForceArrow({ x, y, length, angle, color, label, strokeWidth = 3, opacity = 1 }: ForceArrowProps) {
  const rad = (angle * Math.PI) / 180
  const endX = x + Math.cos(rad) * length
  const endY = y + Math.sin(rad) * length

  // Arrowhead
  const headSize = 10
  const headAngle1 = angle + 150
  const headAngle2 = angle - 150
  const head1X = endX + Math.cos((headAngle1 * Math.PI) / 180) * headSize
  const head1Y = endY + Math.sin((headAngle1 * Math.PI) / 180) * headSize
  const head2X = endX + Math.cos((headAngle2 * Math.PI) / 180) * headSize
  const head2Y = endY + Math.sin((headAngle2 * Math.PI) / 180) * headSize

  return (
    <g opacity={opacity}>
      <line
        x1={x}
        y1={y}
        x2={endX}
        y2={endY}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <polygon
        points={`${endX},${endY} ${head1X},${head1Y} ${head2X},${head2Y}`}
        fill={color}
      />
      {label && (
        <text
          x={endX + Math.cos(rad) * 15}
          y={endY + Math.sin(rad) * 15}
          fill={color}
          fontSize={14}
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {label}
        </text>
      )}
    </g>
  )
}
