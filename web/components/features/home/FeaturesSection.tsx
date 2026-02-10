'use client'

import { BookOpen, Play, Bot } from "lucide-react"
import { AnimatedSection } from "@/components/features/home/AnimatedSection"

const features = [
  {
    icon: BookOpen,
    title: "Structured Modules",
    description:
      "Six comprehensive modules covering everything from basic flight principles to advanced rocket construction.",
  },
  {
    icon: Play,
    title: "Visual Simulations",
    description:
      "Interactive animations that bring rocket science concepts to life with real-time physics demonstrations.",
  },
  {
    icon: Bot,
    title: "AI Tutor",
    description:
      "Get your questions answered instantly with our AI-powered tutor that explains complex aerospace concepts.",
  },
]

export function FeaturesSection() {
  return (
    <section className="relative px-6 py-24">
      <div className="mx-auto max-w-6xl">
        {/* Section header */}
        <AnimatedSection animation="fade-up">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything you need to learn rocket science
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Our platform combines structured learning with interactive tools to make aerospace education accessible to everyone.
            </p>
          </div>
        </AnimatedSection>

        {/* Feature cards grid */}
        <div className="grid gap-8 md:grid-cols-3">
          {features.map((feature, index) => (
            <AnimatedSection
              key={feature.title}
              animation="fade-up"
              delay={0.1 * (index + 1)}
            >
              <div className="group relative rounded-2xl border border-border/50 bg-card/50 p-8 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:bg-card/80 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5">
                {/* Icon */}
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                  <feature.icon className="h-6 w-6" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  )
}
