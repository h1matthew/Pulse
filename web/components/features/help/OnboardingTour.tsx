/**
 * OnboardingTour — guided product walkthrough
 *
 * A coach-mark tour over the REAL app: it dims the page, spotlights actual
 * UI elements (search, filters, a business card, the check-in and bookmark
 * buttons on a business page), and walks the user through their first
 * restaurant visit end-to-end. Steps can navigate between routes, and the
 * "open a business" step advances when the user actually clicks the
 * spotlighted card.
 *
 * Mechanics:
 * - Targets are located by [data-tour="…"] anchors rendered by the pages.
 * - Each step polls for its target (pages load data async); if the target
 *   never appears the step auto-skips instead of trapping the user.
 * - Completion is remembered in localStorage; an in-flight tour survives a
 *   full reload via sessionStorage.
 * - window.restartPulseTour() (used by the help menu) restarts it anywhere.
 */
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PulseLogo } from '@/components/ui/PulseLogo'
import { useAccessibility } from '@/components/providers/AccessibilityProvider'
import { cn } from '@/lib/utils'

/** LocalStorage key for tracking onboarding completion */
const ONBOARDING_KEY = 'pulse_onboarding_completed'
/** SessionStorage key so a reload mid-tour resumes where it left off */
const TOUR_STEP_KEY = 'pulse_tour_step'

const TARGET_POLL_MS = 150
/** A target that hasn't appeared after this long auto-skips its step. */
const TARGET_TIMEOUT_MS = 8000
const SPOTLIGHT_PADDING = 8

interface GuidedStep {
  id: string
  title: string
  body: string
  /** CSS selector of the element to spotlight; omit for a centered card */
  target?: string
  /** Route to push when the step starts and the target isn't on screen */
  route?: string
  /** The step completes when the user clicks the spotlighted element */
  advanceOnTargetClick?: boolean
  /** Listen for the user genuinely trying the spotlighted control… */
  interactEvent?: 'input' | 'click'
  /** …and swap the card copy to acknowledge it */
  interactedBody?: string
  /** Move focus into the target (e.g. the search field) so they can type */
  focusTarget?: boolean
  nextLabel?: string
}

const TOUR_STEPS: GuidedStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Pulse',
    body: "Let's take a quick walk through the real thing — we'll find a local spot, open it, and show you how visits count. Takes about a minute.",
    nextLabel: 'Start the tour',
  },
  {
    id: 'search',
    title: 'Search what you crave',
    body: 'Type a dish, a shop name, or a service — go ahead, try it right now.',
    target: '[data-tour="discover-search"]',
    route: '/discover',
    interactEvent: 'input',
    interactedBody:
      'See that? Results filter live as you type. Keep going, or press Next when you’re ready.',
    focusTarget: true,
  },
  {
    id: 'categories',
    title: 'Or browse by category',
    body: 'One tap filters the whole feed — Food & Drink, Retail, Services… try tapping one.',
    target: '[data-tour="discover-categories"]',
    route: '/discover',
    interactEvent: 'click',
    interactedBody: 'Filtered! Tap around as much as you like, then press Next.',
  },
  {
    id: 'open-business',
    title: 'Meet a local business',
    body: 'Ratings, distance, and whether it’s open right now — all on the card. Click it to take a closer look.',
    target: '[data-tour="business-card"]',
    route: '/discover',
    advanceOnTargetClick: true,
    nextLabel: 'Open it for me',
  },
  {
    id: 'reviews',
    title: 'Real reviews',
    body: 'Community and Google reviews live here — and you can add your own after you visit.',
    target: '[data-tour="business-reviews"]',
  },
  {
    id: 'check-in',
    title: 'Make your visit count',
    body: 'After you buy something, hit Check In and snap your receipt. Verified visits advance missions and grow your local impact.',
    target: '[data-tour="business-checkin"]',
  },
  {
    id: 'bookmark',
    title: 'Save it for later',
    body: 'Bookmark spots you love to build your go-to list and hear about new deals.',
    target: '[data-tour="business-bookmark"]',
  },
  {
    id: 'done',
    title: "That's the loop",
    body: 'Discover, visit, verify with a receipt — then watch your dashboard tally the dollars you keep local. Enjoy exploring!',
    nextLabel: 'Get started',
  },
]

interface SpotlightRect {
  top: number
  left: number
  width: number
  height: number
}

function readSessionStep(): number | null {
  try {
    const raw = sessionStorage.getItem(TOUR_STEP_KEY)
    if (raw === null) return null
    const parsed = Number(raw)
    return Number.isInteger(parsed) && parsed >= 0 && parsed < TOUR_STEPS.length
      ? parsed
      : null
  } catch {
    return null
  }
}

export function OnboardingTour() {
  const router = useRouter()
  const { announce } = useAccessibility()

  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState<SpotlightRect | null>(null)
  const [targetFound, setTargetFound] = useState(false)
  /** The user genuinely tried the spotlighted control on this step */
  const [interacted, setInteracted] = useState(false)
  const targetRef = useRef<HTMLElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)

  const step = TOUR_STEPS[stepIndex]
  const isLastStep = stepIndex === TOUR_STEPS.length - 1
  const stepRef = useRef(step)
  stepRef.current = step
  // Refs so the target-polling effect depends only on (active, stepIndex):
  // identity churn in router/finish must not reset an in-flight spotlight.
  const routerRef = useRef(router)
  routerRef.current = router

  const finish = useCallback(
    (message: string) => {
      try {
        localStorage.setItem(ONBOARDING_KEY, 'true')
        sessionStorage.removeItem(TOUR_STEP_KEY)
      } catch {
        // storage unavailable — just close
      }
      setActive(false)
      announce(message, 'polite')
    },
    [announce]
  )

  const goToStep = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(TOUR_STEPS.length - 1, index))
      setStepIndex(clamped)
      try {
        sessionStorage.setItem(TOUR_STEP_KEY, String(clamped))
      } catch {
        // non-fatal
      }
      announce(
        `Tour step ${clamped + 1} of ${TOUR_STEPS.length}: ${TOUR_STEPS[clamped].title}`,
        'polite'
      )
    },
    [announce]
  )

  const goToStepRef = useRef(goToStep)
  goToStepRef.current = goToStep
  const finishRef = useRef(finish)
  finishRef.current = finish

  const handleNext = useCallback(() => {
    if (isLastStep) {
      finish('Tour complete! Enjoy exploring Pulse.')
      return
    }
    const current = stepRef.current
    if (current.advanceOnTargetClick && targetRef.current) {
      // "Open it for me": click the target's link (the card itself is not
      // the anchor), so navigation really happens; the capture listener on
      // the target advances the tour as the click bubbles through it.
      const link = targetRef.current.querySelector('a')
      ;(link ?? targetRef.current).click()
      return
    }
    goToStep(stepIndex + 1)
  }, [finish, goToStep, isLastStep, stepIndex])

  const handleSkip = useCallback(() => {
    finish('Tour skipped. You can restart it anytime from the help menu.')
  }, [finish])

  // First visit: offer the tour after a beat. Mid-tour reload: resume.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.localStorage) return
    if (localStorage.getItem(ONBOARDING_KEY)) return

    const resumeAt = readSessionStep()
    if (resumeAt !== null) {
      setStepIndex(resumeAt)
      setActive(true)
      return
    }

    const timer = setTimeout(() => {
      setActive(true)
      announce('Welcome to Pulse! A guided tour is available.', 'polite')
    }, 1500)
    return () => clearTimeout(timer)
  }, [announce])

  // Restart hook for the help menu
  useEffect(() => {
    if (typeof window === 'undefined') return
    ;(window as Window & { restartPulseTour?: () => void }).restartPulseTour = () => {
      try {
        localStorage.removeItem(ONBOARDING_KEY)
      } catch {
        // non-fatal
      }
      goToStepRef.current(0)
      setActive(true)
    }
  }, [])

  // Per-step target lifecycle: navigate if needed, poll until the anchor
  // exists, spotlight it, follow it through scroll/resize, and advance on
  // click for click-through steps. Auto-skips if the target never shows.
  useEffect(() => {
    if (!active) return
    const currentStep = TOUR_STEPS[stepIndex]
    setRect(null)
    setTargetFound(false)
    setInteracted(false)
    targetRef.current = null

    if (!currentStep.target) return

    let cancelled = false
    let navigated = false
    let rafId: number | null = null
    const startedAt = Date.now()

    const measure = () => {
      const el = targetRef.current
      if (!el || cancelled) return
      const r = el.getBoundingClientRect()
      setRect((prev) => {
        if (
          prev &&
          Math.abs(prev.top - r.top) < 0.5 &&
          Math.abs(prev.left - r.left) < 0.5 &&
          Math.abs(prev.width - r.width) < 0.5 &&
          Math.abs(prev.height - r.height) < 0.5
        ) {
          return prev
        }
        return { top: r.top, left: r.left, width: r.width, height: r.height }
      })
      rafId = requestAnimationFrame(measure)
    }

    const advanceFromClick = () => {
      if (!cancelled) goToStepRef.current(stepIndex + 1)
    }
    const markInteracted = () => {
      if (!cancelled) setInteracted(true)
    }

    const poll = setInterval(() => {
      if (cancelled) return
      const el = document.querySelector<HTMLElement>(currentStep.target!)
      if (el) {
        clearInterval(poll)
        targetRef.current = el
        setTargetFound(true)
        el.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
        if (currentStep.advanceOnTargetClick) {
          el.addEventListener('click', advanceFromClick, { once: true, capture: true })
        }
        if (currentStep.interactEvent) {
          el.addEventListener(currentStep.interactEvent, markInteracted, {
            once: true,
            capture: true,
          })
        }
        if (currentStep.focusTarget) {
          // Put the cursor where the action is — typing works immediately
          const focusable =
            el.querySelector<HTMLElement>('input, textarea, [contenteditable]') ?? el
          focusable.focus?.()
        }
        measure()
        return
      }
      // Target isn't on this page — go where the step lives (once)
      if (!navigated && currentStep.route && !window.location.pathname.startsWith(currentStep.route)) {
        navigated = true
        routerRef.current.push(currentStep.route)
      }
      if (Date.now() - startedAt > TARGET_TIMEOUT_MS) {
        clearInterval(poll)
        // Never trap the user on a step whose anchor can't be found
        if (stepIndex >= TOUR_STEPS.length - 1) {
          finishRef.current('Tour complete! Enjoy exploring Pulse.')
        } else {
          goToStepRef.current(stepIndex + 1)
        }
      }
    }, TARGET_POLL_MS)

    return () => {
      cancelled = true
      clearInterval(poll)
      if (rafId !== null) cancelAnimationFrame(rafId)
      targetRef.current?.removeEventListener('click', advanceFromClick, true)
      if (currentStep.interactEvent) {
        targetRef.current?.removeEventListener(currentStep.interactEvent, markInteracted, true)
      }
    }
  }, [active, stepIndex])
  // (route changes intentionally don't reset this effect: polling already
  // sees the new DOM, and identity churn must not blank the spotlight)

  // Keyboard: Esc skips, arrows navigate — but never while the user is
  // typing in a real control (arrow keys move the caret, Esc clears focus)
  useEffect(() => {
    if (!active) return
    const isTypingTarget = (event: KeyboardEvent) => {
      const el = event.target as HTMLElement | null
      if (!el) return false
      return (
        el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.tagName === 'SELECT' ||
        el.isContentEditable
      )
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event)) return
      if (event.key === 'Escape') {
        event.preventDefault()
        handleSkip()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        handleNext()
      } else if (event.key === 'ArrowLeft' && stepIndex > 0) {
        event.preventDefault()
        goToStep(stepIndex - 1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active, handleNext, handleSkip, goToStep, stepIndex])

  // Focus the card when the step changes so keyboard users stay anchored
  useEffect(() => {
    if (active) cardRef.current?.focus()
  }, [active, stepIndex])

  if (!active) return null

  const isCentered = !step.target
  const showSpotlight = targetFound && rect !== null
  const waitingForTarget = !isCentered && !showSpotlight

  const pad = SPOTLIGHT_PADDING
  const hole = showSpotlight
    ? {
        top: Math.max(0, rect.top - pad),
        left: Math.max(0, rect.left - pad),
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null

  // Card placement: under the spotlight if there's room, otherwise above;
  // centered card for welcome/done steps.
  const CARD_WIDTH = 360
  const CARD_EST_HEIGHT = 220
  let cardStyle: React.CSSProperties
  if (isCentered || !hole) {
    cardStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  } else {
    const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800
    const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1200
    const below = hole.top + hole.height + 14
    const top =
      below + CARD_EST_HEIGHT <= viewportH
        ? below
        : Math.max(14, hole.top - CARD_EST_HEIGHT - 14)
    const left = Math.min(
      Math.max(14, hole.left),
      Math.max(14, viewportW - CARD_WIDTH - 14)
    )
    cardStyle = { top, left }
  }

  return (
    <div className="fixed inset-0 z-120" data-tour-overlay>
      {/* Dimmer: 4 panels around the spotlight hole so the target itself
          stays fully interactive (click the card, press the real buttons). */}
      {hole ? (
        <>
          <div className="absolute bg-black/55 transition-all duration-300" style={{ top: 0, left: 0, right: 0, height: hole.top }} />
          <div className="absolute bg-black/55 transition-all duration-300" style={{ top: hole.top, left: 0, width: hole.left, height: hole.height }} />
          <div className="absolute bg-black/55 transition-all duration-300" style={{ top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height }} />
          <div className="absolute bg-black/55 transition-all duration-300" style={{ top: hole.top + hole.height, left: 0, right: 0, bottom: 0 }} />
          {/* Spotlight ring */}
          <div
            className="pointer-events-none absolute rounded-xl border-2 border-primary shadow-[0_0_0_4px] shadow-primary/25 transition-all duration-300"
            style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
            aria-hidden="true"
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/55" />
      )}

      {/* Step card */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="false"
        aria-label={`Tour step ${stepIndex + 1} of ${TOUR_STEPS.length}: ${step.title}`}
        tabIndex={-1}
        className="absolute w-[min(360px,calc(100vw-28px))] rounded-2xl border border-border bg-background p-5 shadow-2xl outline-none animate-scale-in"
        style={cardStyle}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <PulseLogo className="h-6 w-6" />
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Step {stepIndex + 1} of {TOUR_STEPS.length}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Dismiss tour"
            className="text-muted-foreground hover:text-foreground"
            onClick={handleSkip}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>

        <h2 className="mt-3 text-lg font-semibold tracking-tight">{step.title}</h2>
        <p className="mt-1.5 text-sm leading-6 text-muted-foreground" aria-live="polite">
          {waitingForTarget
            ? 'Taking you there…'
            : interacted && step.interactedBody
              ? step.interactedBody
              : step.body}
        </p>

        {/* Progress dots */}
        <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
          {TOUR_STEPS.map((s, index) => (
            <span
              key={s.id}
              className={cn(
                'h-1.5 rounded-full transition-all',
                index === stepIndex
                  ? 'w-5 bg-primary'
                  : index < stepIndex
                    ? 'w-1.5 bg-primary/50'
                    : 'w-1.5 bg-muted'
              )}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            Skip tour
          </Button>
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <Button variant="outline" size="sm" onClick={() => goToStep(stepIndex - 1)}>
                Back
              </Button>
            )}
            <Button size="sm" onClick={handleNext} className="gap-1" disabled={waitingForTarget}>
              {step.nextLabel ?? (isLastStep ? 'Get started' : 'Next')}
              {isLastStep ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export { ONBOARDING_KEY, TOUR_STEPS }
