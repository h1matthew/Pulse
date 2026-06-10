import { describe, it, expect, beforeAll, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AboutContent } from '@/components/features/about/AboutContent'
import type { Founder } from '@/components/features/about/FounderCard'

// Mock window.matchMedia
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })

  // Mock IntersectionObserver
  class MockIntersectionObserver {
    observe = vi.fn()
    disconnect = vi.fn()
    unobserve = vi.fn()
  }
  global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver
})

const TEST_FOUNDERS: Founder[] = [
  {
    id: 'felix',
    name: 'Felix Oscar Gao',
    role: 'Co-founder',
    bio: '',
    image_url: null,
    image_offset_x: 50,
    image_offset_y: 50,
    image_zoom: 1,
    display_order: 0,
  },
  {
    id: 'matthew',
    name: 'Matthew Heng',
    role: 'Co-founder',
    bio: '',
    image_url: null,
    image_offset_x: 50,
    image_offset_y: 50,
    image_zoom: 1,
    display_order: 1,
  },
]

describe('AboutPage', () => {
  it('renders both founder names', () => {
    render(<AboutContent founders={TEST_FOUNDERS} isAdmin={false} />)
    expect(screen.getByText('Felix Oscar Gao')).toBeInTheDocument()
    expect(screen.getByText('Matthew Heng')).toBeInTheDocument()
  })

  it('renders Co-founder role for each founder', () => {
    render(<AboutContent founders={TEST_FOUNDERS} isAdmin={false} />)
    const roles = screen.getAllByText('Co-founder')
    expect(roles).toHaveLength(2)
  })

  it('renders the Why We Started section', () => {
    render(<AboutContent founders={TEST_FOUNDERS} isAdmin={false} />)
    expect(screen.getByText(/Why We Started/)).toBeInTheDocument()
    expect(screen.getByText(/Our Story/)).toBeInTheDocument()
  })

  it('renders the Meet the Team h1 heading', () => {
    render(<AboutContent founders={TEST_FOUNDERS} isAdmin={false} />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Meet the Team' })
    ).toBeInTheDocument()
  })

  it('renders description text', () => {
    render(<AboutContent founders={TEST_FOUNDERS} isAdmin={false} />)
    expect(
      screen.getByText(
        /A passionate team on a mission to strengthen local communities through business\s+discovery\./
      )
    ).toBeInTheDocument()
  })

  it('renders the mono eyebrow labels for each section', () => {
    render(<AboutContent founders={TEST_FOUNDERS} isAdmin={false} />)
    expect(screen.getByText('About Pulse')).toHaveClass('font-mono')
    expect(screen.getByText('The Founders')).toHaveClass('font-mono')
    expect(screen.getByText('Our Story')).toHaveClass('font-mono')
  })

  it('renders the founder count as a mono stat', () => {
    render(<AboutContent founders={TEST_FOUNDERS} isAdmin={false} />)
    const count = screen.getByLabelText('2 founders')
    expect(count).toHaveTextContent('02')
    expect(count).toHaveClass('font-mono')
  })

  it('contains no emoji characters', () => {
    const { container } = render(<AboutContent founders={TEST_FOUNDERS} isAdmin={false} />)
    const emojiPattern = /[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|\u{FE0F}/u
    expect(emojiPattern.test(container.textContent ?? '')).toBe(false)
  })

  it('contains no gradient text or blur/glow decoration classes', () => {
    const { container } = render(<AboutContent founders={TEST_FOUNDERS} isAdmin={false} />)
    const html = container.innerHTML
    expect(html).not.toContain('bg-clip-text')
    expect(html).not.toContain('text-transparent')
    expect(html).not.toContain('backdrop-blur')
    expect(html).not.toContain('blur-3xl')
    expect(html).not.toContain('animate-glow')
  })
})
