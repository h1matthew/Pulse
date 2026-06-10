import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FounderCard } from '../FounderCard'
import type { Founder } from '../FounderCard'

const FOUNDER: Founder = {
  id: 'oscar',
  name: 'Oscar Gao',
  role: 'Co-founder',
  bio: '',
  image_url: null,
  image_offset_x: 50,
  image_offset_y: 50,
  image_zoom: 1,
  display_order: 0,
}

describe('FounderCard', () => {
  it('renders the founder name as a heading', () => {
    render(<FounderCard founder={FOUNDER} index={0} />)
    expect(screen.getByRole('heading', { name: 'Oscar Gao' })).toBeInTheDocument()
  })

  it('renders the founder role', () => {
    render(<FounderCard founder={FOUNDER} index={0} />)
    expect(screen.getByText('Co-founder')).toBeInTheDocument()
  })

  it('renders a zero-padded mono index from the index prop', () => {
    const { rerender } = render(<FounderCard founder={FOUNDER} index={0} />)
    expect(screen.getByText('01')).toHaveClass('font-mono')

    rerender(<FounderCard founder={FOUNDER} index={2} />)
    expect(screen.getByText('03')).toHaveClass('font-mono')
  })

  it('uses card surface tokens with a hairline border', () => {
    const { container } = render(<FounderCard founder={FOUNDER} index={0} />)
    const card = container.firstElementChild as HTMLElement
    expect(card.className).toContain('bg-card')
    expect(card.className).toContain('border-border')
    expect(card.className).toContain('hover:border-primary/30')
  })

  it('staggers the entrance animation by index', () => {
    const { container } = render(<FounderCard founder={FOUNDER} index={1} />)
    const card = container.firstElementChild as HTMLElement
    expect(card.style.animationDelay).toBe('0.25s')
  })

  it('contains no emoji and no gradient or blur decoration classes', () => {
    const { container } = render(<FounderCard founder={FOUNDER} index={0} />)
    const emojiPattern = /[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|\u{FE0F}/u
    expect(emojiPattern.test(container.textContent ?? '')).toBe(false)
    const html = container.innerHTML
    expect(html).not.toContain('bg-clip-text')
    expect(html).not.toContain('text-transparent')
    expect(html).not.toContain('backdrop-blur')
  })
})
