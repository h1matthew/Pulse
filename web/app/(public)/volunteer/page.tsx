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
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                Volunteer
              </div>
            </AnimatedSection>
            <AnimatedSection animation="fade-up" delay={0.1}>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Join Our Team
              </h1>
            </AnimatedSection>
            <AnimatedSection animation="fade-up" delay={0.2}>
              <p className="mt-4 text-lg text-muted-foreground max-w-[68ch] mx-auto">
                Help the businesses around you get listed, reviewed, and found.
              </p>
            </AnimatedSection>
          </div>

          {/* Opportunities */}
          <AnimatedSection animation="fade-up" delay={0.3}>
            <div className="grid gap-6 sm:grid-cols-2 mb-16">
              {opportunities.map((opportunity) => (
                <div
                  key={opportunity.title}
                  className="rounded-lg border border-border/50 bg-card p-6"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">
                        {opportunity.title}
                      </h3>
                      <p className="max-w-[68ch] text-sm text-muted-foreground">
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
            <div className="rounded-lg border border-border/50 bg-card p-8 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
                <Mail className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                Tell Us How You Want to Help
              </h2>
              <p className="text-muted-foreground mb-6 max-w-[68ch] mx-auto">
                Send a short note about the work you want to take on and the area you
                cover. We will follow up with next steps.
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
