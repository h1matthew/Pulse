/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { AppBackground } from '../AppBackground'

describe('AppBackground', () => {
  it('renders a flat background layer behind the page', () => {
    const { container } = render(<AppBackground />)

    const root = container.firstChild as HTMLElement
    expect(root).toHaveClass('-z-10', 'fixed', 'bg-background')
    expect(container.querySelectorAll('*').length).toBe(1)
  })

  it('is hidden from assistive technology', () => {
    const { container } = render(<AppBackground />)

    expect(container.firstChild).toHaveAttribute('aria-hidden')
  })
})
