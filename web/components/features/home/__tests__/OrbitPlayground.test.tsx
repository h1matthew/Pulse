/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

// Mock requestAnimationFrame and cancelAnimationFrame before importing component
beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => {
    return setTimeout(() => cb(performance.now()), 16) as unknown as number
  }))
  vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => {
    clearTimeout(id)
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('OrbitPlayground', () => {
  it('should be importable', async () => {
    const { OrbitPlayground } = await import('../OrbitPlayground')
    expect(OrbitPlayground).toBeDefined()
  })

  it('renders without crashing', async () => {
    const { OrbitPlayground } = await import('../OrbitPlayground')

    const { container } = render(<OrbitPlayground />)

    expect(container).toBeInTheDocument()
  })

  it('applies custom className', async () => {
    const { OrbitPlayground } = await import('../OrbitPlayground')

    const { container } = render(<OrbitPlayground className="custom-class" />)

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('renders canvas element for orbital simulation', async () => {
    const { OrbitPlayground } = await import('../OrbitPlayground')

    const { container } = render(<OrbitPlayground />)

    // OrbitPlayground uses canvas for rendering
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeInTheDocument()
  })
})
