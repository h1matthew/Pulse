/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock components

vi.mock('@/components/layout/Header', () => ({
  Header: () => <header data-testid="header">Header</header>,
}))

vi.mock('@/components/features/home/AnimatedSection', () => ({
  AnimatedSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/nav-link', () => ({
  NavLink: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() })),
  usePathname: vi.fn(() => '/mission'),
}))

describe('Mission Page', () => {
  it('should be importable', async () => {
    const module = await import('../page')
    expect(module.default).toBeDefined()
  })

  it('renders without crashing', async () => {
    const MissionPage = (await import('../page')).default
    const { container } = render(<MissionPage />)

    expect(container).toBeInTheDocument()
  })

  it('leads with the method rather than a mission statement', async () => {
    const MissionPage = (await import('../page')).default
    render(<MissionPage />)

    expect(screen.getByRole('heading', { level: 1, name: 'How we pick' })).toBeInTheDocument()
    expect(screen.getByText('Listings are not for sale.')).toBeInTheDocument()
  })

  it('discloses that the local-spend multiplier has no source', async () => {
    const MissionPage = (await import('../page')).default
    render(<MissionPage />)

    expect(screen.getByText(/dollars kept local = total spend/)).toBeInTheDocument()
    expect(screen.getByText(/It sits in our code with no source attached/)).toBeInTheDocument()
  })
})
