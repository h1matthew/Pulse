import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AnimatedSection } from '../AnimatedSection'

describe('AnimatedSection', () => {
  it('renders children', () => {
    render(<AnimatedSection>content</AnimatedSection>)
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('passes className through to the wrapper', () => {
    render(<AnimatedSection className="grid gap-4">content</AnimatedSection>)
    expect(screen.getByText('content')).toHaveClass('grid', 'gap-4')
  })

  // Regression: the old scroll-reveal emitted opacity-0 from the server, so
  // pages shipped invisible and needed JS to appear.
  it('never hides content at rest', () => {
    const { container } = render(
      <AnimatedSection animation="fade-up" delay={0.4}>
        content
      </AnimatedSection>
    )
    expect(container.innerHTML).not.toContain('opacity-0')
    expect(container.innerHTML).not.toContain('translate-y')
  })
})
