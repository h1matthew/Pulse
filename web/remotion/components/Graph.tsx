interface GraphProps {
  x: number
  y: number
  width: number
  height: number
  data: number[]
  progress: number
  color?: string
  showAxes?: boolean
  xLabel?: string
  yLabel?: string
}

export function Graph({
  x,
  y,
  width,
  height,
  data,
  progress,
  color = '#60A5FA',
  showAxes = true,
  xLabel,
  yLabel,
}: GraphProps) {
  if (data.length === 0) return null

  const maxVal = Math.max(...data, 1)
  const padding = { top: 10, right: 10, bottom: showAxes ? 30 : 5, left: showAxes ? 40 : 5 }
  const plotW = width - padding.left - padding.right
  const plotH = height - padding.top - padding.bottom

  const visibleCount = Math.max(1, Math.ceil(data.length * Math.max(0, Math.min(1, progress))))

  // Build polyline points
  const pts = data.slice(0, visibleCount).map((val, i) => {
    const px = padding.left + (i / Math.max(data.length - 1, 1)) * plotW
    const py = padding.top + plotH - (val / maxVal) * plotH
    return `${px},${py}`
  })

  const clipId = `graph-clip-${x}-${y}`

  return (
    <g transform={`translate(${x}, ${y})`}>
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={0} width={width} height={height} />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        {/* Axes */}
        {showAxes && (
          <g>
            {/* Y axis */}
            <line
              x1={padding.left}
              y1={padding.top}
              x2={padding.left}
              y2={padding.top + plotH}
              stroke="#888"
              strokeWidth={1}
            />
            {/* X axis */}
            <line
              x1={padding.left}
              y1={padding.top + plotH}
              x2={padding.left + plotW}
              y2={padding.top + plotH}
              stroke="#888"
              strokeWidth={1}
            />
            {/* Tick marks on Y */}
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const ty = padding.top + plotH - t * plotH
              return (
                <g key={t}>
                  <line x1={padding.left - 4} y1={ty} x2={padding.left} y2={ty} stroke="#888" strokeWidth={1} />
                  <text x={padding.left - 6} y={ty + 4} textAnchor="end" fontSize={9} fill="#999">
                    {Math.round(maxVal * t)}
                  </text>
                </g>
              )
            })}
            {/* Labels */}
            {xLabel && (
              <text
                x={padding.left + plotW / 2}
                y={height - 2}
                textAnchor="middle"
                fontSize={10}
                fill="#AAA"
              >
                {xLabel}
              </text>
            )}
            {yLabel && (
              <text
                x={10}
                y={padding.top + plotH / 2}
                textAnchor="middle"
                fontSize={10}
                fill="#AAA"
                transform={`rotate(-90, 10, ${padding.top + plotH / 2})`}
              >
                {yLabel}
              </text>
            )}
          </g>
        )}

        {/* Data line */}
        {pts.length > 1 && (
          <polyline
            points={pts.join(' ')}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Dot at end */}
        {pts.length > 0 && progress > 0 && (
          <circle
            cx={parseFloat(pts[pts.length - 1].split(',')[0])}
            cy={parseFloat(pts[pts.length - 1].split(',')[1])}
            r={4}
            fill={color}
          />
        )}
      </g>
    </g>
  )
}
