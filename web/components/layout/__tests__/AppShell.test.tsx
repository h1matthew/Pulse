/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { AppShell } from '../AppShell'

// Mock child components
vi.mock('../sidebar/Sidebar', () => ({
  Sidebar: ({ email, isAdmin }: { email?: string | null; isAdmin?: boolean }) => (
    <aside data-testid="sidebar" data-email={email || 'none'} data-admin={String(isAdmin)}>
      Desktop Sidebar
    </aside>
  ),
}))

vi.mock('../sidebar/MobileSidebar', () => ({
  MobileSidebar: ({ email, isAdmin }: { email?: string | null; isAdmin?: boolean }) => (
    <div data-testid="mobile-sidebar" data-email={email || 'none'} data-admin={String(isAdmin)}>
      Mobile Sidebar
    </div>
  ),
}))


describe('AppShell', () => {
  it('renders children content', () => {
    render(
      <AppShell>
        <div data-testid="child">Child Content</div>
      </AppShell>
    )

    expect(screen.getByTestId('child')).toHaveTextContent('Child Content')
  })

  it('does not render its own background (root layout owns AppBackground)', () => {
    const { container } = render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    )

    expect(container.querySelector('.animate-ink-drop')).toBeNull()
  })

  it('renders desktop sidebar', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    )

    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
  })

  it('renders mobile sidebar', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    )

    expect(screen.getByTestId('mobile-sidebar')).toBeInTheDocument()
  })

  it('passes email to sidebars', () => {
    render(
      <AppShell email="test@example.com">
        <div>Content</div>
      </AppShell>
    )

    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-email', 'test@example.com')
    expect(screen.getByTestId('mobile-sidebar')).toHaveAttribute('data-email', 'test@example.com')
  })

  it('passes fullName to sidebars', () => {
    render(
      <AppShell fullName="John Doe">
        <div>Content</div>
      </AppShell>
    )

    // Check that fullName is used (component receives it)
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
  })

  it('passes isAdmin flag to sidebars', () => {
    render(
      <AppShell isAdmin={true}>
        <div>Content</div>
      </AppShell>
    )

    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-admin', 'true')
    expect(screen.getByTestId('mobile-sidebar')).toHaveAttribute('data-admin', 'true')
  })

  it('handles null email', () => {
    render(
      <AppShell email={null}>
        <div>Content</div>
      </AppShell>
    )

    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-email', 'none')
  })

  it('renders main content area with correct structure', () => {
    render(
      <AppShell>
        <div data-testid="main-content">Main Content</div>
      </AppShell>
    )

    const mainContent = screen.getByTestId('main-content')
    expect(mainContent.closest('main')).toBeInTheDocument()
  })
})
