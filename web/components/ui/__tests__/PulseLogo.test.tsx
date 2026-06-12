import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { PulseLogo } from '../PulseLogo'

describe('PulseLogo', () => {
  it('renders an SVG element', () => {
    const { container } = render(<PulseLogo />)

    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('is hidden from assistive technology', () => {
    const { container } = render(<PulseLogo />)

    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  it('applies the provided className', () => {
    const { container } = render(<PulseLogo className="h-8 w-8" />)

    const svg = container.querySelector('svg')
    expect(svg).toHaveClass('h-8', 'w-8')
  })
})
