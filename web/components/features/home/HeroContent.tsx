'use client'

import { Button } from "@/components/ui/button"
import { ArrowRight, PlayCircle, LayoutDashboard } from "lucide-react"
import { NavLink } from "@/components/ui/nav-link"
import { AnimatedSection } from "@/components/features/home/AnimatedSection"
import { LaunchButton } from "@/components/features/home/LaunchButton"
import { useAuth } from "@/components/providers/AuthProvider"

export function HeroContent() {
  const { isLoggedIn } = useAuth()
  return (
    <div className="relative z-10 max-w-3xl text-center">
      {/* Announcement badge */}
      <AnimatedSection animation="fade-in" delay={0}>
        <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/5 px-5 py-2 text-sm backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <span className="text-muted-foreground">
            Free rocket science education for everyone
          </span>
        </div>
      </AnimatedSection>

      {/* Main heading */}
      <AnimatedSection animation="fade-up" delay={0.1}>
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
          <span className="text-foreground">Learn </span>
          <span className="relative">
            <span className="bg-gradient-to-r from-primary via-chart-3 to-chart-2 bg-clip-text text-transparent">
              Rocket Science
            </span>
            {/* Gradient underline accent */}
            <span className="absolute -bottom-2 left-0 right-0 h-1 rounded-full bg-gradient-to-r from-primary/60 via-chart-3/60 to-chart-2/60 blur-sm" />
          </span>
        </h1>
      </AnimatedSection>

      {/* Subheading */}
      <AnimatedSection animation="fade-up" delay={0.2}>
        <p className="mt-8 text-lg leading-relaxed text-muted-foreground sm:text-xl lg:text-2xl">
          From how rockets fly to building your own — master aerospace engineering
          through interactive lessons and animated simulations.
        </p>
      </AnimatedSection>

      {/* CTA buttons */}
      <AnimatedSection animation="fade-up" delay={0.3}>
        <div className="mt-12 flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
          <NavLink href="/learn">
            <LaunchButton>
              {isLoggedIn ? "Continue Learning" : "Start Learning"}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </LaunchButton>
          </NavLink>

          {isLoggedIn ? (
            <NavLink href="/dashboard">
              <Button
                variant="outline"
                size="lg"
                className="h-12 px-8 text-base font-medium border-border/60 bg-background/50 backdrop-blur-sm hover:bg-accent/50 hover:border-primary/30 transition-all duration-300 group"
              >
                <LayoutDashboard className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
                Dashboard
              </Button>
            </NavLink>
          ) : (
            <NavLink href="/learn">
              <Button
                variant="outline"
                size="lg"
                className="h-12 px-8 text-base font-medium border-border/60 bg-background/50 backdrop-blur-sm hover:bg-accent/50 hover:border-primary/30 transition-all duration-300 group"
              >
                <PlayCircle className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
                Browse Courses
              </Button>
            </NavLink>
          )}
        </div>
      </AnimatedSection>

      {/* Info line */}
      <AnimatedSection animation="fade-up" delay={0.4}>
        <p className="mt-8 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-1 w-1 rounded-full bg-primary/60" />
            6 comprehensive modules
            <span className="inline-block h-1 w-1 rounded-full bg-primary/60" />
            Free &amp; open access
            <span className="inline-block h-1 w-1 rounded-full bg-primary/60" />
            Interactive simulations
          </span>
        </p>
      </AnimatedSection>
    </div>
  )
}
