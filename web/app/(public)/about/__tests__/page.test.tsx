import { describe, it, expect, beforeAll, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AboutContent } from '@/components/features/about/AboutContent'
import type { Founder } from '@/components/features/about/FounderCard'

import type { ReactNode } from 'react'

vi.mock('@/components/ui/nav-link', () => ({
  NavLink: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

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
    id: 'matthew',
    name: 'Matthew Heng',
    role: 'Co-founder',
    bio: '',
    image_url: null,
    image_offset_x: 50,
    image_offset_y: 50,
    image_zoom: 1,
    display_order: 0,
  },
  {
    id: 'felix',
    name: 'Felix Yin',
    role: 'Co-founder',
    bio: '',
    image_url: null,
    image_offset_x: 50,
    image_offset_y: 50,
    image_zoom: 1,
    display_order: 1,
  },
  {
    id: 'brady',
    name: 'Brady Chen',
    role: 'Co-founder',
    bio: '',
    image_url: null,
    image_offset_x: 50,
    image_offset_y: 50,
    image_zoom: 1,
    display_order: 2,
  },
  {
    id: 'oscar',
    name: 'Oscar Gao',
    role: 'Co-founder',
    bio: '',
    image_url: null,
    image_offset_x: 50,
    image_offset_y: 50,
    image_zoom: 1,
    display_order: 3,
  },
]

describe('AboutPage', () => {
  it('renders all founder names', () => {
    render(<AboutContent founders={TEST_FOUNDERS} isAdmin={false} />)
    expect(screen.getByText('Matthew Heng')).toBeInTheDocument()
    expect(screen.getByText('Felix Yin')).toBeInTheDocument()
    expect(screen.getByText('Brady Chen')).toBeInTheDocument()
    expect(screen.getByText('Oscar Gao')).toBeInTheDocument()
  })

  it('renders founders in display order', () => {
    render(<AboutContent founders={TEST_FOUNDERS} isAdmin={false} />)
    const names = screen
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent)
      .filter((name) => TEST_FOUNDERS.some((f) => f.name === name))
    expect(names).toEqual(['Matthew Heng', 'Felix Yin', 'Brady Chen', 'Oscar Gao'])
  })

  it('renders Co-founder role for each founder', () => {
    render(<AboutContent founders={TEST_FOUNDERS} isAdmin={false} />)
    const roles = screen.getAllByText('Co-founder')
    expect(roles).toHaveLength(4)
  })

  it('renders the Why we started section', () => {
    render(<AboutContent founders={TEST_FOUNDERS} isAdmin={false} />)
    expect(
      screen.getByRole('heading', { level: 2, name: 'Why we started' })
    ).toBeInTheDocument()
  })

  it('leads with what Pulse is', () => {
    render(<AboutContent founders={TEST_FOUNDERS} isAdmin={false} />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'What Pulse is' })
    ).toBeInTheDocument()
    expect(screen.getByText(/A directory of the shops, restaurants, and services/)).toBeInTheDocument()
  })

  it('links to the method page', () => {
    render(<AboutContent founders={TEST_FOUNDERS} isAdmin={false} />)
    expect(screen.getByRole('link', { name: 'How we pick' })).toHaveAttribute(
      'href',
      '/mission'
    )
  })

  it('renders live counters only when the counts are present', () => {
    const { rerender } = render(<AboutContent founders={TEST_FOUNDERS} isAdmin={false} />)
    expect(screen.queryByText('businesses listed')).not.toBeInTheDocument()

    rerender(
      <AboutContent
        founders={TEST_FOUNDERS}
        isAdmin={false}
        businessCount={1284}
        reviewCount={0}
      />
    )
    expect(screen.getByText('1,284')).toBeInTheDocument()
    expect(screen.getByText('businesses listed')).toBeInTheDocument()
    expect(screen.queryByText('reviews on file')).not.toBeInTheDocument()
  })

  it('renders the founder count as a mono stat', () => {
    render(<AboutContent founders={TEST_FOUNDERS} isAdmin={false} />)
    const count = screen.getByLabelText('4 founders')
    expect(count).toHaveTextContent('04')
    expect(count).toHaveClass('meta')
  })

  it('has no uppercase eyebrow labels', () => {
    const { container } = render(<AboutContent founders={TEST_FOUNDERS} isAdmin={false} />)
    expect(container.innerHTML).not.toContain('uppercase')
    expect(container.innerHTML).not.toContain('tracking-[0.18em]')
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
