interface TrajectoryProps {
  points: { x: number; y: number }[]
  progress: number
  color?: string
  showDot?: boolean
  dotSize?: number
  dashed?: boolean
}

function buildPathD(points: { x: number; y: number }[]): string {
  if (points.length < 2) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  if (points.length === 2) {
    d += ` L ${points[1].x} ${points[1].y}`
    return d
  }
  // Catmull-Rom to cubic bezier for smooth curve
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(i + 2, points.length - 1)]

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }
  return d
}

function getPointAtProgress(
  points: { x: number; y: number }[],
  progress: number
): { x: number; y: number } {
  if (points.length < 2) return points[0] || { x: 0, y: 0 }
  const t = Math.max(0, Math.min(1, progress)) * (points.length - 1)
  const i = Math.floor(t)
  const frac = t - i
  const a = points[Math.min(i, points.length - 1)]
  const b = points[Math.min(i + 1, points.length - 1)]
  return { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac }
}

export function Trajectory({
  points,
  progress,
  color = '#60A5FA',
  showDot = true,
  dotSize = 6,
  dashed = false,
}: TrajectoryProps) {
  if (points.length < 2) return null

  const pathD = buildPathD(points)
  const clipId = `traj-clip-${points.map((p) => `${p.x}${p.y}`).join('-')}`
  const dotPos = getPointAtProgress(points, progress)

  // Compute bounding box for clip rect
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(...xs) - 50
  const maxX = Math.max(...xs) + 50
  const minY = Math.min(...ys) - 50
  const maxY = Math.max(...ys) + 50
  const totalWidth = maxX - minX
  const clipWidth = totalWidth * Math.max(0, Math.min(1, progress))

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect x={minX} y={minY} width={clipWidth} height={maxY - minY} />
        </clipPath>
      </defs>

      {/* Full path faded */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeOpacity={0.15}
        strokeDasharray={dashed ? '8 4' : undefined}
      />

      {/* Clipped visible path */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={2}
        clipPath={`url(#${clipId})`}
        strokeDasharray={dashed ? '8 4' : undefined}
      />

      {/* Moving dot */}
      {showDot && progress > 0 && (
        <circle
          cx={dotPos.x}
          cy={dotPos.y}
          r={dotSize}
          fill={color}
        />
      )}
    </g>
  )
}
