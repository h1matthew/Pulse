/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'
import { OnboardingTour, ONBOARDING_KEY, TOUR_STEPS } from '../OnboardingTour'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { TOUR_DEMO_BUSINESS_PATH } from '@/lib/demo/demo-business'

// Node 22 exposes an experimental `localStorage` global that shadows jsdom's,
// leaving window.localStorage undefined under vitest. Restore a working one.
if (!window.localStorage) {
  const store = new Map<string, string>()
  const shim: Storage = {
    getItem: (k) => (store.has(k) ? store.get(k)! : null),
    setItem: (k, v) => void store.set(k, String(v)),
    removeItem: (k) => void store.delete(k),
    clear: () => store.clear(),
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size
    },
  }
  Object.defineProperty(window, 'localStorage', { configurable: true, value: shim })
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: shim })
}

const TOUR_STEP_KEY = 'pulse_tour_step'
const TOUR_BUSINESS_KEY = 'pulse_tour_business'

/** Step indexes of the trimmed five-step tour. */
const STEP = {
  welcome: 0,
  openBusiness: 1,
  deals: 2,
  checkIn: 3,
  impact: 4,
}

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
  const anchors = ['business-card', 'business-reviews', 'business-deals', 'business-checkin']
  for (const id of anchors) {
    const el = document.createElement('div')
    el.setAttribute('data-tour', id)
    el.textContent = id
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

  it('runs at most five steps', () => {
    expect(TOUR_STEPS.length).toBeLessThanOrEqual(5)
  })

  it('teaches only what a first-time visitor cannot infer', () => {
    const ids = TOUR_STEPS.map((s) => s.id)
    // Searching, filtering and sorting are self-evident; they are not taught.
    expect(ids).not.toContain('search')
    expect(ids).not.toContain('categories')
    expect(ids).not.toContain('sort')
    // The non-obvious mechanics stay.
    expect(ids).toContain('deals')
    expect(ids).toContain('check-in')
    expect(ids).toContain('impact')
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

  it('waits for the page to finish loading before it paints anything', async () => {
    // A tour that mounts mid-load would cover the first paint. While the
    // document is still loading nothing is offered, however long we wait.
    const readyState = vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading')

    render(<OnboardingTour />)
    await act(async () => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.queryByText('Welcome to Pulse')).not.toBeInTheDocument()

    readyState.mockReturnValue('complete')
    await act(async () => {
      window.dispatchEvent(new Event('load'))
      vi.advanceTimersByTime(1600)
    })
    expect(screen.getByText('Welcome to Pulse')).toBeInTheDocument()

    readyState.mockRestore()
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

  it('spotlights the business row after the welcome card', async () => {
    mountAnchors()
    await openWelcome()

    fireEvent.click(screen.getByRole('button', { name: /start the tour/i }))
    await settleStep()

    expect(screen.getByText('Meet a local business')).toBeInTheDocument()
    // Mid-tour position survives reloads
    expect(sessionStorage.getItem(TOUR_STEP_KEY)).toBe(String(STEP.openBusiness))
  })

  it('shows loading copy only while the target is genuinely absent', async () => {
    // No anchors mounted: the step is truly waiting (mid-navigation / data
    // still loading), which is the only time the loading copy should show.
    await openWelcome()

    fireEvent.click(screen.getByRole('button', { name: /start the tour/i }))

    // Target not on the page yet: full dim, the action disabled, loading copy.
    await act(async () => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.getByText('Taking you there…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open it for me/i })).toBeDisabled()

    // Once the anchor mounts, the next poll opens the spotlight and unlocks it.
    const el = document.createElement('div')
    el.setAttribute('data-tour', 'business-card')
    document.body.appendChild(el)
    await act(async () => {
      vi.advanceTimersByTime(200) // one poll interval
    })
    expect(screen.queryByText('Taking you there…')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open it for me/i })).toBeEnabled()
  })

  it('reveals an already-rendered target instantly, with no loading gap', async () => {
    mountAnchors()
    await openWelcome()

    // The anchor is already in the DOM, so the leading poll tick reveals it in
    // the same commit — no 150ms "Taking you there…" stall, no disabled action,
    // without advancing any timers.
    fireEvent.click(screen.getByRole('button', { name: /start the tour/i }))

    expect(screen.queryByText('Taking you there…')).not.toBeInTheDocument()
    expect(screen.getByText(/whether it is open right now/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open it for me/i })).toBeEnabled()
  })

  it('does not hijack arrow keys or Escape while the user is typing', async () => {
    mountAnchors()
    const input = document.createElement('input')
    document.body.appendChild(input)
    await openWelcome()

    fireEvent.click(screen.getByRole('button', { name: /start the tour/i }))
    await settleStep()

    // Caret movement must not navigate the tour
    fireEvent.keyDown(input, { key: 'ArrowLeft' })
    fireEvent.keyDown(input, { key: 'ArrowRight' })
    expect(screen.getByText('Meet a local business')).toBeInTheDocument()

    // Esc in a field must not kill the tour
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(localStorage.getItem(ONBOARDING_KEY)).toBeNull()
    expect(screen.getByText('Meet a local business')).toBeInTheDocument()
  })

  it('advances when the user clicks the spotlighted business row', async () => {
    mountAnchors()
    sessionStorage.setItem(TOUR_BUSINESS_KEY, TOUR_DEMO_BUSINESS_PATH)
    await openWelcome()

    fireEvent.click(screen.getByRole('button', { name: /start the tour/i }))
    await settleStep()

    expect(screen.getByText('Meet a local business')).toBeInTheDocument()

    // The user clicks the actual row through the spotlight hole
    fireEvent.click(document.querySelector('[data-tour="business-card"]')!)
    await settleStep()

    expect(screen.getByText('Grab deals & coupons')).toBeInTheDocument()
  })

  it('auto-skips a step whose anchor never appears', async () => {
    // No anchors at all: the business-row step times out and the tour keeps
    // moving instead of trapping the user on a disabled card.
    await openWelcome()
    fireEvent.click(screen.getByRole('button', { name: /start the tour/i }))
    await settleStep()
    expect(screen.getByText('Meet a local business')).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(8500) // past the target timeout
    })

    expect(screen.queryByText('Meet a local business')).not.toBeInTheDocument()
  })

  it('resumes mid-tour after a reload', async () => {
    mountAnchors()
    sessionStorage.setItem(TOUR_STEP_KEY, String(STEP.deals))
    sessionStorage.setItem(TOUR_BUSINESS_KEY, TOUR_DEMO_BUSINESS_PATH)

    render(<OnboardingTour />)
    await settleStep()

    expect(screen.getByText('Grab deals & coupons')).toBeInTheDocument()
  })

  it('opens the dedicated demo business when the row is clicked', async () => {
    mountAnchors()
    // The real row wraps a link to a real business, but the tour always opens
    // its dedicated demo business (guaranteed deals + reviews) instead, so the
    // row's own navigation is suppressed.
    const card = document.querySelector('[data-tour="business-card"]')!
    const link = document.createElement('a')
    link.setAttribute('href', '/business/xyz-789')
    card.appendChild(link)

    await openWelcome()
    fireEvent.click(screen.getByRole('button', { name: /start the tour/i }))
    await settleStep()

    expect(screen.getByText('Meet a local business')).toBeInTheDocument()

    fireEvent.click(card)
    await settleStep()

    expect(sessionStorage.getItem(TOUR_BUSINESS_KEY)).toBe(TOUR_DEMO_BUSINESS_PATH)
    expect(mockPush).toHaveBeenCalledWith(TOUR_DEMO_BUSINESS_PATH)
    expect(screen.getByText('Grab deals & coupons')).toBeInTheDocument()
  })

  it('resumes a business-page step by navigating back to the remembered business', async () => {
    // The deals step was reached, then the page reloaded while NOT on a
    // business page (e.g. on /discover). The remembered business lets the step
    // navigate back instead of stalling on a disabled "Taking you there…" card.
    sessionStorage.setItem(TOUR_STEP_KEY, String(STEP.deals))
    sessionStorage.setItem(TOUR_BUSINESS_KEY, '/business/abc-123')

    render(<OnboardingTour />)
    await settleStep()

    expect(screen.getByText('Grab deals & coupons')).toBeInTheDocument()
    expect(mockPush).toHaveBeenCalledWith('/business/abc-123')
  })

  it('skips a business-page step promptly when the business is unknown and off-page', async () => {
    // Resumed on check-in with no remembered business and not on a business
    // page: unreachable, so it should auto-skip well before the 8s timeout
    // rather than holding a disabled card.
    sessionStorage.setItem(TOUR_STEP_KEY, String(STEP.checkIn))

    render(<OnboardingTour />)
    await act(async () => {
      vi.advanceTimersByTime(1400) // past the short route-less timeout, far under 8s
    })

    // check-in auto-skipped to the centered impact explainer
    expect(screen.getByText('Track your local impact')).toBeInTheDocument()
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

  it('keeps a deals step pointing at the deals tab', async () => {
    mountAnchors()
    sessionStorage.setItem(TOUR_STEP_KEY, String(STEP.deals))
    sessionStorage.setItem(TOUR_BUSINESS_KEY, TOUR_DEMO_BUSINESS_PATH)
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
    sessionStorage.setItem(TOUR_STEP_KEY, String(STEP.deals))
    sessionStorage.setItem(TOUR_BUSINESS_KEY, TOUR_DEMO_BUSINESS_PATH)
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

  it('ends on a centered impact step describing the data report', async () => {
    // Centered explainer (no target) — shows on any page, no loading wait.
    sessionStorage.setItem(TOUR_STEP_KEY, String(STEP.impact))
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
    sessionStorage.setItem(TOUR_STEP_KEY, String(STEP.checkIn))
    sessionStorage.setItem(TOUR_BUSINESS_KEY, TOUR_DEMO_BUSINESS_PATH)
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
