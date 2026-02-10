import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion'
import React from 'react'

interface ComparisonProps {
  leftTitle: string
  rightTitle: string
  leftContent: React.ReactNode
  rightContent: React.ReactNode
  leftLabel?: string
  rightLabel?: string
  leftColor?: string
  rightColor?: string
}

export function Comparison({
  leftTitle,
  rightTitle,
  leftContent,
  rightContent,
  leftLabel,
  rightLabel,
  leftColor = '#3B82F6',
  rightColor = '#F59E0B',
}: ComparisonProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const stars = Array.from({ length: 20 }, (_, i) => ({
    x: (i * 137.5) % 1280,
    y: (i * 97.3) % 720,
    size: 1.5 + (i % 3) * 1.5,
    twinkle: Math.sin(frame * 0.05 + i * 2) * 0.4 + 0.6,
  }))

  // Phase 1 (0-30): "VS" title area fades in
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' })

  // Phase 2 (30-60): Left side appears
  const leftOpacity = interpolate(frame, [30, 50], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const leftSlide = interpolate(frame, [30, 50], [-40, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const leftScale = spring({ frame: Math.max(0, frame - 30), fps, config: { stiffness: 100, damping: 14 } })

  // Phase 3 (60-90): Right side appears
  const rightOpacity = interpolate(frame, [60, 80], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const rightSlide = interpolate(frame, [60, 80], [40, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const rightScale = spring({ frame: Math.max(0, frame - 60), fps, config: { stiffness: 100, damping: 14 } })

  // Phase 4 (90-120): Labels appear
  const labelOpacity = interpolate(frame, [90, 110], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const labelScale = spring({ frame: Math.max(0, frame - 90), fps, config: { stiffness: 120, damping: 12 } })

  // Divider animation
  const dividerHeight = interpolate(frame, [20, 50], [0, 500], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill>
      <svg viewBox="0 0 1280 720" style={{ width: '100%', height: '100%' }}>
        <rect x={0} y={0} width={1280} height={720} fill="#0F172A" />

        {stars.map((star, i) => (
          <circle key={i} cx={star.x} cy={star.y} r={star.size} fill="#FFFFFF" opacity={Math.round(star.twinkle * 1000) / 1000} />
        ))}

        {/* Vertical divider */}
        <line
          x1={640}
          y1={110}
          x2={640}
          y2={110 + dividerHeight}
          stroke="#334155"
          strokeWidth={2}
          strokeDasharray="8 4"
        />

        {/* VS badge */}
        <g opacity={titleOpacity}>
          <circle cx={640} cy={360} r={28} fill="#1E293B" stroke="#475569" strokeWidth={2} />
          <text x={640} y={368} fill="#94A3B8" fontSize={20} fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
            VS
          </text>
        </g>

        {/* Left title */}
        <g transform={`translate(${leftSlide}, 0)`} opacity={leftOpacity}>
          <text x={320} y={70} fill={leftColor} fontSize={36} fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
            {leftTitle}
          </text>
        </g>

        {/* Right title */}
        <g transform={`translate(${rightSlide}, 0)`} opacity={rightOpacity}>
          <text x={960} y={70} fill={rightColor} fontSize={36} fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
            {rightTitle}
          </text>
        </g>

        {/* Left label */}
        {leftLabel && (
          <g transform={`translate(320, 650) scale(${labelScale})`} opacity={labelOpacity}>
            <rect
              x={-(leftLabel.length * 5 + 12)}
              y={-20}
              width={leftLabel.length * 10 + 24}
              height={30}
              rx={6}
              fill={leftColor}
              opacity={0.2}
            />
            <text x={0} y={0} fill={leftColor} fontSize={18} fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
              {leftLabel}
            </text>
          </g>
        )}

        {/* Right label */}
        {rightLabel && (
          <g transform={`translate(960, 650) scale(${labelScale})`} opacity={labelOpacity}>
            <rect
              x={-(rightLabel.length * 5 + 12)}
              y={-20}
              width={rightLabel.length * 10 + 24}
              height={30}
              rx={6}
              fill={rightColor}
              opacity={0.2}
            />
            <text x={0} y={0} fill={rightColor} fontSize={18} fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
              {rightLabel}
            </text>
          </g>
        )}
      </svg>

      {/* Left content overlay */}
      <AbsoluteFill
        style={{
          opacity: leftOpacity,
          transform: `translateX(${leftSlide}px) scale(${leftScale})`,
          clipPath: 'inset(0 50% 0 0)',
        }}
      >
        {leftContent}
      </AbsoluteFill>

      {/* Right content overlay */}
      <AbsoluteFill
        style={{
          opacity: rightOpacity,
          transform: `translateX(${rightSlide}px) scale(${rightScale})`,
          clipPath: 'inset(0 0 0 50%)',
        }}
      >
        {rightContent}
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
