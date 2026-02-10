/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { GForceMeter } from '../GForceMeter'

describe('GForceMeter', () => {
  it('renders with title', () => {
    render(<GForceMeter currentG={1} maxTolerance={9} />)

    expect(screen.getByText('G-Force')).toBeInTheDocument()
  })

  it('displays current G value', () => {
    render(<GForceMeter currentG={3.5} maxTolerance={9} />)

    expect(screen.getByText('3.5')).toBeInTheDocument()
    expect(screen.getByText('g')).toBeInTheDocument()
  })

  it('displays crew tolerance value', () => {
    render(<GForceMeter currentG={1} maxTolerance={9} />)

    expect(screen.getByText('Crew tolerance:')).toBeInTheDocument()
    expect(screen.getByText('9g')).toBeInTheDocument()
  })

  it('shows Microgravity status for G < 1', () => {
    render(<GForceMeter currentG={0.5} maxTolerance={9} />)

    expect(screen.getByText('Microgravity')).toBeInTheDocument()
  })

  it('shows Normal status for low G', () => {
    render(<GForceMeter currentG={2} maxTolerance={9} />)

    expect(screen.getByText('Normal')).toBeInTheDocument()
  })

  it('shows Elevated status for moderate G', () => {
    // 50-80% of tolerance (9g tolerance, so 4.5-7.2g)
    render(<GForceMeter currentG={5} maxTolerance={9} />)

    expect(screen.getByText('Elevated')).toBeInTheDocument()
  })

  it('shows High - Crew discomfort for high G', () => {
    // 80-100% of tolerance (9g tolerance, so 7.2-9g)
    render(<GForceMeter currentG={8} maxTolerance={9} />)

    expect(screen.getByText('High - Crew discomfort')).toBeInTheDocument()
  })

  it('shows Exceeds tolerance! for G above max', () => {
    render(<GForceMeter currentG={10} maxTolerance={9} />)

    expect(screen.getByText('Exceeds tolerance!')).toBeInTheDocument()
  })

  it('renders SVG dial', () => {
    const { container } = render(<GForceMeter currentG={5} maxTolerance={9} />)

    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('uses default maxScale of 15', () => {
    const { container } = render(<GForceMeter currentG={5} maxTolerance={9} />)

    // Check that scale labels are rendered (0, 7/8 (half), 15)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg?.textContent).toContain('0')
    expect(svg?.textContent).toContain('15')
  })

  it('accepts custom maxScale', () => {
    const { container } = render(<GForceMeter currentG={5} maxTolerance={9} maxScale={20} />)

    const svg = container.querySelector('svg')
    expect(svg?.textContent).toContain('20')
  })

  it('clamps needle position at maxScale', () => {
    // G value higher than maxScale - needle should be at max position
    const { container } = render(<GForceMeter currentG={20} maxTolerance={9} maxScale={15} />)

    // Should show the value but needle is clamped
    expect(screen.getByText('20.0')).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('applies correct color for green zone', () => {
    render(<GForceMeter currentG={2} maxTolerance={9} />)

    // Digital readout should have green color class
    const gValue = screen.getByText('2.0')
    expect(gValue).toHaveClass('text-green-500')
  })

  it('applies correct color for yellow zone', () => {
    render(<GForceMeter currentG={5} maxTolerance={9} />)

    const gValue = screen.getByText('5.0')
    expect(gValue).toHaveClass('text-yellow-500')
  })

  it('applies correct color for orange zone', () => {
    render(<GForceMeter currentG={8} maxTolerance={9} />)

    const gValue = screen.getByText('8.0')
    expect(gValue).toHaveClass('text-orange-500')
  })

  it('applies correct color for red zone', () => {
    render(<GForceMeter currentG={10} maxTolerance={9} />)

    const gValue = screen.getByText('10.0')
    expect(gValue).toHaveClass('text-red-500')
  })

  it('renders with card styling', () => {
    const { container } = render(<GForceMeter currentG={5} maxTolerance={9} />)

    const card = container.firstChild
    expect(card).toHaveClass('bg-card')
    expect(card).toHaveClass('rounded-lg')
  })
})
