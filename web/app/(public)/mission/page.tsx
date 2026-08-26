'use client'

import { Heart, Users, TrendingUp, MapPin } from 'lucide-react'
import { AnimatedSection } from '@/components/features/home/AnimatedSection'

export default function MissionPage() {
  return (
    <div className="relative bg-background">
      {/* Hero */}
      <section className="relative border-b border-border/50 px-6 pt-16 pb-24 lg:pb-32">
        <div className="relative mx-auto max-w-4xl text-center">
          <AnimatedSection animation="fade-in" delay={0}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-sm text-muted-foreground">
              <Heart className="h-4 w-4 text-muted-foreground" />
              Our Mission
            </div>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={0.1}>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              The businesses near you, in one place
            </h1>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={0.2}>
            <p className="mt-8 text-lg leading-relaxed text-muted-foreground max-w-[68ch] mx-auto">
              Pulse lists the shops, restaurants, and services around you, and keeps a
              running record of what your spending leaves in town.
            </p>
          </AnimatedSection>

        </div>
      </section>

      {/* What We Do */}
      <section className="relative px-6 py-24 lg:py-32">
        <div className="mx-auto max-w-6xl">
          <AnimatedSection animation="fade-up">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Our Approach</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                What We Do
              </h2>
            </div>
          </AnimatedSection>

          <div className="grid gap-8 sm:grid-cols-3">
            <MissionCard3D
              icon={<MapPin className="h-8 w-8" />}
              title="Discover"
              description="Search by neighborhood, category, or what is open right now. Coffee shops, boutiques, repair counters, and the places a chain search never returns."
              delay={0.1}
            />
            <MissionCard3D
              icon={<TrendingUp className="h-8 w-8" />}
              title="Impact"
              description="See what your spending keeps nearby. Check-ins and claimed deals add up to a plain total of money that stayed in your area."
              delay={0.2}
            />
            <MissionCard3D
              icon={<Users className="h-8 w-8" />}
              title="Connect"
              description="Reviews, check-ins, and missions let you tell the next person what is worth a visit, and let owners answer back."
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* Where the money goes */}
      <section className="relative border-t border-border/50 px-6 py-24 lg:py-32">
        <div className="relative mx-auto max-w-3xl text-center">
          <AnimatedSection animation="fade-up">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-6">
              <Heart className="h-8 w-8 text-muted-foreground" />
            </div>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={0.1}>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-8">
              Where Your Money Goes
            </h2>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={0.2}>
            <p className="mx-auto max-w-[68ch] text-lg leading-relaxed text-muted-foreground">
              Small businesses hold up the local economy. Money spent at a shop down the
              street pays wages and rent in your area, and the owner is someone you can
              find behind the counter.
            </p>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={0.3}>
            <p className="mx-auto mt-6 max-w-[68ch] text-lg leading-relaxed text-muted-foreground">
              Every check-in, review, and bookmark on Pulse makes one of those businesses
              easier for the next person to find.
            </p>
          </AnimatedSection>

        </div>
      </section>
    </div>
  )
}

function MissionCard3D({
  icon,
  title,
  description,
  delay,
}: {
  icon: React.ReactNode
  title: string
  description: string
  delay: number
}) {
  return (
    <AnimatedSection animation="fade-up" delay={delay}>
      <div className="group relative h-full rounded-lg border border-border/50 bg-card p-8">
        {/* Content */}
        <div className="relative">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {icon}
          </div>
          <h3 className="mb-3 text-xl font-bold text-card-foreground">{title}</h3>
          <p className="max-w-[68ch] text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
    </AnimatedSection>
  )
}
