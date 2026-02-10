import { AnimatedSection } from '@/components/features/home/AnimatedSection'
import { PartnerLogos } from '@/components/features/home/nonprofit/PartnerLogos'
import { Socials } from '@/components/features/home/nonprofit/Socials'
import { MissionStatement } from '@/components/features/home/nonprofit/MissionStatement'
import { SpaceBackground } from '@/components/features/home/SpaceBackground'
import { Heart, Users, ArrowRight } from 'lucide-react'
import { NavLink } from '@/components/ui/nav-link'

export const dynamic = 'force-static'
export const revalidate = 3600 // Revalidate every hour

export default function GetInvolvedPage() {
  return (
    <div className="relative">
      <SpaceBackground />

      <main className="pt-16 pb-24 px-6">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-16 text-center">
            <AnimatedSection animation="fade-up">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary">
                <Heart className="h-4 w-4" />
                Get Involved
              </div>
            </AnimatedSection>
            <AnimatedSection animation="fade-up" delay={0.1}>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                <span className="bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                  Inspiring Future Rocket Scientists
                </span>
              </h1>
            </AnimatedSection>
            <AnimatedSection animation="fade-up" delay={0.2}>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                Join us in making aerospace education accessible to students worldwide.
                There are many ways to contribute to our mission.
              </p>
            </AnimatedSection>
          </div>

          {/* Mission Statement */}
          <AnimatedSection animation="fade-up" delay={0.3}>
            <div className="mx-auto max-w-3xl mb-20">
              <MissionStatement />
            </div>
          </AnimatedSection>

          {/* Volunteer CTA */}
          <AnimatedSection animation="fade-up" delay={0.4}>
            <div className="mx-auto max-w-xl mb-20">
              <NavLink href="/volunteer" className="block">
                <div className="group rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-8 transition-colors duration-300 hover:border-primary/20">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary/15">
                    <Users className="h-8 w-8" />
                  </div>
                  <h2 className="mb-3 text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                    Volunteer With Us
                  </h2>
                  <p className="mb-6 text-muted-foreground leading-relaxed">
                    Share your expertise and help create content for future rocket scientists.
                    Whether you&apos;re an educator, engineer, or space enthusiast, your skills
                    can help inspire the next generation.
                  </p>
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    Learn More
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </NavLink>
            </div>
          </AnimatedSection>

          {/* Partner Logos Section */}
          <AnimatedSection animation="fade-up" delay={0.5}>
            <PartnerLogos className="mb-16" />
          </AnimatedSection>

          {/* Socials */}
          <AnimatedSection animation="fade-up" delay={0.6}>
            <Socials />
          </AnimatedSection>
        </div>
      </main>
    </div>
  )
}
