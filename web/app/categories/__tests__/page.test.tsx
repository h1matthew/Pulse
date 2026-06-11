/**
 * @vitest-environment jsdom
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ from: mockFrom }),
}))

vi.mock('@/components/layout/Header', () => ({
  Header: () => <header data-testid="header">Header</header>,
}))

vi.mock('@/components/features/home/AnimatedSection', () => ({
  AnimatedSection: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/ui/nav-link', () => ({
  NavLink: ({
    children,
    href,
    className,
    ...props
  }: {
    children: React.ReactNode
    href: string
    className?: string
  }) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}))

// Chainable thenable query builder: every method returns the builder and
// awaiting the builder resolves to the configured result.
interface QueryResult {
  data: unknown
  error: unknown
}

function createBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'gt', 'order', 'limit', 'in']) {
    builder[method] = vi.fn(() => builder)
  }
  builder.then = (
    resolve: (value: QueryResult) => unknown,
    reject?: (reason: unknown) => unknown
  ) => Promise.resolve(result).then(resolve, reject)
  return builder
}

function setupSupabase(categoriesResult: QueryResult, businessesResult: QueryResult) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'categories') return createBuilder(categoriesResult)
    return createBuilder(businessesResult)
  })
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SLUGS = [
  'food-drink',
  'retail',
  'services',
  'health-wellness',
  'arts-culture',
  'entertainment',
] as const

const MOCK_CATEGORIES = [
  { id: 'cat-food', slug: 'food-drink', name: 'Food & Drink', description: 'Restaurants, cafes, bars, and food trucks', sort_order: 1 },
  { id: 'cat-retail', slug: 'retail', name: 'Retail', description: 'Clothing, gifts, books, and specialty shops', sort_order: 2 },
  { id: 'cat-services', slug: 'services', name: 'Services', description: null, sort_order: 3 },
  { id: 'cat-health', slug: 'health-wellness', name: 'Health & Wellness', description: 'Gyms, spas, salons, and healthcare', sort_order: 4 },
  { id: 'cat-arts', slug: 'arts-culture', name: 'Arts & Culture', description: 'Galleries, theaters, museums, and studios', sort_order: 5 },
  { id: 'cat-fun', slug: 'entertainment', name: 'Entertainment', description: 'Arcades, bowling, cinemas, and venues', sort_order: 6 },
]

const MOCK_BUSINESSES = [
  // food-drink: 4 businesses — independents must beat the higher-rated chain
  { category_id: 'cat-food', name: 'Indie Cafe', average_rating: 4.8, review_count: 120, is_chain: false },
  { category_id: 'cat-food', name: 'Indie Diner', average_rating: 4.6, review_count: 80, is_chain: false },
  { category_id: 'cat-food', name: 'Indie Bakery', average_rating: 4.6, review_count: 40, is_chain: null },
  { category_id: 'cat-food', name: 'MegaChain Burger', average_rating: 4.9, review_count: 500, is_chain: true },
  // retail: 2 businesses
  { category_id: 'cat-retail', name: 'Vinyl Vault', average_rating: 4.7, review_count: 60, is_chain: false },
  { category_id: 'cat-retail', name: 'Chain Mart', average_rating: 4.2, review_count: 300, is_chain: true },
  // services: 1 business
  { category_id: 'cat-services', name: 'Fix It Bros', average_rating: 4.4, review_count: 25, is_chain: false },
]

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}]/u

async function renderPage() {
  const Page = (await import('../page')).default
  const ui = await Page()
  return render(ui)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Categories Page', () => {
  beforeEach(() => {
    mockFrom.mockReset()
    setupSupabase(
      { data: MOCK_CATEGORIES, error: null },
      { data: MOCK_BUSINESSES, error: null }
    )
  })

  it('renders the header and page heading', async () => {
    await renderPage()
    expect(screen.getByTestId('header')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Browse by Category' })
    ).toBeInTheDocument()
  })

  it('renders the mono eyebrow label', async () => {
    await renderPage()
    expect(screen.getByText('Browse the directory')).toBeInTheDocument()
  })

  it('renders real business counts computed from the data', async () => {
    await renderPage()
    expect(screen.getByText('4 businesses')).toBeInTheDocument() // food-drink
    expect(screen.getByText('2 businesses')).toBeInTheDocument() // retail
    expect(screen.getByText('1 business')).toBeInTheDocument() // services (singular)
    expect(screen.getAllByText('0 businesses')).toHaveLength(3) // the empty three
  })

  it('renders the computed total across categories', async () => {
    await renderPage()
    expect(
      screen.getByText('7 businesses across 6 categories')
    ).toBeInTheDocument()
  })

  it('renders real featured business names as top-rated chips', async () => {
    await renderPage()
    expect(screen.getByText('Indie Cafe')).toBeInTheDocument()
    expect(screen.getByText('Indie Diner')).toBeInTheDocument()
    expect(screen.getByText('Indie Bakery')).toBeInTheDocument()
    expect(screen.getByText('Vinyl Vault')).toBeInTheDocument()
    expect(screen.getByText('Fix It Bros')).toBeInTheDocument()
  })

  it('prefers independent businesses over chains for featured slots', async () => {
    await renderPage()
    // food-drink has 4 businesses; the chain (highest rated) loses its slot
    // to the three independents.
    expect(screen.queryByText('MegaChain Burger')).not.toBeInTheDocument()
    // retail only has 2, so the chain still appears there.
    expect(screen.getByText('Chain Mart')).toBeInTheDocument()
  })

  it('does not show a Top rated row for empty categories', async () => {
    await renderPage()
    // Only the 3 categories with businesses get a featured row.
    expect(screen.getAllByText('Top rated:')).toHaveLength(3)
  })

  it('does not render any of the old hardcoded fake data', async () => {
    const { container } = await renderPage()
    expect(screen.queryByText('The Local Bean')).not.toBeInTheDocument()
    expect(screen.queryByText('Corner Bistro')).not.toBeInTheDocument()
    expect(container.textContent).not.toContain('234 businesses')
  })

  it('links every category card to /discover?category=<slug>', async () => {
    const { container } = await renderPage()
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) =>
      a.getAttribute('href')
    )
    for (const slug of SLUGS) {
      expect(hrefs).toContain(`/discover?category=${slug}`)
    }
  })

  it('gives every card a hover heartbeat trace instead of a generic lift', async () => {
    const { container } = await renderPage()
    const cards = container.querySelectorAll('a[href^="/discover?category="]')
    for (const card of cards) {
      // The decorative EKG trace that draws along the divider on hover
      const trace = card.querySelector('svg[aria-hidden="true"] path[pathLength]')
      expect(trace).not.toBeNull()
      expect(trace?.getAttribute('class') ?? '').toContain('stroke-dashoffset')
      // The old generic hover (lift + heavy shadow) is gone
      expect(card.className).not.toContain('card-lift')
      expect(card.className).not.toContain('hover:-translate-y')
    }
  })

  it('renders no emoji anywhere (lucide icons only)', async () => {
    const { container } = await renderPage()
    expect(container.textContent ?? '').not.toMatch(EMOJI_REGEX)
  })

  it('falls back to a neutral description when the DB description is null', async () => {
    await renderPage()
    // services row has description: null in the fixtures
    expect(
      screen.getByText('Local businesses in this category.')
    ).toBeInTheDocument()
  })

  it('renders descriptions from the database', async () => {
    await renderPage()
    expect(
      screen.getByText('Restaurants, cafes, bars, and food trucks')
    ).toBeInTheDocument()
  })

  describe('defensive fetching', () => {
    it('renders zero-count cards when the businesses fetch errors', async () => {
      setupSupabase(
        { data: MOCK_CATEGORIES, error: null },
        { data: null, error: { message: 'boom' } }
      )
      await renderPage()
      expect(
        screen.getByRole('heading', { level: 1, name: 'Browse by Category' })
      ).toBeInTheDocument()
      expect(screen.getAllByText('0 businesses')).toHaveLength(6)
      expect(
        screen.getByText('0 businesses across 6 categories')
      ).toBeInTheDocument()
    })

    it('still renders a category directory when the categories fetch errors', async () => {
      setupSupabase(
        { data: null, error: { message: 'boom' } },
        { data: null, error: { message: 'boom' } }
      )
      const { container } = await renderPage()
      // Fallback directory with zero counts — never a crash or empty page.
      expect(screen.getByText('Food & Drink')).toBeInTheDocument()
      expect(screen.getAllByText('0 businesses')).toHaveLength(6)
      const hrefs = Array.from(container.querySelectorAll('a')).map((a) =>
        a.getAttribute('href')
      )
      for (const slug of SLUGS) {
        expect(hrefs).toContain(`/discover?category=${slug}`)
      }
    })
  })
})
