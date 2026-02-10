import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NavLink } from '../nav-link'

const mockNavigate = vi.fn()
let mockIsNavigating = false

vi.mock('@/hooks/useNavigation', () => ({
  useNavigation: () => ({
    isNavigating: mockIsNavigating,
    navigate: mockNavigate,
  }),
}))

describe('NavLink', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    mockIsNavigating = false
  })

  it('renders children and an anchor element', () => {
    render(<NavLink href="/test">Click me</NavLink>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls navigate on click and prevents default', () => {
    render(<NavLink href="/foo">Go</NavLink>)
    const link = screen.getByText('Go').closest('a')!
    fireEvent.click(link)
    expect(mockNavigate).toHaveBeenCalledWith('/foo')
  })

  it('applies disabled styles when navigating', () => {
    mockIsNavigating = true
    render(<NavLink href="/bar">Link</NavLink>)
    const link = screen.getByText('Link').closest('a')!
    expect(link.className).toContain('pointer-events-none')
    expect(link.className).toContain('opacity-60')
    expect(link.getAttribute('aria-disabled')).toBe('true')
  })

  it('calls onClick prop alongside navigate', () => {
    const onClick = vi.fn()
    render(<NavLink href="/baz" onClick={onClick}>Go</NavLink>)
    fireEvent.click(screen.getByText('Go').closest('a')!)
    expect(onClick).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('/baz')
  })
})
