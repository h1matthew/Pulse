/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { PlaybackControls } from '../PlaybackControls'

describe('PlaybackControls', () => {
  const defaultProps = {
    isPlaying: false,
    currentTime: 0,
    totalTime: 60,
    playbackSpeed: 1,
    onPlayPause: vi.fn(),
    onReset: vi.fn(),
    onSpeedChange: vi.fn(),
    onSeek: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders play button when paused', () => {
    render(<PlaybackControls {...defaultProps} isPlaying={false} />)

    const playButton = screen.getByTitle('Play')
    expect(playButton).toBeInTheDocument()
  })

  it('renders pause button when playing', () => {
    render(<PlaybackControls {...defaultProps} isPlaying={true} />)

    const pauseButton = screen.getByTitle('Pause')
    expect(pauseButton).toBeInTheDocument()
  })

  it('calls onPlayPause when play/pause clicked', () => {
    render(<PlaybackControls {...defaultProps} />)

    fireEvent.click(screen.getByTitle('Play'))

    expect(defaultProps.onPlayPause).toHaveBeenCalledTimes(1)
  })

  it('renders reset button', () => {
    render(<PlaybackControls {...defaultProps} />)

    expect(screen.getByTitle('Reset')).toBeInTheDocument()
  })

  it('calls onReset when reset clicked', () => {
    render(<PlaybackControls {...defaultProps} />)

    fireEvent.click(screen.getByTitle('Reset'))

    expect(defaultProps.onReset).toHaveBeenCalledTimes(1)
  })

  it('displays formatted current time', () => {
    render(<PlaybackControls {...defaultProps} currentTime={5.5} />)

    expect(screen.getByText('5.5s')).toBeInTheDocument()
  })

  it('displays formatted total time', () => {
    render(<PlaybackControls {...defaultProps} totalTime={120} />)

    expect(screen.getByText('2:00.0')).toBeInTheDocument()
  })

  it('displays time in minutes:seconds for longer durations', () => {
    render(<PlaybackControls {...defaultProps} currentTime={90} totalTime={180} />)

    expect(screen.getByText('1:30.0')).toBeInTheDocument()
    expect(screen.getByText('3:00.0')).toBeInTheDocument()
  })

  it('renders speed selector buttons', () => {
    render(<PlaybackControls {...defaultProps} />)

    expect(screen.getByText('1x')).toBeInTheDocument()
    expect(screen.getByText('2x')).toBeInTheDocument()
    expect(screen.getByText('4x')).toBeInTheDocument()
    expect(screen.getByText('6x')).toBeInTheDocument()
    expect(screen.getByText('10x')).toBeInTheDocument()
  })

  it('calls onSpeedChange when speed button clicked', () => {
    render(<PlaybackControls {...defaultProps} />)

    fireEvent.click(screen.getByText('4x'))

    expect(defaultProps.onSpeedChange).toHaveBeenCalledWith(4)
  })

  it('highlights current speed', () => {
    render(<PlaybackControls {...defaultProps} playbackSpeed={2} />)

    const speedButton = screen.getByText('2x')
    expect(speedButton).toHaveClass('bg-primary')
  })

  it('renders progress bar', () => {
    const { container } = render(<PlaybackControls {...defaultProps} currentTime={30} totalTime={60} />)

    // Progress should be 50%
    const progressFill = container.querySelector('[style*="width: 50%"]')
    expect(progressFill).toBeInTheDocument()
  })

  it('renders scrubber input', () => {
    render(<PlaybackControls {...defaultProps} totalTime={60} />)

    const scrubber = screen.getByRole('slider')
    expect(scrubber).toHaveAttribute('min', '0')
    expect(scrubber).toHaveAttribute('max', '60')
  })

  it('calls onSeek when scrubber changed', () => {
    render(<PlaybackControls {...defaultProps} totalTime={60} />)

    const scrubber = screen.getByRole('slider')
    fireEvent.change(scrubber, { target: { value: '30' } })

    expect(defaultProps.onSeek).toHaveBeenCalledWith(30)
  })

  it('displays current phase when provided', () => {
    render(<PlaybackControls {...defaultProps} currentPhase="powered" />)

    expect(screen.getByText('powered')).toBeInTheDocument()
  })

  it('applies phase-specific styling', () => {
    render(<PlaybackControls {...defaultProps} currentPhase="First Burn" />)

    const phaseLabel = screen.getByText('First Burn')
    expect(phaseLabel).toHaveClass('bg-orange-500/20')
    expect(phaseLabel).toHaveClass('text-orange-500')
  })

  it('applies coast phase styling', () => {
    render(<PlaybackControls {...defaultProps} currentPhase="Transfer" />)

    const phaseLabel = screen.getByText('Transfer')
    expect(phaseLabel).toHaveClass('bg-blue-500/20')
    expect(phaseLabel).toHaveClass('text-blue-500')
  })

  it('applies descent/target phase styling', () => {
    render(<PlaybackControls {...defaultProps} currentPhase="Target Orbit" />)

    const phaseLabel = screen.getByText('Target Orbit')
    expect(phaseLabel).toHaveClass('bg-green-500/20')
    expect(phaseLabel).toHaveClass('text-green-500')
  })

  it('accepts custom className', () => {
    const { container } = render(<PlaybackControls {...defaultProps} className="custom-class" />)

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('handles zero totalTime gracefully', () => {
    render(<PlaybackControls {...defaultProps} totalTime={0} currentTime={0} />)

    // Should not crash - just check it renders
    expect(screen.getByTitle('Play')).toBeInTheDocument()
  })

  it('handles NaN values gracefully', () => {
    render(<PlaybackControls {...defaultProps} currentTime={NaN} totalTime={NaN} />)

    // Should show 0.0s for NaN values
    const timeElements = screen.getAllByText('0.0s')
    expect(timeElements.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('slider')).toHaveValue('0')
  })

  it('shows progress as percentage when showAsProgress is true', () => {
    render(<PlaybackControls {...defaultProps} currentTime={30} totalTime={60} showAsProgress={true} />)

    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('shows Speed label', () => {
    render(<PlaybackControls {...defaultProps} />)

    expect(screen.getByText('Speed:')).toBeInTheDocument()
  })
})
