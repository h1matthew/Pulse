/**
 * Homepage — the directory index.
 *
 * No hero. A title line, a search field, then real listing rows. Everything
 * below the search field is either live data or a row labelled as a sample.
 */
import { Header } from "@/components/layout/Header"
import { HomeWrapper } from "@/components/features/home/HomeWrapper"
import { HeroStats } from "@/components/features/home/CommunityStatsIsland"
import { HeroCityName } from "@/components/features/home/HeroCityName"
import { FeatureTabs } from "@/components/features/home/FeatureTabs"
import { PulseLogo } from "@/components/ui/PulseLogo"
import { NavLink } from "@/components/ui/nav-link"

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

      <section aria-label="Search" className="px-6 pb-8 pt-28">
        <div className="mx-auto max-w-6xl">
          <h1 className="max-w-3xl text-h1 font-medium text-foreground">
            Local businesses in <HeroCityName />
          </h1>
          {/* Plain GET form — works before hydration. */}
          <form action="/discover" method="get" role="search" className="mt-5 flex max-w-xl gap-2">
            <label htmlFor="site-search" className="sr-only">
              Search places
            </label>
            <input
              id="site-search"
              name="q"
              type="search"
              autoComplete="off"
              placeholder="Tacos, hardware, 78210"
              className="h-10 min-w-0 flex-1 rounded-md border border-border bg-surface-1 px-3 text-body text-foreground placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              className="btn-primary h-10 shrink-0 rounded-md px-4 text-small font-medium"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      <section aria-label="Nearby listings" className="px-6 pb-12">
        <FeatureTabs />
      </section>

      <section aria-label="Community activity" className="border-t border-border px-6 py-5">
        <div className="mx-auto max-w-6xl">
          <HeroStats />
        </div>
      </section>

      <footer role="contentinfo" aria-label="Site footer" className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <PulseLogo className="h-7 w-7 text-primary" />
              <span className="text-body font-medium text-foreground">Pulse</span>
            </div>
            <p className="mt-2 max-w-md text-small text-muted-foreground">
              A directory of independent businesses, with hours, price, and rating on every row.{" "}
              <NavLink
                href="/discover"
                className="text-foreground underline underline-offset-4 transition-colors hover:text-primary"
              >
                Browse all places
              </NavLink>
              .
            </p>
          </div>
          <nav aria-label="Footer links" className="flex flex-wrap gap-x-5 gap-y-2 text-small text-muted-foreground">
            {FOOTER_LINKS.map((link) => (
              <NavLink key={link.href} href={link.href} className="transition-colors hover:text-foreground">
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </footer>
    </HomeWrapper>
  )
}
