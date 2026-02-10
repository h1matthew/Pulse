/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
  usePathname: vi.fn(() => '/simulate'),
}))

// Mock NavLink
vi.mock('@/components/ui/nav-link', () => ({
  NavLink: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

describe('Simulate Page', () => {
  it('should be importable', async () => {
    const module = await import('../page')
    expect(module.default).toBeDefined()
  })

  it('renders without crashing', async () => {
    const SimulatePage = (await import('../page')).default
    const { container } = render(<SimulatePage />)

    expect(container).toBeInTheDocument()
  })
})
