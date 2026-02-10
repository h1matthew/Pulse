import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion'
import React from 'react'

interface ConceptExplainerProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  labels?: { text: string; x: number; y: number; delay: number }[]
}

export function ConceptExplainer({ title, subtitle, children, labels = [] }: ConceptExplainerProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const stars = Array.from({ length: 20 }, (_, i) => ({
    x: (i * 137.5) % 1280,
    y: (i * 97.3) % 720,
    size: 1.5 + (i % 3) * 1.5,
    twinkle: Math.sin(frame * 0.05 + i * 2) * 0.4 + 0.6,
  }))

  // Phase 1 (0-30): Title fades in
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' })
  const titleY = interpolate(frame, [0, 30], [-20, 0], { extrapolateRight: 'clamp' })

  const subtitleOpacity = subtitle
    ? interpolate(frame, [15, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0

  // Phase 2 (30+): Children render
  const contentOpacity = interpolate(frame, [30, 50], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const contentScale = spring({ frame: Math.max(0, frame - 30), fps, config: { stiffness: 100, damping: 14 } })

  return (
    <AbsoluteFill>
      <svg viewBox="0 0 1280 720" style={{ width: '100%', height: '100%' }}>
        <rect x={0} y={0} width={1280} height={720} fill="#0F172A" />

        {stars.map((star, i) => (
          <circle key={i} cx={star.x} cy={star.y} r={star.size} fill="#FFFFFF" opacity={Math.round(star.twinkle * 1000) / 1000} />
        ))}

        {/* Title */}
        <g transform={`translate(0, ${titleY})`} opacity={titleOpacity}>
          <text
            x={640}
            y={70}
            fill="#FFFFFF"
            fontSize={44}
            fontWeight="bold"
            textAnchor="middle"
            fontFamily="sans-serif"
          >
            {title}
          </text>
        </g>

        {/* Subtitle */}
        {subtitle && (
          <text
            x={640}
            y={110}
            fill="#94A3B8"
            fontSize={24}
            textAnchor="middle"
            fontFamily="sans-serif"
            opacity={subtitleOpacity}
          >
            {subtitle}
          </text>
        )}

        {/* Labels */}
        {labels.map((label, i) => {
          const labelOpacity = interpolate(
            frame,
            [label.delay, label.delay + 20],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          )
          const labelScale = spring({
            frame: Math.max(0, frame - label.delay),
            fps,
            config: { stiffness: 120, damping: 12 },
          })

          return (
            <g key={i} transform={`translate(${label.x}, ${label.y}) scale(${labelScale})`} opacity={labelOpacity}>
              <rect
                x={-4}
                y={-18}
                width={label.text.length * 9 + 8}
                height={24}
                rx={4}
                fill="#1E293B"
                stroke="#3B82F6"
                strokeWidth={1}
              />
              <text
                x={label.text.length * 4.5}
                y={0}
                fill="#93C5FD"
                fontSize={16}
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                {label.text}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Children content overlay */}
      <AbsoluteFill style={{ opacity: contentOpacity, transform: `scale(${contentScale})` }}>
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
