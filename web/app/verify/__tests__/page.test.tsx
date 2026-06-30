/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import VerifyPage from '../page'

// Mock next/navigation so the shared Header can read the pathname.
vi.mock('next/navigation', () => ({
  usePathname: () => '/verify',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))

// Mock the shared Header to avoid pulling in auth/router providers.
vi.mock('@/components/layout/Header', () => ({
  Header: () => <header data-testid="header">Header</header>,
}))

// Mock NavLink to a plain anchor (avoids the navigation hook).
vi.mock('@/components/ui/nav-link', () => ({
  NavLink: ({
    href,
    children,
    className,
  }: {
    href: string
    children: React.ReactNode
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

// Mock the puzzle captcha so the page test stays deterministic.
vi.mock('@/components/features/bot/BaanihaliPuzzleCaptcha', () => ({
  BaanihaliPuzzleCaptcha: ({ onVerify }: { onVerify: (token: string) => void }) => (
    <div data-testid="puzzle-captcha">
      <button type="button" onClick={() => onVerify('test-captcha-token')}>
        Complete CAPTCHA
      </button>
    </div>
  ),
}))

describe('VerifyPage', () => {
  it('renders the security check heading and description', () => {
    render(<VerifyPage />)

    expect(screen.getByRole('heading', { name: 'Security check' })).toBeInTheDocument()
    expect(
      screen.getByText(/Slide the puzzle piece into the highlighted slot/i)
    ).toBeInTheDocument()
  })

  it('shows the puzzle captcha control', () => {
    render(<VerifyPage />)

    expect(screen.getByTestId('puzzle-captcha')).toBeInTheDocument()
  })

  it('shows the verified success state after solving the puzzle', () => {
    render(<VerifyPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Complete CAPTCHA' }))

    expect(
      screen.getByRole('heading', { name: /Verified — you're human/i })
    ).toBeInTheDocument()
    expect(screen.getByText('Back to sign in')).toBeInTheDocument()
  })

  it('can re-verify from the success state', () => {
    render(<VerifyPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Complete CAPTCHA' }))
    expect(screen.queryByTestId('puzzle-captcha')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Verify again' }))

    expect(screen.getByTestId('puzzle-captcha')).toBeInTheDocument()
  })
})
