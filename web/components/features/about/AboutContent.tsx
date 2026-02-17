'use client'

import { Heart, Sparkles, Store } from 'lucide-react'
import { FounderCard } from './FounderCard'
import type { Founder } from './FounderCard'
import { AnimatedSection } from '@/components/features/home/AnimatedSection'

interface AboutContentProps {
  founders: Founder[]
  isAdmin: boolean
}

export function AboutContent({ founders }: AboutContentProps) {
  return (
    <div className="relative mx-auto max-w-5xl px-6 pt-16 pb-16">
      {/* Hero */}
      <div className="mb-20 text-center">
        <AnimatedSection animation="fade-in-down">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm backdrop-blur-sm">
            <Store className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">The team behind Pulse</span>
          </div>
        </AnimatedSection>

        <AnimatedSection animation="fade-in-up">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Meet the{' '}
            <span className="bg-gradient-to-r from-primary via-chart-3 to-chart-2 bg-clip-text text-transparent">
              Team
            </span>
          </h1>
        </AnimatedSection>

        <AnimatedSection animation="fade-in-up" delay={0.15}>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            A passionate team on a mission to strengthen local communities through business discovery.
          </p>
        </AnimatedSection>
      </div>

      {/* Founders Grid - Simple */}
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
        {founders.map((founder, i) => (
          <FounderCard key={founder.id} founder={founder} index={i} />
        ))}
      </div>

      {/* Why We Started - Enhanced */}
      <div className="mt-24">
        <AnimatedSection animation="fade-up" delay={0.3}>
          <div className="relative rounded-2xl border border-border/50 bg-card p-10 sm:p-14 overflow-hidden">
            {/* Decorative background */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-chart-2/5 rounded-full blur-3xl" />
            </div>

            {/* Floating decorations */}
            <div className="absolute top-8 right-8 hidden lg:block animate-float">
              <Sparkles className="h-6 w-6 text-primary/40" />
            </div>

            <div className="relative mx-auto max-w-3xl text-center">
              <AnimatedSection animation="scale-in" delay={0.4}>
                <div className="mb-6 inline-flex items-center justify-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                  <Heart className="h-4 w-4 animate-pulse-soft" />
                  Our Story
                </div>
              </AnimatedSection>

              <AnimatedSection animation="fade-up" delay={0.5}>
                <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Why We Started{' '}
                  <span className="bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                    Pulse
                  </span>
                </h2>
              </AnimatedSection>

              <AnimatedSection animation="fade-up" delay={0.6}>
                <div className="relative mt-8">
                  {/* Animated quote marks */}
                  <div className="absolute -top-4 -left-4 text-6xl text-primary/10 font-serif animate-pulse-soft">
                    &ldquo;
                  </div>
                  <div className="absolute -bottom-8 -right-4 text-6xl text-primary/10 font-serif animate-pulse-soft [animation-delay:1s]">
                    &rdquo;
                  </div>

                  <p className="text-lg leading-relaxed text-muted-foreground">
                    We started Pulse because we believe local businesses are the heartbeat of
                    our communities. Every neighborhood has unique shops, restaurants, and services
                    that give it character — but too often, these gems go undiscovered while
                    big chains dominate the conversation.
                  </p>
                </div>
              </AnimatedSection>

              <AnimatedSection animation="fade-up" delay={0.7}>
                <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                    Pulse has a clear goal: make it easy to discover and support local businesses.
                    We want to show you the impact your choices make — how every dollar spent
                    locally circulates through your community, supporting jobs and creating
                    vibrant neighborhoods. No barriers, no gatekeeping — just a simple way to
                    keep your community thriving.
                </p>
              </AnimatedSection>

              <AnimatedSection animation="fade-up" delay={0.8}>
                <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                  Whether you are a local business owner looking to connect with customers,
                  or a community member who wants to make a difference with your spending,
                  Pulse is here to help you power the heart of local business.
                </p>
              </AnimatedSection>

              {/* Decorative element */}
              <AnimatedSection animation="fade-up" delay={0.9}>
                <div className="mt-10 flex justify-center">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="h-px w-8 bg-primary/30" />
                    <span>Power the heart of your community</span>
                    <span className="h-px w-8 bg-primary/30" />
                  </div>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </div>
  )
}
