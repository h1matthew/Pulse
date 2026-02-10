'use client'

import Image from 'next/image'
import { Rocket, Heart, Sparkles } from 'lucide-react'
import { FounderCard } from './FounderCard'
import { EditableFounderCard } from './EditableFounderCard'
import type { Founder } from './FounderCard'
import { AnimatedSection } from '@/components/features/home/AnimatedSection'
import { FloatingElement } from '@/components/features/home/FloatingElement'
import { OrbitSystem } from '@/components/features/home/OrbitRing'
import { StaticStarField } from '@/components/features/home/StarField'

interface AboutContentProps {
  founders: Founder[]
  isAdmin: boolean
}

export function AboutContent({ founders, isAdmin }: AboutContentProps) {
  return (
    <div className="relative mx-auto max-w-5xl px-6 pt-16 pb-16">
      {/* Background stars */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <StaticStarField density="low" />
      </div>

      {/* Decorative orbit */}
      <div className="absolute -right-40 top-40 opacity-30 hidden xl:block">
        <OrbitSystem
          rings={[
            { radius: 60, duration: 20, particleCount: 2, color: 'oklch(0.65 0.2 250 / 0.4)', direction: 'clockwise' as const },
            { radius: 100, duration: 30, particleCount: 3, color: 'oklch(0.7 0.15 195 / 0.3)', direction: 'counterclockwise' as const },
          ]}
        />
      </div>

      {/* Hero */}
      <div className="mb-20 text-center">
        <AnimatedSection animation="fade-in-down">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm backdrop-blur-sm">
            <Rocket className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">The team behind Max Apogee</span>
          </div>
        </AnimatedSection>

        <AnimatedSection animation="fade-in-up">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Meet the{' '}
            <span className="bg-gradient-to-r from-primary via-chart-3 to-chart-2 bg-clip-text text-transparent">
              Founders
            </span>
          </h1>
        </AnimatedSection>

        <AnimatedSection animation="fade-in-up" delay={0.15}>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Three students on a mission to make rocket science accessible to everyone.
          </p>
        </AnimatedSection>
      </div>

      {/* Founders Grid with 3D effects */}
      <div className="grid gap-10 sm:grid-cols-3">
        {founders.map((founder, i) =>
          isAdmin ? (
            <EditableFounderCard key={founder.id} founder={founder} index={i} />
          ) : (
            <FounderCard3D key={founder.id} founder={founder} index={i} />
          )
        )}
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
            <div className="absolute top-8 right-8 hidden lg:block">
              <FloatingElement amplitude={10} duration={4}>
                <Sparkles className="h-6 w-6 text-primary/40" />
              </FloatingElement>
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
                    Max Apogee
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
                    We started Max Apogee because we believe every student deserves the chance to
                    look up at the sky and understand the science that takes us there. Rocket science
                    often feels out of reach. It is usually buried in heavy textbooks or locked behind
                    expensive programs. We wanted to change that.
                  </p>
                </div>
              </AnimatedSection>

              <AnimatedSection animation="fade-up" delay={0.7}>
                <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                  Our nonprofit has a clear goal. We want to inspire the next generation of rocket
                  scientists through free online lessons and hands-on projects. We help students
                  build and launch real model rockets. There are no paywalls and no barriers. We
                  just ask for your curiosity.
                </p>
              </AnimatedSection>

              <AnimatedSection animation="fade-up" delay={0.8}>
                <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                  Whether you dream of working at NASA or SpaceX, or you just want to understand
                  how a rocket flies, Max Apogee is here to help you reach your highest point.
                </p>
              </AnimatedSection>

              {/* Decorative element */}
              <AnimatedSection animation="fade-up" delay={0.9}>
                <div className="mt-10 flex justify-center">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="h-px w-8 bg-primary/30" />
                    <span>Reach for the stars</span>
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

// Enhanced FounderCard with 3D tilt and hover reveal
interface FounderCard3DProps {
  founder: Founder
  index: number
}

function FounderCard3D({ founder, index }: FounderCard3DProps) {
  const imageSrc = founder.image_url || `/founders/${founder.id}.png`
  const zoom = founder.image_zoom || 1

  return (
    <AnimatedSection animation="fade-up" delay={0.1 + index * 0.15}>
      <div className="group relative flex flex-col items-center text-center">
        {/* 3D Photo container */}
        <div className="relative mb-6 perspective-1000">
          {/* Orbital ring decoration */}
          <div className="absolute -inset-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="w-full h-full rounded-full border border-dashed border-primary/20 animate-orbit-rotate" />
          </div>

          {/* Glow ring behind image */}
          <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-primary/20 via-chart-3/20 to-chart-2/20 opacity-0 blur-md transition-all duration-500 group-hover:opacity-100 group-hover:scale-110" />

          {/* Photo with 3D tilt effect */}
          <div
            className="relative h-44 w-44 overflow-hidden rounded-full border-2 border-border/50 bg-muted transition-all duration-500 group-hover:border-primary/30 group-hover:shadow-xl group-hover:shadow-primary/10"
            style={{
              transform: 'translateZ(0)',
              transition: 'transform 0.3s ease-out',
            }}
          >
            {/* Image with zoom/offset support */}
            <div
              className="w-full h-full transition-transform duration-500 group-hover:scale-105"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: `${founder.image_offset_x}% ${founder.image_offset_y}%`,
              }}
            >
              <Image
                src={imageSrc}
                alt={`Photo of ${founder.name}`}
                width={200}
                height={200}
                className="h-full w-full object-cover"
              />
            </div>

            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-primary/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>

          {/* Floating badge */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
            <div className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-lg">
              {founder.role}
            </div>
          </div>
        </div>

        {/* Name and bio with staggered reveal */}
        <h2 className="text-xl font-bold text-foreground transition-colors group-hover:text-primary">
          {founder.name}
        </h2>

        {/* Bio with slide animation */}
        <div className="mt-3 overflow-hidden">
          <p className="text-sm leading-relaxed text-muted-foreground transition-transform duration-300 group-hover:translate-y-0">
            {founder.bio}
          </p>
        </div>

        {/* Decorative line */}
        <div className="mt-4 h-0.5 w-12 bg-gradient-to-r from-primary to-chart-2 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
      </div>
    </AnimatedSection>
  )
}
