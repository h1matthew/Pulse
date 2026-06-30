/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'
import { OnboardingTour, ONBOARDING_KEY, TOUR_STEPS } from '../OnboardingTour'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

const TOUR_STEP_KEY = 'pulse_tour_step'
const TOUR_BUSINESS_KEY = 'pulse_tour_business'

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
    'discover-sort',
    'business-card',
    'business-reviews',
    'business-deals',
    'business-checkin',
    'business-bookmark',
    'chat-launcher',
    'leaderboard',
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

    expect(screen.getByText('Sort by category')).toBeInTheDocument()
    // Mid-tour position survives reloads
    expect(sessionStorage.getItem(TOUR_STEP_KEY)).toBe('2')
  })

  it('shows loading copy only while the target is genuinely absent', async () => {
    // No anchors mounted: the step is truly waiting (mid-navigation / data
    // still loading), which is the only time the loading copy should show.
    await openWelcome()

    fireEvent.click(screen.getByRole('button', { name: /start the tour/i }))

    // Target not on the page yet: full dim, Next disabled, loading copy shown.
    await act(async () => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.getByText('Taking you there…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()

    // Once the anchor mounts, the next poll opens the spotlight and unlocks Next.
    const el = document.createElement('div')
    el.setAttribute('data-tour', 'discover-search')
    el.appendChild(document.createElement('input'))
    document.body.appendChild(el)
    await act(async () => {
      vi.advanceTimersByTime(200) // one poll interval
    })
    expect(screen.queryByText('Taking you there…')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
  })

  it('reveals an already-rendered target instantly, with no loading gap', async () => {
    mountAnchors()
    await openWelcome()

    // The anchor is already in the DOM, so the leading poll tick reveals it in
    // the same commit — no 150ms "Taking you there…" stall, no disabled Next,
    // without advancing any timers.
    fireEvent.click(screen.getByRole('button', { name: /start the tour/i }))

    expect(screen.queryByText('Taking you there…')).not.toBeInTheDocument()
    expect(screen.getByText(/go ahead, try it right now/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
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
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await settleStep()

    expect(screen.getByText('Meet a local business')).toBeInTheDocument()

    // The user clicks the actual card through the spotlight hole
    fireEvent.click(document.querySelector('[data-tour="business-card"]')!)
    await settleStep()

    expect(screen.getByText('Leave a review or rating')).toBeInTheDocument()
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

    // Skipped "categories" (anchor never mounted) and landed on the sort step
    expect(screen.getByText('Sort by rating or reviews')).toBeInTheDocument()
  })

  it('resumes mid-tour after a reload', async () => {
    mountAnchors()
    sessionStorage.setItem(TOUR_STEP_KEY, '5')

    render(<OnboardingTour />)
    await settleStep()

    expect(screen.getByText('Leave a review or rating')).toBeInTheDocument()
  })

  it('opens the dedicated demo business when the card is clicked', async () => {
    mountAnchors()
    // The real card wraps a link to a real business, but the tour always opens
    // its dedicated demo business (guaranteed deals + reviews) instead, so the
    // card's own navigation is suppressed.
    const card = document.querySelector('[data-tour="business-card"]')!
    const link = document.createElement('a')
    link.setAttribute('href', '/business/xyz-789')
    card.appendChild(link)

    await openWelcome()
    fireEvent.click(screen.getByRole('button', { name: /start the tour/i }))
    await settleStep() // search
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await settleStep() // categories
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await settleStep() // sort
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await settleStep() // open-business

    expect(screen.getByText('Meet a local business')).toBeInTheDocument()

    fireEvent.click(card)
    await settleStep()

    expect(sessionStorage.getItem(TOUR_BUSINESS_KEY)).toBe('/business/onboarding-demo')
    expect(mockPush).toHaveBeenCalledWith('/business/onboarding-demo')
    expect(screen.getByText('Leave a review or rating')).toBeInTheDocument()
  })

  it('resumes a business-page step by navigating back to the remembered business', async () => {
    // The reviews step was reached, then the page reloaded while NOT on a
    // business page (e.g. on /discover). The remembered business lets the step
    // navigate back instead of stalling on a disabled "Taking you there…" card.
    sessionStorage.setItem(TOUR_STEP_KEY, '5') // reviews
    sessionStorage.setItem(TOUR_BUSINESS_KEY, '/business/abc-123')

    render(<OnboardingTour />)
    await settleStep()

    expect(screen.getByText('Leave a review or rating')).toBeInTheDocument()
    expect(mockPush).toHaveBeenCalledWith('/business/abc-123')
  })

  it('skips a business-page step promptly when the business is unknown and off-page', async () => {
    // Resumed on reviews with no remembered business and not on a business
    // page: unreachable, so it should auto-skip well before the 8s timeout
    // rather than holding a disabled card.
    sessionStorage.setItem(TOUR_STEP_KEY, '5') // reviews, no business remembered

    render(<OnboardingTour />)
    await act(async () => {
      vi.advanceTimersByTime(1400) // past the short route-less timeout, far under 8s
    })

    // reviews auto-skipped to the next step (the centered verification explainer)
    expect(screen.getByText('Real people, real reviews')).toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()
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

  it('adds a sort step explaining ordering by rating and reviews', async () => {
    mountAnchors()
    sessionStorage.setItem(TOUR_STEP_KEY, '3') // sort
    render(<OnboardingTour />)
    await settleStep()

    expect(screen.getByText('Sort by rating or reviews')).toBeInTheDocument()
    expect(screen.getByText(/Most reviewed/i)).toBeInTheDocument()
  })

  it('includes a centered bot-verification explainer step', async () => {
    // No anchors needed — it's a centered card with no spotlight target, so it
    // shows on any page and never falls into the "Taking you there…" wait.
    sessionStorage.setItem(TOUR_STEP_KEY, '6') // verify
    render(<OnboardingTour />)
    await settleStep()

    expect(screen.getByText('Real people, real reviews')).toBeInTheDocument()
    expect(screen.getByText(/block bots/i)).toBeInTheDocument()
    expect(screen.queryByText('Taking you there…')).not.toBeInTheDocument()
  })

  it('adds a deals step pointing at the deals tab', async () => {
    mountAnchors()
    sessionStorage.setItem(TOUR_STEP_KEY, '7') // deals
    render(<OnboardingTour />)
    await settleStep()

    expect(screen.getByText('Grab deals & coupons')).toBeInTheDocument()
    expect(screen.getByText(/unique code/i)).toBeInTheDocument()
  })

  it('activates the real Radix deals tab so its panel opens', async () => {
    // Render a real Radix Tabs (default = reviews) alongside the tour. The
    // deals step must actually switch it to the Deals panel — not merely fire
    // an event — so this guards the real activation contract (Radix needs
    // mousedown with button 0, which a bare .click() never delivered).
    sessionStorage.setItem(TOUR_STEP_KEY, '7') // deals
    sessionStorage.setItem(TOUR_BUSINESS_KEY, '/business/onboarding-demo')
    render(
      <>
        <Tabs defaultValue="reviews">
          <TabsList>
            <TabsTrigger value="reviews" data-tour="business-reviews">
              Reviews
            </TabsTrigger>
            <TabsTrigger value="deals" data-tour="business-deals">
              Deals
            </TabsTrigger>
          </TabsList>
          <TabsContent value="reviews">reviews-panel</TabsContent>
          <TabsContent value="deals">deals-panel</TabsContent>
        </Tabs>
        <OnboardingTour />
      </>
    )
    await settleStep()

    // Inactive Radix TabsContent is unmounted, so the deals panel appearing
    // (and the reviews panel disappearing) proves the tab really switched.
    expect(screen.getByText('deals-panel')).toBeInTheDocument()
    expect(screen.queryByText('reviews-panel')).not.toBeInTheDocument()
    expect(
      document.querySelector('[data-tour="business-deals"]')?.getAttribute('data-state')
    ).toBe('active')
  })

  it('opens the assistant and spotlights its live panel on the chatbot step', async () => {
    // The step opens the chat via window.openPulseAssistant (exposed by the
    // ChatWidget); mock it to mount the panel the step spotlights.
    const w = window as Window & {
      openPulseAssistant?: () => void
      closePulseAssistant?: () => void
    }
    const openSpy = vi.fn(() => {
      const panel = document.createElement('div')
      panel.setAttribute('data-tour', 'chat-panel')
      panel.id = 'mock-chat-panel'
      document.body.appendChild(panel)
    })
    const closeSpy = vi.fn(() => {
      document.getElementById('mock-chat-panel')?.remove()
    })
    w.openPulseAssistant = openSpy
    w.closePulseAssistant = closeSpy

    sessionStorage.setItem(TOUR_STEP_KEY, '10') // assistant / chatbot
    render(<OnboardingTour />)
    await settleStep()

    expect(openSpy).toHaveBeenCalled()
    expect(screen.getByText('Ask the AI assistant')).toBeInTheDocument()
    expect(screen.getByText(/Pulse Assistant/i)).toBeInTheDocument()

    delete w.openPulseAssistant
    delete w.closePulseAssistant
  })

  it('adds a leaderboard step that routes to the leaderboard page', async () => {
    // Anchor isn't mounted here, so the step should navigate to where it lives.
    sessionStorage.setItem(TOUR_STEP_KEY, '11') // leaderboard
    render(<OnboardingTour />)
    await settleStep()

    expect(screen.getByText('Climb the leaderboard')).toBeInTheDocument()
    expect(mockPush).toHaveBeenCalledWith('/leaderboard')
  })

  it('adds a centered impact-report step describing the data report', async () => {
    // Centered explainer (no target) — shows on any page, no loading wait.
    sessionStorage.setItem(TOUR_STEP_KEY, '12') // impact
    render(<OnboardingTour />)
    await settleStep()

    expect(screen.getByText('Track your local impact')).toBeInTheDocument()
    expect(screen.getByText(/CSV/)).toBeInTheDocument()
    expect(screen.queryByText('Taking you there…')).not.toBeInTheDocument()
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

  it('hides the tour overlay while a Radix Dialog is open so it never overlaps', async () => {
    mountAnchors()
    sessionStorage.setItem(TOUR_STEP_KEY, '8') // check-in step
    sessionStorage.setItem(TOUR_BUSINESS_KEY, '/business/onboarding-demo')
    render(<OnboardingTour />)
    await settleStep()

    expect(screen.getByText('Make your visit count')).toBeInTheDocument()

    // Simulate the receipt check-in dialog opening: a Radix DialogContent with
    // data-state="open" is portaled into the body.
    const dialog = document.createElement('div')
    dialog.setAttribute('data-slot', 'dialog-content')
    dialog.setAttribute('data-state', 'open')
    dialog.textContent = 'Scan your receipt'
    await act(async () => {
      document.body.appendChild(dialog)
    })

    // The tour card + dimmer are suppressed while the dialog is open
    expect(screen.queryByText('Make your visit count')).not.toBeInTheDocument()

    // Closing the dialog brings the tour card back
    await act(async () => {
      dialog.remove()
    })
    expect(screen.getByText('Make your visit count')).toBeInTheDocument()
  })
})
