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
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            A passionate team on a mission to strengthen local communities through business
            discovery.
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
            <div className="max-w-2xl space-y-6 text-base leading-7 text-muted-foreground">
              <p>
                We started Pulse because we believe local businesses are the heartbeat of our
                communities. Every neighborhood has unique shops, restaurants, and services that
                give it character &mdash; but too often, these gems go undiscovered while big
                chains dominate the conversation.
              </p>
              <p>
                Pulse has a clear goal: make it easy to discover and support local businesses. We
                want to show you the impact your choices make &mdash; how every dollar spent
                locally circulates through your community, supporting jobs and creating vibrant
                neighborhoods. No barriers, no gatekeeping &mdash; just a simple way to keep your
                community thriving.
              </p>
              <p>
                Whether you are a local business owner looking to connect with customers, or a
                community member who wants to make a difference with your spending, Pulse is here
                to help you power the heart of local business.
              </p>
              <div className="flex items-center gap-3 pt-2 text-sm">
                <span className="h-px w-8 bg-border" aria-hidden="true" />
                <span>Power the heart of your community</span>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  )
}
