/**
 * OnboardingTour Component
 *
 * Interactive walkthrough for first-time users to learn key features.
 * Uses localStorage to track completion and prevent repeat showings.
 *
 * Tour Steps:
 * 1. Welcome to Pulse
 * 2. Discover local businesses
 * 3. Track your impact
 * 4. Complete missions
 * 5. Save favorites
 *
 * @example
 * ```tsx
 * <OnboardingTour />
 * ```
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  MapPin,
  TrendingUp,
  Trophy,
  Heart,
  ArrowRight,
  Check,
} from 'lucide-react'
import { PulseLogo } from '@/components/ui/PulseLogo'
import { useAccessibility } from '@/components/providers/AccessibilityProvider'

/** LocalStorage key for tracking onboarding completion */
const ONBOARDING_KEY = 'pulse_onboarding_completed'

interface TourStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Pulse',
    description:
      'Pulse helps you discover local businesses and see how your engagement strengthens your community. Every visit, review, and bookmark makes a difference!',
    icon: <PulseLogo className="h-6 w-6" />,
    color: 'bg-primary',
  },
  {
    id: 'discover',
    title: 'Discover Local Gems',
    description:
      'Browse AI-matched recommendations, filter by category, and find hidden treasures in your neighborhood. Enable location for the best experience.',
    icon: <MapPin className="h-6 w-6" />,
    color: 'bg-chart-2',
  },
  {
    id: 'impact',
    title: 'Track Your Impact',
    description:
      'See how much money you\'ve helped keep in your local economy. Your dashboard shows dollars kept local, businesses supported, and jobs impacted.',
    icon: <TrendingUp className="h-6 w-6" />,
    color: 'bg-chart-3',
  },
  {
    id: 'missions',
    title: 'Complete Missions',
    description:
      'Take on Boost Missions like "Try 3 new coffee shops this month" to earn perks and discover new favorites while supporting diverse businesses.',
    icon: <Trophy className="h-6 w-6" />,
    color: 'bg-chart-4',
  },
  {
    id: 'bookmarks',
    title: 'Save Your Favorites',
    description:
      'Bookmark businesses you love to get notified of new deals and easily find them again. Your personal list of local favorites!',
    icon: <Heart className="h-6 w-6" />,
    color: 'bg-chart-5',
  },
]

/**
 * Onboarding tour component for first-time users
 * Displays an interactive multi-step dialog introducing key features
 */
export function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [hasCompleted, setHasCompleted] = useState(true)
  const { announce } = useAccessibility()

  // Check if user has already completed onboarding
  useEffect(() => {
    // Guard for SSR/test environments where localStorage is not available
    if (typeof window === 'undefined' || !window.localStorage) {
      setHasCompleted(true) // Don't show tour in SSR/tests
      return
    }

    const completed = localStorage.getItem(ONBOARDING_KEY)
    if (!completed) {
      setHasCompleted(false)
      // Small delay for better UX after page load
      const timer = setTimeout(() => {
        setIsOpen(true)
        announce('Welcome to Pulse! An onboarding tour is available.', 'polite')
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [announce])

  const currentStepData = tourSteps[currentStep]
  const isLastStep = currentStep === tourSteps.length - 1

  /**
   * Handle advancing to next step or completing tour
   */
  const handleNext = () => {
    if (isLastStep) {
      handleComplete()
    } else {
      setCurrentStep((prev) => prev + 1)
      announce(
        `Step ${currentStep + 2} of ${tourSteps.length}: ${tourSteps[currentStep + 1].title}`,
        'polite'
      )
    }
  }

  /**
   * Mark onboarding as completed and close dialog
   */
  const handleComplete = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(ONBOARDING_KEY, 'true')
    }
    setHasCompleted(true)
    setIsOpen(false)
    announce('Onboarding complete! Enjoy exploring Pulse.', 'polite')
  }

  /**
   * Skip the entire tour
   */
  const handleSkip = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(ONBOARDING_KEY, 'true')
    }
    setHasCompleted(true)
    setIsOpen(false)
    announce('Onboarding skipped. You can access help anytime from the menu.', 'polite')
  }

  /**
   * Manually trigger the onboarding tour (for help menu)
   */
  const restartTour = useCallback(() => {
    localStorage.removeItem(ONBOARDING_KEY)
    setHasCompleted(false)
    setCurrentStep(0)
    setIsOpen(true)
    announce('Restarting onboarding tour', 'polite')
  }, [announce])

  // Export restart function globally for help menu access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      ;(window as Window & { restartPulseTour?: () => void }).restartPulseTour = restartTour
    }
  }, [restartTour])

  // Don't render if user has completed onboarding
  if (hasCompleted && !isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md" aria-describedby="tour-description">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4">
            <div className="h-16 w-16 rounded-2xl border border-primary/20 bg-primary/10 flex items-center justify-center mx-auto">
              <div className="text-primary">{currentStepData.icon}</div>
            </div>
          </div>
          <DialogTitle className="text-xl">{currentStepData.title}</DialogTitle>
          <DialogDescription id="tour-description" className="text-base mt-2">
            {currentStepData.description}
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicators */}
        <div className="flex justify-center gap-2 my-4" role="tablist" aria-label="Tour progress">
          {tourSteps.map((step, index) => (
            <button
              key={step.id}
              role="tab"
              aria-selected={index === currentStep}
              aria-label={`Step ${index + 1}: ${step.title}`}
              onClick={() => setCurrentStep(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentStep
                  ? 'w-6 bg-primary'
                  : index < currentStep
                    ? 'w-2 bg-primary/50'
                    : 'w-2 bg-muted'
              }`}
            />
          ))}
        </div>

        <DialogFooter className="flex justify-between items-center">
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            Skip tour
          </Button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep((prev) => prev - 1)}
              >
                Back
              </Button>
            )}
            <Button onClick={handleNext} className="gap-1">
              {isLastStep ? (
                <>
                  Get Started
                  <Check className="h-4 w-4" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { ONBOARDING_KEY }
