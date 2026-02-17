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

// Mock lucide-react icons
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>()
  return {
    ...actual,
    Rocket: () => <span data-testid="rocket-icon" />,
    Heart: () => <span data-testid="heart-icon" />,
    Sparkles: () => <span data-testid="sparkles-icon" />,
  }
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

  it('renders the Meet the Team heading', () => {
    render(<AboutContent founders={TEST_FOUNDERS} isAdmin={false} />)
    expect(screen.getByText(/Meet the/)).toBeInTheDocument()
    expect(screen.getByText('Team')).toBeInTheDocument()
  })

  it('renders description text', () => {
    render(<AboutContent founders={TEST_FOUNDERS} isAdmin={false} />)
    expect(
      screen.getByText(
        /A passionate team on a mission to strengthen local communities through business discovery\./
      )
    ).toBeInTheDocument()
  })
})
