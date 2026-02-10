import { AnimatedSection } from '@/components/features/home/AnimatedSection'
import { SpaceBackground } from '@/components/features/home/SpaceBackground'
import { Users, Mail, ArrowRight, CheckCircle } from 'lucide-react'
import { NavLink } from '@/components/ui/nav-link'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-static'
export const revalidate = 3600

const opportunities = [
  {
    title: 'Content Creation',
    description: 'Help create lessons, quizzes, and educational materials about rocket science.',
  },
  {
    title: 'Workshop Instruction',
    description: 'Lead or assist in hands-on model rocket building workshops for students.',
  },
  {
    title: 'Technical Development',
    description: 'Contribute to our platform, simulations, and interactive tools.',
  },
  {
    title: 'Community Outreach',
    description: 'Help spread the word and connect with schools and organizations.',
  },
]

export default function VolunteerPage() {
  return (
    <div className="relative">
      <SpaceBackground />

      <main className="pb-24 px-6">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-16 text-center">
            <AnimatedSection animation="fade-up">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary">
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
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                Share your passion for aerospace education and help inspire the next 
                generation of rocket scientists.
              </p>
            </AnimatedSection>
          </div>

          {/* Opportunities */}
          <AnimatedSection animation="fade-up" delay={0.3}>
            <div className="grid gap-6 sm:grid-cols-2 mb-16">
              {opportunities.map((opportunity) => (
                <div
                  key={opportunity.title}
                  className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 transition-colors duration-300 hover:border-primary/20"
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
            <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-8 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                Ready to Make a Difference?
              </h2>
              <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                Send us an email telling us about yourself and how you&apos;d like to contribute. 
                We&apos;d love to have you on board!
              </p>
              <NavLink href="mailto:contact@maxapogee.org?subject=Volunteer%20Application">
                <Button size="lg" className="gap-2">
                  Contact Us
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
