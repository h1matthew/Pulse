/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { VideoBlock } from '../VideoBlock'

// Mock Remotion Player
vi.mock('@remotion/player', () => ({
  Player: vi.fn(({ compositionWidth, compositionHeight }: { compositionWidth: number; compositionHeight: number }) => (
    <div data-testid="remotion-player" data-width={compositionWidth} data-height={compositionHeight}>
      Remotion Player
    </div>
  )),
}))

// Mock next/dynamic to eagerly resolve dynamic imports in tests
vi.mock('next/dynamic', () => {
  const React = require('react')
  return {
    __esModule: true,
    default: (importFn: () => Promise<any>, opts?: any) => {
      function DynamicWrapper(props: any) {
        const [Component, setComponent] = React.useState<any>(null)
        React.useEffect(() => {
          importFn().then((mod: any) => {
            setComponent(() => mod.default || mod)
          })
        }, [])
        if (Component) return React.createElement(Component, props)
        if (opts?.loading) return React.createElement(opts.loading)
        return null
      }
      return DynamicWrapper
    },
  }
})

// Mock registry
vi.mock('@/remotion/registry', () => ({
  getComposition: vi.fn((id: string) => {
    if (id === 'thrust-animation') {
      return {
        component: () => <div>Thrust Animation</div>,
        durationInFrames: 300,
        fps: 30,
        width: 1280,
        height: 720,
      }
    }
    return undefined
  }),
}))

// Mock DynamicVideoPlayer
vi.mock('@/components/features/video/DynamicVideoPlayer', () => ({
  DynamicVideoPlayer: ({ code }: { code: string }) => (
    <div data-testid="dynamic-player" data-code={code}>
      Dynamic Video Player
    </div>
  ),
}))

// Mock fetch
const mockFetch = vi.fn()

describe('VideoBlock', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = mockFetch
  })

  it('renders Remotion player for registered composition', async () => {
    render(<VideoBlock compositionId="thrust-animation" />)

    await waitFor(() => {
      expect(screen.getByTestId('remotion-player')).toBeInTheDocument()
    })
  })

  it('passes correct dimensions to Remotion player', async () => {
    render(<VideoBlock compositionId="thrust-animation" />)

    await waitFor(() => {
      const player = screen.getByTestId('remotion-player')
      expect(player).toHaveAttribute('data-width', '1280')
      expect(player).toHaveAttribute('data-height', '720')
    })
  })

  it('shows fallback for unknown composition', () => {
    render(<VideoBlock compositionId="unknown-animation" />)

    expect(screen.getByText('Unknown Animation')).toBeInTheDocument()
    expect(screen.getByText('Animation coming soon')).toBeInTheDocument()
  })

  it('formats composition ID as title for fallback', () => {
    render(<VideoBlock compositionId="my-custom-animation" />)

    expect(screen.getByText('My Custom Animation')).toBeInTheDocument()
  })

  it('shows loading state for UUID composition', async () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000'
    mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<VideoBlock compositionId={uuid} />)

    expect(screen.getByText('Loading animation...')).toBeInTheDocument()
  })

  it('fetches video data for UUID composition', async () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000'
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        id: uuid,
        code: 'const Component = () => <div>Test</div>',
        width: 1920,
        height: 1080,
        fps: 60,
        duration_frames: 300,
        name: 'Test Video',
      }),
    })

    render(<VideoBlock compositionId={uuid} />)

    await waitFor(() => {
      expect(screen.getByTestId('dynamic-player')).toBeInTheDocument()
    })

    expect(mockFetch).toHaveBeenCalledWith(`/api/videos/${uuid}`)
  })

  it('shows error for failed video fetch', async () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000'
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    })

    render(<VideoBlock compositionId={uuid} />)

    await waitFor(() => {
      expect(screen.getByText('Video unavailable')).toBeInTheDocument()
    })
  })

  it('shows not found error for 404 response', async () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000'
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    })

    render(<VideoBlock compositionId={uuid} />)

    await waitFor(() => {
      expect(screen.getByText('Video unavailable')).toBeInTheDocument()
      expect(screen.getByText('Video not found')).toBeInTheDocument()
    })
  })

  it('handles network error for UUID fetch', async () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000'
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockFetch.mockRejectedValue(new Error('Network error'))

    render(<VideoBlock compositionId={uuid} />)

    await waitFor(() => {
      expect(screen.getByText('Video unavailable')).toBeInTheDocument()
      expect(screen.getByText('Failed to load video')).toBeInTheDocument()
    })

    consoleSpy.mockRestore()
  })

  it('does not fetch for non-UUID composition IDs', () => {
    render(<VideoBlock compositionId="thrust-animation" />)

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('correctly identifies UUID pattern', async () => {
    // Valid UUID - should trigger fetch
    const validUuid = '550e8400-e29b-41d4-a716-446655440000'
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        id: validUuid,
        code: 'code',
        width: 1280,
        height: 720,
        fps: 30,
        duration_frames: 100,
        name: 'Test',
      }),
    })

    render(<VideoBlock compositionId={validUuid} />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(`/api/videos/${validUuid}`)
    })
  })
})
