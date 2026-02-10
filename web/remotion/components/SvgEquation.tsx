import { useMemo } from 'react'
import katex from 'katex'

interface SvgEquationProps {
  latex: string
  x: number
  y: number
  width?: number
  height?: number
  fontSize?: number
  color?: string
  opacity?: number
}

export function SvgEquation({
  latex,
  x,
  y,
  width = 500,
  height = 50,
  fontSize = 16,
  color = '#94A3B8',
  opacity = 1,
}: SvgEquationProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        displayMode: true,
        throwOnError: false,
        strict: false,
      })
    } catch {
      return null
    }
  }, [latex])

  if (!html) {
    return (
      <text x={x} y={y} fill={color} fontSize={fontSize} textAnchor="middle" opacity={opacity}>
        {latex}
      </text>
    )
  }

  return (
    <foreignObject
      x={x - width / 2}
      y={y - height / 2}
      width={width}
      height={height}
      opacity={opacity}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
          fontSize,
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </foreignObject>
  )
}
