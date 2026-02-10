'use client'

import { Rocket, Target, Users, GraduationCap, Sparkles, Zap, Globe } from 'lucide-react'
import { AnimatedSection } from '@/components/features/home/AnimatedSection'
import { SpaceBackground } from '@/components/features/home/SpaceBackground'
import { MiniRocket } from '@/components/features/home/RocketIcon'
import { useEffect, useState } from 'react'

export default function MissionPage() {
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = docHeight > 0 ? scrollY / docHeight : 0
      setScrollProgress(progress)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="relative overflow-hidden">
      <SpaceBackground />

      {/* Scroll-following rocket */}
      <div
        className="fixed right-8 top-1/2 -translate-y-1/2 z-50 hidden lg:block transition-all duration-300"
        style={{
          transform: `translateY(${(scrollProgress - 0.5) * 400}px)`,
        }}
      >
        <MiniRocket progress={scrollProgress} />
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/50 px-6 pt-16 pb-24 lg:pb-32">
        <div className="relative mx-auto max-w-4xl text-center">
          <AnimatedSection animation="fade-in" delay={0}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur-sm">
              <Rocket className="h-4 w-4 text-primary" />
              Our Mission
            </div>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={0.1}>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Inspiring the Next Generation of{' '}
              <span className="relative">
                <span className="bg-gradient-to-r from-primary via-chart-3 to-chart-2 bg-clip-text text-transparent">
                  Rocket Scientists
                </span>
                <span className="absolute -bottom-2 left-0 right-0 h-1 rounded-full bg-gradient-to-r from-primary/60 via-chart-3/60 to-chart-2/60 blur-sm" />
              </span>
            </h1>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={0.2}>
            <p className="mt-8 text-lg leading-relaxed text-muted-foreground max-w-2xl mx-auto">
              Max Apogee is a non-profit organization on a mission to make aerospace
              education accessible, engaging, and hands-on for every student — regardless
              of background or experience.
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
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Our Approach</span>
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                What We Do
              </h2>
            </div>
          </AnimatedSection>

          <div className="grid gap-8 sm:grid-cols-3">
            <MissionCard3D
              icon={<GraduationCap className="h-8 w-8" />}
              title="Teach"
              description="We create free, interactive online lessons that break down complex rocket science into concepts anyone can understand — from thrust and drag to orbital mechanics."
              delay={0.1}
              color="from-primary/20 to-primary/5"
              iconAnimation="pulse"
            />
            <MissionCard3D
              icon={<Rocket className="h-8 w-8" />}
              title="Build"
              description="We run hands-on workshops where students design, build, and launch real model rockets, turning classroom theory into tangible engineering experience."
              delay={0.2}
              color="from-chart-2/20 to-chart-2/5"
              iconAnimation="launch"
            />
            <MissionCard3D
              icon={<Users className="h-8 w-8" />}
              title="Connect"
              description="We bring together students who share a passion for space and engineering, building a community that supports each other from first launch to competition."
              delay={0.3}
              color="from-chart-3/20 to-chart-3/5"
              iconAnimation="wave"
            />
          </div>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="relative border-t border-border/50 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 sm:grid-cols-3">
            <StatCard
              icon={<Zap className="h-6 w-6" />}
              value="6"
              label="Interactive Modules"
              delay={0.1}
            />
            <StatCard
              icon={<Globe className="h-6 w-6" />}
              value="∞"
              label="Open Access"
              delay={0.2}
            />
            <StatCard
              icon={<Rocket className="h-6 w-6" />}
              value="100%"
              label="Hands-On Learning"
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* Why It Matters */}
      <section className="relative px-6 py-24 lg:py-32 overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-3xl text-center">
          <AnimatedSection animation="fade-up">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <Target className="h-8 w-8 text-primary" />
            </div>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={0.1}>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-8">
              Why It Matters
            </h2>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={0.2}>
            <div className="relative">
              {/* Animated quote marks */}
              <div className="absolute -top-4 -left-4 text-6xl text-primary/20 font-serif animate-pulse-soft">&ldquo;</div>
              <div className="absolute -bottom-8 -right-4 text-6xl text-primary/20 font-serif animate-pulse-soft [animation-delay:1s]">&rdquo;</div>

              <p className="text-lg leading-relaxed text-muted-foreground">
                Aerospace inspires like nothing else. When a student watches a rocket they
                built leave the pad, something clicks — physics stops being abstract and
                becomes real. We believe that spark can set a student on a path toward
                engineering, science, or any field that demands creative problem-solving.
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={0.3}>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              Every lesson we publish and every rocket we help launch is a step toward a
              future where more young people see themselves as builders, thinkers, and
              explorers.
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
  color?: string
  iconAnimation?: 'pulse' | 'launch' | 'wave'
}) {
  return (
    <AnimatedSection animation="fade-up" delay={delay}>
      <div className="group relative h-full rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-8 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
        {/* Content */}
        <div className="relative">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary/15">
            {icon}
          </div>
          <h3 className="mb-3 text-xl font-bold text-card-foreground">{title}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
    </AnimatedSection>
  )
}

function StatCard({
  icon,
  value,
  label,
  delay,
}: {
  icon: React.ReactNode
  value: string
  label: string
  delay: number
}) {
  return (
    <AnimatedSection animation="scale-in" delay={delay}>
      <div className="group text-center p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm transition-colors duration-300 hover:border-primary/20">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
          {icon}
        </div>
        <div className="text-4xl font-bold text-foreground mb-2">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </AnimatedSection>
  )
}


