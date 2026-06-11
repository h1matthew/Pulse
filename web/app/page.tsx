/**
 * Homepage - Pulse landing page.
 *
 * Quiet public entry point focused on local discovery, deals, and impact.
 * Light, refined theme driven entirely by semantic tokens (warm paper canvas,
 * ink text, a single bronze-amber accent, crisp hairline borders).
 */
import { ArrowRight, Store, Tag, TrendingUp } from "lucide-react"
import { Header } from "@/components/layout/Header"
import { HomeWrapper } from "@/components/features/home/HomeWrapper"
import { AnimatedSection } from "@/components/features/home/AnimatedSection"
import { HeroStats } from "@/components/features/home/CommunityStatsIsland"
import { HeroPreview } from "@/components/features/home/HeroPreview"
import { HeroCityName } from "@/components/features/home/HeroCityName"
import { FeatureTabs } from "@/components/features/home/FeatureTabs"
import { PulseLogo } from "@/components/ui/PulseLogo"
import { NavLink } from "@/components/ui/nav-link"

const VALUE_POINTS = [
  {
    icon: Store,
    title: "Places",
    text: "Useful lists, ratings, and hours.",
  },
  {
    icon: Tag,
    title: "Deals",
    text: "Simple offers you can actually use.",
  },
  {
    icon: TrendingUp,
    title: "Impact",
    text: "A clean record of what stays local.",
  },
]

const FOOTER_LINKS = [
  { href: "/discover", label: "Browse" },
  { href: "/deals", label: "Deals" },
  { href: "/missions", label: "Missions" },
  { href: "/about", label: "About" },
]

export default function Home() {
  return (
    <HomeWrapper>
      <Header />

      <section
        aria-label="Hero"
        className="relative px-6 pb-16 pt-32 sm:pt-36 lg:pb-20"
      >
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <AnimatedSection animation="fade-up">
            <div className="max-w-2xl">
              <p className="mb-5 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Pulse local guide</p>
              <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                Feel the <span className="gradient-text">Pulse</span> of <HeroCityName />
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
                Local shops, deals, and a simple view of what your support keeps in town.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <NavLink
                  href="/discover"
                  className="inline-flex h-11 items-center justify-center gap-2 btn-primary rounded-xl px-5 text-sm font-semibold text-primary-foreground transition-all"
                >
                  Browse places
                  <ArrowRight className="h-4 w-4" />
                </NavLink>
                <NavLink
                  href="/deals"
                  className="inline-flex h-11 items-center justify-center rounded-md border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                >
                  See deals
                </NavLink>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={0.08}>
            <HeroPreview />
          </AnimatedSection>
        </div>
      </section>

      <section aria-label="Product snapshot" className="px-6 py-14">
        <AnimatedSection animation="fade-up">
          <FeatureTabs />
        </AnimatedSection>
      </section>

      <section aria-label="Community stats" className="px-6 py-12">
        <AnimatedSection animation="fade-up">
          <HeroStats />
        </AnimatedSection>
      </section>

      <section aria-label="Local discovery" className="px-6 py-20 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <AnimatedSection animation="fade-up">
            <div>
              <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Pick a place without the pitch
              </h2>
              <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">
                Browse what is open, nearby, and worth a visit. No long setup. No forced account.
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={0.08}>
            <div className="grid gap-3 sm:grid-cols-3">
              {VALUE_POINTS.map((point) => {
                const Icon = point.icon
                return (
                  <div key={point.title} className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30">
                    <Icon className="h-4 w-4 text-primary" />
                    <h3 className="mt-4 text-sm font-semibold text-foreground">{point.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{point.text}</p>
                  </div>
                )
              })}
            </div>
          </AnimatedSection>
        </div>
      </section>

      <section aria-label="Simple impact" className="px-6 py-20 sm:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
          <AnimatedSection animation="fade-up">
            <div className="rounded-lg border border-border bg-card">
              {[
                ["This month", "$184 kept local"],
                ["Places supported", "7"],
                ["Deals used", "3"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between border-b border-border px-5 py-4 last:border-b-0">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-base font-mono font-semibold text-foreground">{value}</span>
                </div>
              ))}
            </div>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={0.08}>
            <div>
              <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Keep the signal. Drop the noise.
              </h2>
              <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">
                Pulse shows the basics clearly: where you went, what you saved, and what stayed local.
              </p>
              <NavLink
                href="/dashboard"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4"
              >
                View dashboard <ArrowRight className="h-4 w-4" />
              </NavLink>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <section aria-label="Call to action" className="px-6 py-20">
        <AnimatedSection animation="fade-up">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">Start with what is close.</h2>
              <p className="mt-3 text-base text-muted-foreground">Find a place for today. Save the rest for later.</p>
            </div>
            <NavLink
              href="/discover"
              className="inline-flex h-11 items-center justify-center gap-2 btn-primary rounded-xl px-5 text-sm font-semibold text-primary-foreground transition-all"
            >
              Browse places
              <ArrowRight className="h-4 w-4" />
            </NavLink>
          </div>
        </AnimatedSection>
      </section>

      <footer role="contentinfo" aria-label="Site footer" className="px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <PulseLogo className="h-7 w-7 text-foreground" />
              <span className="font-semibold text-foreground">Pulse</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Local discovery, kept simple.</p>
          </div>
          <nav aria-label="Footer links" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {FOOTER_LINKS.map((link) => (
              <NavLink key={link.href} href={link.href} className="hover:text-foreground transition-colors">
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </footer>
    </HomeWrapper>
  )
}
