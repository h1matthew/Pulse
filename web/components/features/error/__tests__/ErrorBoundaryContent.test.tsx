/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundaryContent } from '../ErrorBoundaryContent'

vi.mock('@/components/ui/nav-link', () => ({
  NavLink: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

describe('ErrorBoundaryContent', () => {
  const mockError = new Error('Test error message')
  const mockReset = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Suppress console.error from the component
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders default error title and description', () => {
    render(<ErrorBoundaryContent error={mockError} reset={mockReset} />)

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument()
  })

  it('renders custom title and description', () => {
    render(
      <ErrorBoundaryContent
        error={mockError}
        reset={mockReset}
        title="Custom Error"
        description="A custom error message."
      />
    )

    expect(screen.getByText('Custom Error')).toBeInTheDocument()
    expect(screen.getByText('A custom error message.')).toBeInTheDocument()
  })

  it('renders Try Again button', () => {
    render(<ErrorBoundaryContent error={mockError} reset={mockReset} />)

    const button = screen.getByText('Try Again')
    expect(button).toBeInTheDocument()
  })

  it('calls reset when Try Again is clicked', () => {
    render(<ErrorBoundaryContent error={mockError} reset={mockReset} />)

    fireEvent.click(screen.getByText('Try Again'))
    expect(mockReset).toHaveBeenCalledTimes(1)
  })

  it('renders Go Home link', () => {
    render(<ErrorBoundaryContent error={mockError} reset={mockReset} />)

    expect(screen.getByText('Go Home')).toBeInTheDocument()
  })

  it('has a link to home page', () => {
    render(<ErrorBoundaryContent error={mockError} reset={mockReset} />)

    const homeLink = screen.getByText('Go Home').closest('a')
    expect(homeLink).toHaveAttribute('href', '/')
  })

  it('logs the error to console', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<ErrorBoundaryContent error={mockError} reset={mockReset} />)

    expect(consoleSpy).toHaveBeenCalledWith('Page error:', mockError)
  })

  it('renders the alert icon', () => {
    render(<ErrorBoundaryContent error={mockError} reset={mockReset} />)

    // The icon container has aria-hidden="true"
    const iconContainer = document.querySelector('[aria-hidden="true"]')
    expect(iconContainer).toBeInTheDocument()
  })
})
