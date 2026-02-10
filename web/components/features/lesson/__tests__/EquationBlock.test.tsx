/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import React from 'react'
import { EquationBlock } from '../EquationBlock'

// Mock katex - the component uses throwOnError: false, so it won't throw
// The component's useMemo catches errors and returns null for html
vi.mock('katex', () => ({
  default: {
    renderToString: vi.fn((latex: string, options?: { throwOnError?: boolean }) => {
      // If throwOnError is false (which the component uses), don't throw
      if (latex === 'invalid\\command' && options?.throwOnError !== false) {
        throw new Error('KaTeX parse error')
      }
      // For invalid latex with throwOnError: false, return null-like result
      // But actually katex will return an error span, simulate that
      if (latex === 'invalid\\command') {
        // The component catches errors internally, so simulate a scenario
        // where we return something but the parsing fails
        throw new Error('KaTeX parse error') // Actually throw to trigger the catch
      }
      return `<span class="katex">${latex}</span>`
    }),
  },
}))

// Mock clipboard API
const mockWriteText = vi.fn()

describe('EquationBlock', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    })
  })

  it('renders equation from LaTeX', () => {
    render(<EquationBlock latex="E = mc^2" />)

    // Check that the equation is rendered (via dangerouslySetInnerHTML)
    const container = document.querySelector('[class*="katex"]')
    expect(container?.textContent).toContain('E = mc^2')
  })

  it('displays label when provided', () => {
    render(<EquationBlock latex="F = ma" label="Newton's Second Law" />)

    expect(screen.getByText("Newton's Second Law")).toBeInTheDocument()
  })

  it('has copy button', () => {
    render(<EquationBlock latex="a^2 + b^2 = c^2" />)

    const copyButton = screen.getByRole('button', { name: /copy latex/i })
    expect(copyButton).toBeInTheDocument()
  })

  it('copies LaTeX to clipboard when copy button clicked', async () => {
    mockWriteText.mockResolvedValue(undefined)
    render(<EquationBlock latex="a^2 + b^2 = c^2" />)

    const copyButton = screen.getByRole('button', { name: /copy latex/i })

    await act(async () => {
      fireEvent.click(copyButton)
    })

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith('a^2 + b^2 = c^2')
    })
  })

  it('handles clipboard API not available gracefully', async () => {
    mockWriteText.mockRejectedValue(new Error('Clipboard not available'))

    render(<EquationBlock latex="y = mx + b" />)

    const copyButton = screen.getByRole('button', { name: /copy latex/i })

    // Should not throw - the component silently catches the error
    await act(async () => {
      fireEvent.click(copyButton)
    })

    expect(mockWriteText).toHaveBeenCalled()
    // Component should not crash
    expect(screen.getByRole('button', { name: /copy latex/i })).toBeInTheDocument()
  })

  it('renders with correct styling classes', () => {
    const { container } = render(<EquationBlock latex="F = ma" />)

    // Check for gradient background class
    expect(container.querySelector('[class*="bg-gradient"]')).toBeInTheDocument()

    // Check for rounded corners
    expect(container.querySelector('[class*="rounded-xl"]')).toBeInTheDocument()
  })

  it('renders without label when not provided', () => {
    const { container } = render(<EquationBlock latex="v = at" />)

    // Should not have any label element (checking that specific label div is not present)
    const labelElement = container.querySelector('.absolute.left-4')
    expect(labelElement).toBeNull()
  })

  it('renders copy button with correct accessibility attributes', () => {
    render(<EquationBlock latex="x^2 + y^2 = r^2" />)

    const copyButton = screen.getByRole('button', { name: /copy latex/i })
    expect(copyButton).toHaveAttribute('title', 'Copy LaTeX')
  })
})
