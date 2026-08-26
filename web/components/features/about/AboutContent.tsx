'use client'

import { FounderCard } from './FounderCard'
import type { Founder } from './FounderCard'
import { AnimatedSection } from '@/components/features/home/AnimatedSection'

interface AboutContentProps {
  founders: Founder[]
  isAdmin: boolean
}

export function AboutContent({ founders }: AboutContentProps) {
  return (
    <div className="mx-auto max-w-6xl px-6 pb-20 pt-8 sm:pt-12">
      {/* Hero */}
      <section aria-labelledby="about-heading" className="border-b border-border pb-12">
        <AnimatedSection animation="fade-up">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            About Pulse
          </p>
          <h1
            id="about-heading"
            className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
          >
            Meet the Team
          </h1>
        </AnimatedSection>

        <AnimatedSection animation="fade-up" delay={0.08}>
          <p className="mt-6 max-w-[68ch] text-lg leading-8 text-muted-foreground">
            The people building Pulse, and the reason we started it.
          </p>
        </AnimatedSection>
      </section>

      {/* Founders */}
      <section aria-label="The founders" className="pt-12">
        <AnimatedSection animation="fade-up">
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              The Founders
            </p>
            <p
              className="font-mono text-xs text-muted-foreground"
              aria-label={`${founders.length} founders`}
            >
              {String(founders.length).padStart(2, '0')}
            </p>
          </div>
        </AnimatedSection>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {founders.map((founder, i) => (
            <FounderCard key={founder.id} founder={founder} index={i} />
          ))}
        </div>
      </section>

      {/* Our Story */}
      <section aria-labelledby="story-heading" className="mt-16 border-t border-border pt-12">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <AnimatedSection animation="fade-up">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Our Story
              </p>
              <h2
                id="story-heading"
                className="mt-4 max-w-md text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
              >
                Why We Started Pulse
              </h2>
            </div>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={0.08}>
            <div className="max-w-[68ch] space-y-6 text-base leading-7 text-muted-foreground">
              <p>
                We started Pulse because the shops, restaurants, and services on our own street
                were hard to find online. Search results led to chains a few towns over, and the
                place two doors down had no hours listed anywhere.
              </p>
              <p>
                Pulse has a clear goal: make local businesses easy to find and easy to support.
                Hours, ratings, and current deals in one list, plus a plain record of what your
                spending kept nearby. No account required to browse.
              </p>
              <p>
                Owners can claim a listing, post deals, and answer reviews. Everyone else can
                browse, check in, and leave a note about what was worth the trip.
              </p>
              <div className="flex items-center gap-3 pt-2 text-sm">
                <span className="h-px w-8 bg-border" aria-hidden="true" />
                <span>Local discovery, kept simple</span>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  )
}
