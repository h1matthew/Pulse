import { Heart } from 'lucide-react'
import { AnimatedSection } from '../AnimatedSection'
import { MissionStatement } from './MissionStatement'
import { PartnerLogos } from './PartnerLogos'
import { SupportCTA } from './SupportCTA'
import { Socials } from './Socials'

export function NonProfitSection() {
  return (
    <section className="relative px-6 py-24">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <AnimatedSection animation="fade-up">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary">
              <Heart className="h-4 w-4" />
              A non-profit mission
            </div>
          </AnimatedSection>
          <AnimatedSection animation="fade-up" delay={0.1}>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              <span className="bg-linear-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                Inspiring Future Rocket Scientists
              </span>
            </h2>
          </AnimatedSection>
        </div>

        {/* Mission Statement */}
        <AnimatedSection animation="fade-up" delay={0.2}>
          <div className="mx-auto max-w-3xl mb-16">
            <MissionStatement />
          </div>
        </AnimatedSection>

        {/* Partners */}
        <AnimatedSection animation="fade-up" delay={0.3}>
          <PartnerLogos className="mb-16" />
        </AnimatedSection>

        {/* Support CTA */}
        <AnimatedSection animation="fade-up" delay={0.4}>
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-foreground mb-2">
              Get Involved
            </h3>
            <p className="text-muted-foreground">
              Help us make aerospace education accessible to everyone.
            </p>
          </div>
          <SupportCTA />
        </AnimatedSection>

        {/* Socials */}
        <AnimatedSection animation="fade-up" delay={0.5}>
          <Socials className="mt-12" />
        </AnimatedSection>
      </div>
    </section>
  )
}
