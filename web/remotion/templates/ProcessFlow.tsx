import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion'
import React from 'react'

interface ProcessFlowProps {
  title: string
  steps: { label: string; icon?: React.ReactNode }[]
  activeStep: number
  direction?: 'horizontal' | 'vertical'
}

export function ProcessFlow({ title, steps, activeStep, direction = 'horizontal' }: ProcessFlowProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const stars = Array.from({ length: 20 }, (_, i) => ({
    x: (i * 137.5) % 1280,
    y: (i * 97.3) % 720,
    size: 1.5 + (i % 3) * 1.5,
    twinkle: Math.sin(frame * 0.05 + i * 2) * 0.4 + 0.6,
  }))

  const titleOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' })

  const stepCount = steps.length
  const isHorizontal = direction === 'horizontal'

  // Layout calculations
  const getStepPosition = (index: number) => {
    if (isHorizontal) {
      const totalWidth = 900
      const spacing = stepCount > 1 ? totalWidth / (stepCount - 1) : 0
      const startX = 640 - totalWidth / 2
      return { x: startX + index * spacing, y: 380 }
    }
    const totalHeight = 440
    const spacing = stepCount > 1 ? totalHeight / (stepCount - 1) : 0
    const startY = 160
    return { x: 300, y: startY + index * spacing }
  }

  const circleRadius = 30
  const activeColor = '#3B82F6'
  const completedColor = '#22C55E'
  const inactiveColor = '#334155'
  const inactiveStroke = '#475569'

  return (
    <AbsoluteFill>
      <svg viewBox="0 0 1280 720" style={{ width: '100%', height: '100%' }}>
        <rect x={0} y={0} width={1280} height={720} fill="#0F172A" />

        {stars.map((star, i) => (
          <circle key={i} cx={star.x} cy={star.y} r={star.size} fill="#FFFFFF" opacity={Math.round(star.twinkle * 1000) / 1000} />
        ))}

        {/* Title */}
        <text
          x={640}
          y={isHorizontal ? 70 : 70}
          fill="#FFFFFF"
          fontSize={44}
          fontWeight="bold"
          textAnchor="middle"
          fontFamily="sans-serif"
          opacity={titleOpacity}
        >
          {title}
        </text>

        {/* Connector lines between steps */}
        {steps.map((_, i) => {
          if (i === stepCount - 1) return null
          const from = getStepPosition(i)
          const to = getStepPosition(i + 1)

          const lineAppear = spring({
            frame: Math.max(0, frame - 30 - i * 15),
            fps,
            config: { stiffness: 80, damping: 14 },
          })

          const isCompleted = i < activeStep
          const lineColor = isCompleted ? completedColor : inactiveStroke

          if (isHorizontal) {
            const startX = from.x + circleRadius + 4
            const endX = to.x - circleRadius - 12
            const midX = startX + (endX - startX) * lineAppear
            return (
              <g key={`line-${i}`}>
                <line x1={startX} y1={from.y} x2={midX} y2={from.y} stroke={lineColor} strokeWidth={3} />
                {/* Arrow */}
                {lineAppear > 0.9 && (
                  <polygon
                    points={`${to.x - circleRadius - 4},-6 ${to.x - circleRadius + 4},0 ${to.x - circleRadius - 4},6`}
                    fill={lineColor}
                    transform={`translate(0, ${from.y})`}
                  />
                )}
              </g>
            )
          }
          const startY = from.y + circleRadius + 4
          const endY = to.y - circleRadius - 12
          const midY = startY + (endY - startY) * lineAppear
          return (
            <g key={`line-${i}`}>
              <line x1={from.x} y1={startY} x2={from.x} y2={midY} stroke={lineColor} strokeWidth={3} />
              {lineAppear > 0.9 && (
                <polygon
                  points={`-6,${to.y - circleRadius - 4} 0,${to.y - circleRadius + 4} 6,${to.y - circleRadius - 4}`}
                  fill={lineColor}
                  transform={`translate(${from.x}, 0)`}
                />
              )}
            </g>
          )
        })}

        {/* Step circles and labels */}
        {steps.map((step, i) => {
          const pos = getStepPosition(i)
          const stepAppear = spring({
            frame: Math.max(0, frame - 30 - i * 15),
            fps,
            config: { stiffness: 120, damping: 12 },
          })

          const isActive = i === activeStep
          const isCompleted = i < activeStep
          const fillColor = isActive ? activeColor : isCompleted ? completedColor : inactiveColor
          const strokeColor = isActive ? '#60A5FA' : isCompleted ? '#4ADE80' : inactiveStroke

          // Pulse for active step
          const pulse = isActive ? Math.sin(frame * 0.1) * 4 + circleRadius : circleRadius

          const labelOpacity = interpolate(
            frame,
            [40 + i * 15, 55 + i * 15],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          )

          return (
            <g key={`step-${i}`} transform={`translate(${pos.x}, ${pos.y}) scale(${stepAppear})`}>
              {/* Glow for active */}
              {isActive && (
                <circle cx={0} cy={0} r={pulse + 8} fill={activeColor} opacity={0.15} />
              )}

              {/* Circle */}
              <circle cx={0} cy={0} r={pulse} fill={fillColor} stroke={strokeColor} strokeWidth={3} />

              {/* Step number */}
              <text x={0} y={6} fill="#FFFFFF" fontSize={20} fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
                {isCompleted ? '\u2713' : i + 1}
              </text>

              {/* Label */}
              <text
                x={isHorizontal ? 0 : circleRadius + 16}
                y={isHorizontal ? circleRadius + 30 : 6}
                fill={isActive ? '#93C5FD' : isCompleted ? '#86EFAC' : '#94A3B8'}
                fontSize={16}
                fontWeight={isActive ? 'bold' : 'normal'}
                textAnchor={isHorizontal ? 'middle' : 'start'}
                fontFamily="sans-serif"
                opacity={labelOpacity}
              >
                {step.label}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Icon overlays rendered as React nodes */}
      {steps.map((step, i) => {
        if (!step.icon) return null
        const pos = getStepPosition(i)
        const isActive = i === activeStep
        const iconOpacity = interpolate(
          frame,
          [40 + i * 15, 55 + i * 15],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        )

        // Position icon below the label for horizontal, to the right for vertical
        const iconX = isHorizontal ? pos.x : pos.x + 200
        const iconY = isHorizontal ? pos.y + 60 : pos.y

        return (
          <div
            key={`icon-${i}`}
            style={{
              position: 'absolute',
              left: (iconX / 1280) * 100 + '%',
              top: (iconY / 720) * 100 + '%',
              transform: 'translate(-50%, -50%)',
              opacity: isActive ? iconOpacity : iconOpacity * 0.5,
            }}
          >
            {step.icon}
          </div>
        )
      })}
    </AbsoluteFill>
  )
}
