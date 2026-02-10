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

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  },
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Rocket: () => <span data-testid="rocket-icon" />,
  Heart: () => <span data-testid="heart-icon" />,
  Camera: () => <span data-testid="camera-icon" />,
  Pencil: () => <span data-testid="pencil-icon" />,
  Check: () => <span data-testid="check-icon" />,
  X: () => <span data-testid="x-icon" />,
  Move: () => <span data-testid="move-icon" />,
  Sparkles: () => <span data-testid="sparkles-icon" />,
}))

const TEST_FOUNDERS: Founder[] = [
  {
    id: 'henry',
    name: 'Henry Dai',
    role: 'Cofounder',
    bio: 'Henry Dai is an experienced competitive rocketeer specializing in precision build and remote-controlled events. He has been selected by the National Association of Rocketry to represent the USA National Team and has earned multiple medals at World Space Modeling Championships. With this experience, Henry brings proven leadership and technical expertise to guide teams toward high-level competition such as the American Rocketry Challenge.',
    image_url: null,
    image_offset_x: 50,
    image_offset_y: 50,
    image_zoom: 1,
    display_order: 0,
  },
  {
    id: 'matthew',
    name: 'Matthew Heng',
    role: 'Cofounder',
    bio: 'Matthew Heng is driven by a deep interest in physics and the mechanics of flight. He is a Gold Medalist at the Calico Hackathon (a top-35 finisher out of ~500 participants) and is currently authoring a research paper on AI. Matthew leverages these computer science skills to build the technical foundation of Max Apogee. He combines this expertise with his teaching experience to break down complex concepts, ensuring students turn their curiosity into practical engineering skills.',
    image_url: null,
    image_offset_x: 50,
    image_offset_y: 50,
    image_zoom: 1,
    display_order: 1,
  },
  {
    id: 'brady',
    name: 'Brady Chen',
    role: 'Cofounder',
    bio: 'Brady Chen is an accomplished competitive programmer and student developer focused on high-impact problem solving. He is a 1st Place winner of the Congressional App Challenge, a Silver Division competitor in the USA Computing Olympiad (USACO), and a top-35 finisher out of 500 participants in the Calico Competition. With this competitive background, Brady brings strong technical skill and focus to help teams succeed.',
    image_url: null,
    image_offset_x: 50,
    image_offset_y: 50,
    image_zoom: 1,
    display_order: 2,
  },
]

describe('AboutPage', () => {
  it('renders all three founder names', () => {
    render(<AboutContent founders={TEST_FOUNDERS} isAdmin={false} />)
    expect(screen.getByText('Henry Dai')).toBeInTheDocument()
    expect(screen.getByText('Matthew Heng')).toBeInTheDocument()
    expect(screen.getByText('Brady Chen')).toBeInTheDocument()
  })

  it('renders Cofounder role for each founder', () => {
    render(<AboutContent founders={TEST_FOUNDERS} isAdmin={false} />)
    const roles = screen.getAllByText('Cofounder')
    expect(roles).toHaveLength(3)
  })

  it('renders the Why We Started section', () => {
    render(<AboutContent founders={TEST_FOUNDERS} isAdmin={false} />)
    expect(screen.getByText(/Why We Started/)).toBeInTheDocument()
    expect(screen.getByText(/Our Story/)).toBeInTheDocument()
  })

  it('renders images for all founders', () => {
    render(<AboutContent founders={TEST_FOUNDERS} isAdmin={false} />)
    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(3)
    expect(images[0]).toHaveAttribute('src', '/founders/henry.png')
    expect(images[1]).toHaveAttribute('src', '/founders/matthew.png')
    expect(images[2]).toHaveAttribute('src', '/founders/brady.png')
  })

  it('renders the Meet the Founders heading', () => {
    render(<AboutContent founders={TEST_FOUNDERS} isAdmin={false} />)
    expect(screen.getByText(/Meet the/)).toBeInTheDocument()
    expect(screen.getByText('Founders')).toBeInTheDocument()
  })

  it('renders founder bios', () => {
    render(<AboutContent founders={TEST_FOUNDERS} isAdmin={false} />)
    expect(screen.getByText(/experienced competitive rocketeer/)).toBeInTheDocument()
    expect(screen.getByText(/deep interest in physics/)).toBeInTheDocument()
    expect(screen.getByText(/accomplished competitive programmer/)).toBeInTheDocument()
  })

  it('shows edit controls when user is admin', () => {
    render(<AboutContent founders={TEST_FOUNDERS} isAdmin={true} />)
    // Admin view shows Change Photo overlays and Move buttons
    expect(screen.getAllByText('Change Photo')).toHaveLength(3)
    expect(screen.getAllByText('Move')).toHaveLength(3)
  })

  it('does not show edit controls for non-admin', () => {
    render(<AboutContent founders={TEST_FOUNDERS} isAdmin={false} />)
    expect(screen.queryByText('Change Photo')).not.toBeInTheDocument()
    expect(screen.queryByText('Move')).not.toBeInTheDocument()
  })

  it('uses custom image_url when provided', () => {
    const foundersWithCustomImage = [
      { ...TEST_FOUNDERS[0], image_url: 'https://example.com/henry.jpg' },
      ...TEST_FOUNDERS.slice(1),
    ]
    render(<AboutContent founders={foundersWithCustomImage} isAdmin={false} />)
    const images = screen.getAllByRole('img')
    expect(images[0]).toHaveAttribute('src', 'https://example.com/henry.jpg')
  })
})
