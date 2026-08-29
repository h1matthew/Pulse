'use client'

import { FounderCard } from './FounderCard'
import type { Founder } from './FounderCard'
import { NavLink } from '@/components/ui/nav-link'

interface AboutContentProps {
  founders: Founder[]
  isAdmin: boolean
  /** Live row counts; null when the query failed or returned nothing. */
  businessCount?: number | null
  reviewCount?: number | null
}

export function AboutContent({ founders, businessCount, reviewCount }: AboutContentProps) {
  const counters: { value: number; label: string }[] = []
  if (typeof businessCount === 'number' && businessCount > 0) {
    counters.push({ value: businessCount, label: 'businesses listed' })
  }
  if (typeof reviewCount === 'number' && reviewCount > 0) {
    counters.push({ value: reviewCount, label: 'reviews on file' })
  }

  return (
    <div className="mx-auto max-w-content px-6 pt-16 pb-24">
      <section aria-labelledby="about-heading" className="max-w-prose">
        <h1 id="about-heading" className="text-h1 font-medium text-foreground">
          What Pulse is
        </h1>
        <p className="mt-5 text-lead text-muted-foreground">
          A directory of the shops, restaurants, and services near you: hours, ratings,
          current deals, and a running figure for what your spending kept in the area.
          Browsing takes no account.
        </p>

        {counters.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-x-12 gap-y-4">
            {counters.map((counter) => (
              <div key={counter.label}>
                <p className="font-mono text-h2 font-medium text-foreground">
                  {counter.value.toLocaleString()}
                </p>
                <p className="meta mt-1">{counter.label}</p>
              </div>
            ))}
          </div>
        )}

        <p className="mt-8 text-body text-muted-foreground">
          The rules the directory runs on, including the one number in it we cannot
          source, are on{' '}
          <NavLink
            href="/mission"
            className="text-foreground underline underline-offset-4 hover:text-primary"
          >
            How we pick
          </NavLink>
          .
        </p>
      </section>

      <section aria-label="The founders" className="mt-16 border-t border-border pt-12">
        <div className="flex items-baseline justify-between">
          <h2 className="text-h2 font-medium text-foreground">Founders</h2>
          <p className="meta" aria-label={`${founders.length} founders`}>
            {String(founders.length).padStart(2, '0')}
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {founders.map((founder, i) => (
            <FounderCard key={founder.id} founder={founder} index={i} />
          ))}
        </div>
      </section>

      <section
        aria-labelledby="story-heading"
        className="mt-16 max-w-prose border-t border-border pt-12"
      >
        <h2 id="story-heading" className="text-h2 font-medium text-foreground">
          Why we started
        </h2>
        <div className="mt-5 space-y-4 text-body text-muted-foreground">
          <p>
            The shops on our own street were hard to find online. Search returned chains a
            few towns over, and the place two doors down had its hours listed nowhere.
          </p>
          <p>
            So Pulse lists them anyway, whether or not the owner has heard of us. An owner
            who claims a listing can fix the hours, post a deal, and answer a review.
            Everyone else can browse, check in with a receipt, and say what was worth the
            trip.
          </p>
        </div>
      </section>
    </div>
  )
}
