import { AnimatedSection } from '@/components/features/home/AnimatedSection'
import { Users, Mail, ArrowRight, CheckCircle } from 'lucide-react'
import { NavLink } from '@/components/ui/nav-link'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-static'
export const revalidate = 3600

const opportunities = [
  {
    title: 'Community Ambassador',
    description: 'Help spread the word about Pulse and encourage local businesses and residents to join the platform.',
  },
  {
    title: 'Local Business Outreach',
    description: 'Visit local businesses, help them create listings, and explain how Pulse drives foot traffic to their doors.',
  },
  {
    title: 'Content & Reviews',
    description: 'Write thoughtful reviews, take photos, and help build a rich directory that makes it easy to discover great local spots.',
  },
  {
    title: 'Event Coordination',
    description: 'Organize "Shop Local" events, business crawls, and community meetups that bring neighbors and businesses together.',
  },
]

export default function VolunteerPage() {
  return (
    <div className="relative">
      <main className="pb-24 px-6">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-16 text-center">
            <AnimatedSection animation="fade-up">
              <h1 className="text-2xl font-semibold tracking-tight">
                Volunteer
              </h1>
            </AnimatedSection>
            <AnimatedSection animation="fade-up" delay={0.2}>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                Help strengthen your local economy by connecting community members
                with the businesses that make your neighborhood unique.
              </p>
            </AnimatedSection>
          </div>

          {/* Opportunities */}
          <AnimatedSection animation="fade-up" delay={0.3}>
            <div className="grid gap-6 sm:grid-cols-2 mb-16">
              {opportunities.map((opportunity) => (
                <div
                  key={opportunity.title}
                  className="rounded-lg border border-border bg-card p-6 transition-colors duration-150 hover:border-primary/20"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">
                        {opportunity.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {opportunity.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AnimatedSection>

          {/* CTA */}
          <AnimatedSection animation="fade-up" delay={0.4}>
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                Ready to Make a Difference?
              </h2>
              <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                Tell us about yourself and how you&apos;d like to help your local community.
                We&apos;d love to have you on board!
              </p>
              <NavLink href="/about">
                <Button size="lg" className="gap-2">
                  Learn More
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </NavLink>
            </div>
          </AnimatedSection>
        </div>
      </main>
    </div>
  )
}
