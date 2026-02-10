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

describe('RocketThrust', () => {
  it('should be importable', async () => {
    const { RocketThrust } = await import('../RocketThrust')
    expect(RocketThrust).toBeDefined()
  })

  it('renders without crashing', async () => {
    const { RocketThrust } = await import('../RocketThrust')

    const { container } = render(<RocketThrust />)

    expect(container).toBeInTheDocument()
  })

  it('applies custom className', async () => {
    const { RocketThrust } = await import('../RocketThrust')

    const { container } = render(<RocketThrust className="custom-class" />)

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('renders interactive demo container', async () => {
    const { RocketThrust } = await import('../RocketThrust')

    const { container } = render(<RocketThrust />)

    // RocketThrust has a main container div
    expect(container.firstChild).toBeInTheDocument()
  })
})
