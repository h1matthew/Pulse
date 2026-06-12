/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'
import { OnboardingTour, ONBOARDING_KEY, TOUR_STEPS } from '../OnboardingTour'

const TOUR_STEP_KEY = 'pulse_tour_step'

const mockAnnounce = vi.fn()
vi.mock('@/components/providers/AccessibilityProvider', () => ({
  useAccessibility: () => ({ announce: mockAnnounce }),
}))

vi.mock('@/components/ui/PulseLogo', () => ({
  PulseLogo: ({ className }: { className?: string }) => (
    <div data-testid="pulse-logo" className={className} />
  ),
}))

const mockPush = vi.fn()
// Stable router object, mirroring Next.js (a fresh object per render would
// churn effect dependencies in ways the real router never does)
const mockRouter = { push: mockPush, replace: vi.fn(), prefetch: vi.fn() }
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/',
}))

/** Render all anchor elements the tour spotlights, as the real pages would. */
function mountAnchors() {
  const anchors = [
    'discover-search',
    'discover-categories',
    'business-card',
    'business-reviews',
    'business-checkin',
    'business-bookmark',
  ]
  for (const id of anchors) {
    const el = document.createElement('div')
    el.setAttribute('data-tour', id)
    el.textContent = id
    if (id === 'discover-search') {
      // The real anchor wraps the search <input>
      el.appendChild(document.createElement('input'))
    }
    document.body.appendChild(el)
  }
}

async function openWelcome() {
  render(<OnboardingTour />)
  await act(async () => {
    vi.advanceTimersByTime(1600)
  })
  expect(screen.getByText('Welcome to Pulse')).toBeInTheDocument()
}

/** Let the engine's target poll tick and find the anchor. */
async function settleStep() {
  await act(async () => {
    vi.advanceTimersByTime(400)
  })
}

describe('OnboardingTour (guided walkthrough)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    sessionStorage.clear()
    document.body.innerHTML = ''
    mockAnnounce.mockClear()
    mockPush.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('offers the tour to first-time users after a short delay', async () => {
    render(<OnboardingTour />)
    expect(screen.queryByText('Welcome to Pulse')).not.toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(1600)
    })

    expect(screen.getByText('Welcome to Pulse')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start the tour/i })).toBeInTheDocument()
  })

  it('stays hidden for users who completed it', async () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    render(<OnboardingTour />)

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    expect(screen.queryByText('Welcome to Pulse')).not.toBeInTheDocument()
  })

  it('records completion when skipped', async () => {
    await openWelcome()

    fireEvent.click(screen.getByRole('button', { name: 'Skip tour' }))

    expect(localStorage.getItem(ONBOARDING_KEY)).toBe('true')
    expect(screen.queryByText('Welcome to Pulse')).not.toBeInTheDocument()
  })

  it('skips with the Escape key', async () => {
    await openWelcome()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(localStorage.getItem(ONBOARDING_KEY)).toBe('true')
  })

  it('navigates to /discover when the first anchor is not on the page', async () => {
    // No anchors mounted — the engine should route to where the step lives
    await openWelcome()

    fireEvent.click(screen.getByRole('button', { name: /start the tour/i }))
    await settleStep()

    expect(mockPush).toHaveBeenCalledWith('/discover')
  })

  it('spotlights anchors and walks forward through steps', async () => {
    mountAnchors()
    await openWelcome()

    fireEvent.click(screen.getByRole('button', { name: /start the tour/i }))
    await settleStep()

    expect(screen.getByText('Search what you crave')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await settleStep()

    expect(screen.getByText('Or browse by category')).toBeInTheDocument()
    // Mid-tour position survives reloads
    expect(sessionStorage.getItem(TOUR_STEP_KEY)).toBe('2')
  })

  it('focuses the real search input and reacts when the user types', async () => {
    mountAnchors()
    await openWelcome()

    fireEvent.click(screen.getByRole('button', { name: /start the tour/i }))
    await settleStep()

    expect(screen.getByText(/go ahead, try it right now/i)).toBeInTheDocument()
    const input = document.querySelector<HTMLInputElement>(
      '[data-tour="discover-search"] input'
    )!
    expect(document.activeElement).toBe(input)

    fireEvent.input(input, { target: { value: 'tacos' } })

    expect(screen.getByText(/results filter live as you type/i)).toBeInTheDocument()
  })

  it('does not hijack arrow keys or Escape while the user is typing', async () => {
    mountAnchors()
    await openWelcome()

    fireEvent.click(screen.getByRole('button', { name: /start the tour/i }))
    await settleStep()

    const input = document.querySelector<HTMLInputElement>(
      '[data-tour="discover-search"] input'
    )!

    // Caret movement must not navigate the tour
    fireEvent.keyDown(input, { key: 'ArrowLeft' })
    fireEvent.keyDown(input, { key: 'ArrowRight' })
    expect(screen.getByText('Search what you crave')).toBeInTheDocument()

    // Esc in a field must not kill the tour
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(localStorage.getItem(ONBOARDING_KEY)).toBeNull()
    expect(screen.getByText('Search what you crave')).toBeInTheDocument()
  })

  it('acknowledges a category tap on the categories step', async () => {
    mountAnchors()
    await openWelcome()

    fireEvent.click(screen.getByRole('button', { name: /start the tour/i }))
    await settleStep()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await settleStep()

    expect(screen.getByText(/try tapping one/i)).toBeInTheDocument()

    fireEvent.click(document.querySelector('[data-tour="discover-categories"]')!)

    expect(screen.getByText(/Filtered! Tap around as much as you like/i)).toBeInTheDocument()
  })

  it('advances when the user clicks the spotlighted business card', async () => {
    mountAnchors()
    await openWelcome()

    fireEvent.click(screen.getByRole('button', { name: /start the tour/i }))
    await settleStep()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await settleStep()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await settleStep()

    expect(screen.getByText('Meet a local business')).toBeInTheDocument()

    // The user clicks the actual card through the spotlight hole
    fireEvent.click(document.querySelector('[data-tour="business-card"]')!)
    await settleStep()

    expect(screen.getByText('Real reviews')).toBeInTheDocument()
  })

  it('auto-skips a step whose anchor never appears', async () => {
    // Only the search anchor exists; the categories step should time out
    const el = document.createElement('div')
    el.setAttribute('data-tour', 'discover-search')
    document.body.appendChild(el)

    await openWelcome()
    fireEvent.click(screen.getByRole('button', { name: /start the tour/i }))
    await settleStep()
    expect(screen.getByText('Search what you crave')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await act(async () => {
      vi.advanceTimersByTime(8500) // past the target timeout
    })

    // Skipped "categories" and landed on the business-card step
    expect(screen.getByText('Meet a local business')).toBeInTheDocument()
  })

  it('resumes mid-tour after a reload', async () => {
    mountAnchors()
    sessionStorage.setItem(TOUR_STEP_KEY, '4')

    render(<OnboardingTour />)
    await settleStep()

    expect(screen.getByText('Real reviews')).toBeInTheDocument()
  })

  it('finishes from the last step and records completion', async () => {
    mountAnchors()
    sessionStorage.setItem(TOUR_STEP_KEY, String(TOUR_STEPS.length - 1))

    render(<OnboardingTour />)
    await settleStep()

    fireEvent.click(screen.getByRole('button', { name: /get started/i }))

    expect(localStorage.getItem(ONBOARDING_KEY)).toBe('true')
    expect(sessionStorage.getItem(TOUR_STEP_KEY)).toBeNull()
    expect(document.querySelector('[data-tour-overlay]')).toBeNull()
  })

  it('restarts via the global help-menu hook', async () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    render(<OnboardingTour />)

    await act(async () => {
      ;(window as Window & { restartPulseTour?: () => void }).restartPulseTour?.()
    })

    expect(screen.getByText('Welcome to Pulse')).toBeInTheDocument()
    expect(localStorage.getItem(ONBOARDING_KEY)).toBeNull()
  })
})
