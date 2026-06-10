/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { AppBackground } from '../AppBackground'

describe('AppBackground', () => {
  it('renders staggered watercolor ink drops', () => {
    const { container } = render(<AppBackground />)

    const drops = container.querySelectorAll('.animate-ink-drop')
    expect(drops.length).toBeGreaterThanOrEqual(4)

    // Drops land in sequence — entrance delays must increase
    const delays = Array.from(drops).map((el) =>
      parseFloat((el as HTMLElement).style.animationDelay)
    )
    const sorted = [...delays].sort((a, b) => a - b)
    expect(delays).toEqual(sorted)
    expect(new Set(delays).size).toBe(delays.length)
  })

  it('gives every drop a continuously swaying pigment layer', () => {
    const { container } = render(<AppBackground />)

    const drops = container.querySelectorAll('.animate-ink-drop')
    drops.forEach((drop) => {
      const pigment = drop.querySelector('.animate-ink-sway') as HTMLElement
      expect(pigment).not.toBeNull()
      expect(pigment.style.background).toContain('radial-gradient')
      expect(pigment.style.filter).toContain('blur')
      expect(pigment.style.borderRadius).not.toBe('')
    })
  })

  it('stays behind the page and ignores pointer events', () => {
    const { container } = render(<AppBackground />)

    const root = container.firstChild as HTMLElement
    expect(root).toHaveClass('-z-10', 'pointer-events-none', 'fixed')
  })
})
