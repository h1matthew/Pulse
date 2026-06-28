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
  { icon: Store, title: "Places", text: "Useful lists, ratings, and hours." },
  { icon: Tag, title: "Deals", text: "Simple offers you can actually use." },
  { icon: TrendingUp, title: "Impact", text: "A clean record of what stays local." },
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

      <section aria-label="Hero" className="px-6 pb-16 pt-24 sm:pt-28">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <AnimatedSection>
            <div className="max-w-2xl">
              <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                Feel the Pulse of <HeroCityName />
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
                Local shops, deals, and a simple view of what your support keeps in town.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <NavLink
                  href="/discover"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Browse places
                  <ArrowRight className="h-4 w-4" />
                </NavLink>
                <NavLink
                  href="/deals"
                  className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium text-foreground hover:bg-accent"
                >
                  See deals
                </NavLink>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection>
            <HeroPreview />
          </AnimatedSection>
        </div>
      </section>

      <section aria-label="Product snapshot" className="px-6 py-12">
        <FeatureTabs />
      </section>

      <section aria-label="Community stats" className="px-6 py-10">
        <HeroStats />
      </section>

      <section aria-label="Local discovery" className="px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Pick a place without the pitch
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              Browse what is open, nearby, and worth a visit. No long setup. No forced account.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {VALUE_POINTS.map((point) => {
              const Icon = point.icon
              return (
                <div key={point.title} className="rounded-lg border border-border bg-card p-4">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <h3 className="mt-3 text-sm font-medium">{point.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{point.text}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section aria-label="Simple impact" className="px-6 py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card">
            {[
              ["This month", "$184 kept local"],
              ["Places supported", "7"],
              ["Deals used", "3"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between border-b border-border px-4 py-3 last:border-b-0">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-medium tabular-nums">{value}</span>
              </div>
            ))}
          </div>

          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Keep the signal. Drop the noise.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              Pulse shows the basics clearly: where you went, what you saved, and what stayed local.
            </p>
            <NavLink
              href="/dashboard"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4"
            >
              View dashboard <ArrowRight className="h-3.5 w-3.5" />
            </NavLink>
          </div>
        </div>
      </section>

      <section aria-label="Call to action" className="px-6 py-16">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Start with what is close.</h2>
            <p className="mt-2 text-sm text-muted-foreground">Find a place for today. Save the rest for later.</p>
          </div>
          <NavLink
            href="/discover"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Browse places
            <ArrowRight className="h-4 w-4" />
          </NavLink>
        </div>
      </section>

      <footer role="contentinfo" aria-label="Site footer" className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <PulseLogo className="h-5 w-5 text-foreground" />
            <span className="text-sm font-medium">Pulse</span>
          </div>
          <nav aria-label="Footer links" className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {FOOTER_LINKS.map((link) => (
              <NavLink key={link.href} href={link.href} className="hover:text-foreground">
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </footer>
    </HomeWrapper>
  )
}
