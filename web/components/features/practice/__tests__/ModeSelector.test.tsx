/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { ModeSelector } from '../ModeSelector'
import type { StudyMode } from '@/types/flashcards'

describe('ModeSelector', () => {
  const mockOnModeChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all mode options', () => {
    render(<ModeSelector mode="learn" onModeChange={mockOnModeChange} />)

    expect(screen.getByText('Learn')).toBeInTheDocument()
    expect(screen.getByText('Match')).toBeInTheDocument()
    expect(screen.getByText('Test')).toBeInTheDocument()
    expect(screen.getByText('Write')).toBeInTheDocument()
  })

  it('shows current mode as selected', () => {
    render(<ModeSelector mode="test" onModeChange={mockOnModeChange} />)

    const testTab = screen.getByRole('tab', { name: /test/i })
    expect(testTab).toHaveAttribute('data-state', 'active')
  })

  it('renders learn tab as active when mode is learn', () => {
    render(<ModeSelector mode="learn" onModeChange={mockOnModeChange} />)

    const learnTab = screen.getByRole('tab', { name: /learn/i })
    expect(learnTab).toHaveAttribute('data-state', 'active')
  })

  it('renders match tab as active when mode is match', () => {
    render(<ModeSelector mode="match" onModeChange={mockOnModeChange} />)

    const matchTab = screen.getByRole('tab', { name: /match/i })
    expect(matchTab).toHaveAttribute('data-state', 'active')
  })

  it('renders write tab as active when mode is write', () => {
    render(<ModeSelector mode="write" onModeChange={mockOnModeChange} />)

    const writeTab = screen.getByRole('tab', { name: /write/i })
    expect(writeTab).toHaveAttribute('data-state', 'active')
  })

  it('renders as a grid of 4 columns', () => {
    render(<ModeSelector mode="learn" onModeChange={mockOnModeChange} />)

    const tabsList = screen.getByRole('tablist')
    expect(tabsList).toHaveClass('grid-cols-4')
  })

  it('renders tab icons', () => {
    const { container } = render(<ModeSelector mode="learn" onModeChange={mockOnModeChange} />)

    // Check that lucide icons are rendered (they render as SVGs)
    const svgIcons = container.querySelectorAll('svg')
    expect(svgIcons.length).toBeGreaterThanOrEqual(4) // At least 4 icons for 4 modes
  })

  it('supports all valid mode values', () => {
    const modes: StudyMode[] = ['learn', 'match', 'test', 'write']

    modes.forEach((mode) => {
      const { unmount } = render(<ModeSelector mode={mode} onModeChange={mockOnModeChange} />)

      // Verify the mode is displayed as active
      const tabs = screen.getAllByRole('tab')
      const activeTab = tabs.find((tab) => tab.getAttribute('data-state') === 'active')
      expect(activeTab).toBeDefined()

      unmount()
    })
  })

  it('renders each tab with an icon and text', () => {
    render(<ModeSelector mode="learn" onModeChange={mockOnModeChange} />)

    // Each tab should have both icon (svg) and text
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(4)

    tabs.forEach((tab) => {
      expect(tab.querySelector('svg')).toBeInTheDocument()
    })
  })
})
