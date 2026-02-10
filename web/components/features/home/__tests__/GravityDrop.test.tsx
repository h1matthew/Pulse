/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'
import { GravityDrop } from '../GravityDrop'

describe('GravityDrop', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders Gravity Lab title', () => {
    render(<GravityDrop />)

    expect(screen.getByText('Gravity Lab')).toBeInTheDocument()
  })

  it('renders description text', () => {
    render(<GravityDrop />)

    expect(screen.getByText(/See how mass and air resistance affect falling objects/)).toBeInTheDocument()
  })

  it('renders Drop Objects button initially', () => {
    render(<GravityDrop />)

    expect(screen.getByText('Drop Objects')).toBeInTheDocument()
  })

  it('renders all gravity level buttons', () => {
    render(<GravityDrop />)

    // Use getAllByRole to find buttons containing the text
    const moonButtons = screen.getAllByRole('button').filter(btn => btn.textContent?.includes('Moon'))
    const earthButtons = screen.getAllByRole('button').filter(btn => btn.textContent?.includes('Earth'))
    const jupiterButtons = screen.getAllByRole('button').filter(btn => btn.textContent?.includes('Jupiter'))
    const sunButtons = screen.getAllByRole('button').filter(btn => btn.textContent?.includes('Sun'))

    expect(moonButtons.length).toBeGreaterThanOrEqual(1)
    expect(earthButtons.length).toBeGreaterThanOrEqual(1)
    expect(jupiterButtons.length).toBeGreaterThanOrEqual(1)
    expect(sunButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('shows Earth as default gravity level', () => {
    render(<GravityDrop />)

    // Find the Earth selector button that has primary styling
    const buttons = screen.getAllByRole('button')
    const earthButton = buttons.find(btn =>
      btn.textContent?.includes('Earth') &&
      btn.classList.contains('bg-primary')
    )
    expect(earthButton).toBeDefined()
  })

  it('shows gravity value for selected level', () => {
    render(<GravityDrop />)

    // Default is Earth with 9.8 m/s²
    expect(screen.getByText('9.8 m/s²')).toBeInTheDocument()
  })

  it('changes gravity level when button clicked', () => {
    render(<GravityDrop />)

    // Find and click the Moon button in the selector area
    const buttons = screen.getAllByRole('button')
    const moonButton = buttons.find(btn =>
      btn.textContent?.includes('Moon') &&
      !btn.classList.contains('bg-primary')
    )
    if (moonButton) {
      fireEvent.click(moonButton)
    }

    // Should show Moon's gravity value
    expect(screen.getByText('1.6 m/s²')).toBeInTheDocument()
  })

  it('renders object labels', () => {
    render(<GravityDrop />)

    expect(screen.getByText('Feather')).toBeInTheDocument()
    expect(screen.getByText('Ball')).toBeInTheDocument()
    expect(screen.getByText('Rocket')).toBeInTheDocument()
  })

  it('hides Drop Objects button after clicking', () => {
    render(<GravityDrop />)

    fireEvent.click(screen.getByText('Drop Objects'))

    expect(screen.queryByText('Drop Objects')).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<GravityDrop className="custom-class" />)

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('renders Surface label', () => {
    render(<GravityDrop />)

    expect(screen.getByText('Surface')).toBeInTheDocument()
  })

  it('shows celestial body emoji icons', () => {
    render(<GravityDrop />)

    // Check for emojis in the component
    expect(screen.getAllByText('🌙').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('🌍').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('🪐').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('☀️').length).toBeGreaterThanOrEqual(1)
  })

  it('updates gravity display when switching to Sun', () => {
    render(<GravityDrop />)

    // Find and click the Sun button
    const buttons = screen.getAllByRole('button')
    const sunButton = buttons.find(btn => btn.textContent?.includes('Sun'))
    if (sunButton) {
      fireEvent.click(sunButton)
    }

    expect(screen.getByText('274 m/s²')).toBeInTheDocument()
  })

  it('clears objects when gravity level changed during drop', async () => {
    render(<GravityDrop />)

    // Start simulation
    fireEvent.click(screen.getByText('Drop Objects'))

    await act(async () => {
      vi.advanceTimersByTime(100)
    })

    // Change gravity - find Jupiter button
    const buttons = screen.getAllByRole('button')
    const jupiterButton = buttons.find(btn => btn.textContent?.includes('Jupiter'))
    if (jupiterButton) {
      fireEvent.click(jupiterButton)
    }

    // Drop Objects button should reappear (simulation reset)
    expect(screen.getByText('Drop Objects')).toBeInTheDocument()
  })
})
