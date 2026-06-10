import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { PulseLogo } from '../PulseLogo'

describe('PulseLogo', () => {
  it('renders the logo image', () => {
    const { container } = render(<PulseLogo />)

    const img = container.querySelector('img')
    expect(img).toBeInTheDocument()
    expect(img?.getAttribute('src')).toContain('pulse-logo')
  })

  it('is hidden from assistive technology', () => {
    const { container } = render(<PulseLogo />)

    const img = container.querySelector('img')
    expect(img).toHaveAttribute('aria-hidden', 'true')
    expect(img).toHaveAttribute('alt', '')
  })

  it('applies the provided className', () => {
    const { container } = render(<PulseLogo className="h-8 w-8" />)

    const img = container.querySelector('img')
    expect(img).toHaveClass('h-8', 'w-8')
  })
})
