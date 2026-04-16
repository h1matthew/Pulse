/**
 * Homepage — Pulse Landing Page
 *
 * GitHub-inspired editorial landing page. Forces dark mode on the marketing
 * surface while respecting user theme preference on all other pages.
 * Server Component shell with client islands that hydrate independently.
 */
import { ArrowRight } from "lucide-react"
import { Header } from "@/components/layout/Header"
import { HomeWrapper } from "@/components/features/home/HomeWrapper"
import { AnimatedSection } from "@/components/features/home/AnimatedSection"
import { HeroStats } from "@/components/features/home/CommunityStatsIsland"
import { FeatureTabs } from "@/components/features/home/FeatureTabs"
import { ParallaxGlow } from "@/components/features/home/ParallaxGlow"

import { PulseLogo } from "@/components/ui/PulseLogo"
import { NavLink } from "@/components/ui/nav-link"

export default function Home() {
  return (
    <HomeWrapper>
      <Header />

      {/* ── Hero ── */}
      <section
        aria-label="Hero"
        className="relative isolate flex min-h-[95vh] flex-col items-center justify-center px-6 pt-20 pb-16"
      >
        {/* Parallax glows — move slower than scroll to create depth */}
        <div className="absolute inset-0 -z-10">
          <ParallaxGlow
            speed={0.15}
            className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] rounded-full bg-teal-500/[0.07] blur-[150px]"
          />
          <ParallaxGlow
            speed={0.25}
            className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-purple-500/[0.04] blur-[120px]"
          />
        </div>

        <div className="mx-auto max-w-4xl text-center">
          <AnimatedSection animation="fade-up">
            <h1 className="text-5xl sm:text-6xl lg:text-[4.5rem] font-bold tracking-tight leading-[1.1] text-white mb-6">
              Every dollar you spend locally creates{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-200">
                real impact
              </span>
            </h1>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={0.1}>
            <p className="mx-auto max-w-xl text-lg text-white/50 leading-relaxed mb-10">
              Discover small businesses in your community, leave verified reviews,
              claim exclusive deals, and see exactly how your support strengthens
              the local economy.
            </p>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={0.2}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <NavLink href="/discover">
                <button className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#0a0c10] hover:bg-white/90 transition-colors">
                  Explore Businesses
                  <ArrowRight className="h-4 w-4" />
                </button>
              </NavLink>
              <NavLink href="/mission">
                <button className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-6 py-3 text-sm font-medium text-white hover:border-white/30 hover:bg-white/5 transition-all">
                  How It Works
                </button>
              </NavLink>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── Feature Tabs (interactive product demo) ── */}
      <section aria-label="Features" className="relative px-6 pb-24">
        <AnimatedSection animation="fade-up">
          <FeatureTabs />
        </AnimatedSection>
      </section>

      {/* ── Stats Strip ── */}
      <section aria-label="Community stats" className="border-y border-white/[0.06] py-16 px-6">
        <AnimatedSection animation="fade-up">
          <HeroStats />
        </AnimatedSection>
      </section>

      {/* ── Deep Feature: Discover ── */}
      <section aria-label="Discover businesses" className="px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-5xl">
          <AnimatedSection animation="fade-up">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-5">
                  Find businesses your neighbors love
                </h2>
                <p className="text-white/50 text-lg leading-relaxed mb-6">
                  Browse by category, sort by reviews, or let our AI recommendation
                  engine match you with spots based on your ratings and bookmarks.
                  Powered by Google Places — real data, not a static list.
                </p>
                <NavLink
                  href="/discover"
                  className="inline-flex items-center gap-1.5 text-teal-400 font-medium hover:underline underline-offset-4 transition-colors"
                >
                  Start discovering <ArrowRight className="h-4 w-4" />
                </NavLink>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
                <div className="rounded-lg bg-gradient-to-br from-teal-500/10 to-purple-500/5 p-6 space-y-3">
                  <div className="flex gap-2">
                    {["All", "Food & Drink", "Retail", "Services"].map((c) => (
                      <span key={c} className={`text-xs px-2.5 py-1 rounded-full ${c === "All" ? "bg-teal-500/20 text-teal-300" : "border border-white/10 text-white/40"}`}>{c}</span>
                    ))}
                  </div>
                  {[
                    { name: "Harkins Theatres", cat: "Entertainment", rating: "4.6", reviews: "3.1K" },
                    { name: "The Boiling Crab", cat: "Food & Drink", rating: "4.6", reviews: "3.4K" },
                    { name: "Round1 Arcade", cat: "Entertainment", rating: "4.3", reviews: "3.1K" },
                  ].map((b) => (
                    <div key={b.name} className="flex items-center gap-3 bg-white/[0.03] rounded-lg p-3">
                      <div className="h-10 w-10 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400 text-sm font-bold flex-shrink-0">
                        {b.rating}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white/80 truncate">{b.name}</div>
                        <div className="text-xs text-white/30">{b.cat} · {b.reviews} reviews</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── Deep Feature: Impact (reversed) ── */}
      <section aria-label="Track your impact" className="px-6 py-24 sm:py-32 border-t border-white/[0.06]">
        <div className="mx-auto max-w-5xl">
          <AnimatedSection animation="fade-up">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="order-2 lg:order-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
                <div className="rounded-lg bg-gradient-to-br from-purple-500/10 to-teal-500/5 p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Kept Local", value: "$1,840", color: "text-teal-400" },
                      { label: "Businesses", value: "14", color: "text-white/70" },
                      { label: "Jobs Impacted", value: "2", color: "text-white/70" },
                      { label: "Carbon Saved", value: "13 lbs", color: "text-white/70" },
                    ].map((m) => (
                      <div key={m.label} className="bg-white/[0.03] rounded-lg p-3">
                        <div className={`text-lg font-bold ${m.color}`}>{m.value}</div>
                        <div className="text-xs text-white/30">{m.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white/[0.03] rounded-lg p-3 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 text-xs">🏆</div>
                    <div>
                      <div className="text-sm font-medium text-white/70">Pulse Champion</div>
                      <div className="text-xs text-white/30">$1,000+ kept local</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-5">
                  See where your money goes
                </h2>
                <p className="text-white/50 text-lg leading-relaxed mb-6">
                  Your personal dashboard tracks dollars kept local, businesses
                  supported, jobs impacted, and carbon saved. Export customizable
                  reports as CSV or print them — filter by date range and category.
                </p>
                <NavLink
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 text-teal-400 font-medium hover:underline underline-offset-4 transition-colors"
                >
                  View your dashboard <ArrowRight className="h-4 w-4" />
                </NavLink>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── CTA ── */}
      <section aria-label="Call to action" className="relative px-6 py-24 sm:py-32">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <ParallaxGlow
            speed={-0.1}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-teal-500/[0.05] blur-[140px]"
          />
        </div>
        <div className="mx-auto max-w-2xl text-center">
          <AnimatedSection animation="fade-up">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-5">
              Your community is already here
            </h2>
            <p className="text-white/50 text-lg leading-relaxed mb-8">
              Join thousands of people discovering local businesses and tracking
              the real economic impact of their everyday choices.
            </p>
            <NavLink href="/discover">
              <button className="inline-flex items-center gap-2 rounded-lg bg-white px-8 py-3.5 text-sm font-semibold text-[#0a0c10] hover:bg-white/90 transition-colors">
                Start Exploring
                <ArrowRight className="h-4 w-4" />
              </button>
            </NavLink>
          </AnimatedSection>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer role="contentinfo" aria-label="Site footer" className="border-t border-white/[0.06] px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <PulseLogo className="h-5 w-5 text-white" />
                <span className="font-semibold text-white">Pulse</span>
              </div>
              <p className="text-sm text-white/40 leading-relaxed">
                Discover local businesses and see your real economic impact.
              </p>
            </div>
            <nav aria-label="Discover links">
              <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-4">Discover</h2>
              <ul className="space-y-2 text-sm text-white/40">
                <li><NavLink href="/discover" className="hover:text-white transition-colors">All Businesses</NavLink></li>
                <li><NavLink href="/categories" className="hover:text-white transition-colors">Categories</NavLink></li>
                <li><NavLink href="/deals" className="hover:text-white transition-colors">Deals</NavLink></li>
                <li><NavLink href="/missions" className="hover:text-white transition-colors">Boost Missions</NavLink></li>
              </ul>
            </nav>
            <nav aria-label="Community links">
              <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-4">Community</h2>
              <ul className="space-y-2 text-sm text-white/40">
                <li><NavLink href="/dashboard" className="hover:text-white transition-colors">Your Impact</NavLink></li>
                <li><NavLink href="/leaderboard" className="hover:text-white transition-colors">Leaderboard</NavLink></li>
                <li><NavLink href="/bookmarks" className="hover:text-white transition-colors">Bookmarks</NavLink></li>
                <li><NavLink href="/reviews" className="hover:text-white transition-colors">Your Reviews</NavLink></li>
              </ul>
            </nav>
            <nav aria-label="About links">
              <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-4">About</h2>
              <ul className="space-y-2 text-sm text-white/40">
                <li><NavLink href="/mission" className="hover:text-white transition-colors">Our Mission</NavLink></li>
                <li><NavLink href="/get-involved" className="hover:text-white transition-colors">Get Involved</NavLink></li>
                <li><NavLink href="/about" className="hover:text-white transition-colors">Team</NavLink></li>
              </ul>
            </nav>
          </div>
          <div className="pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-white/30">
              © 2025 Pulse. Strengthening local economies, one discovery at a time.
            </p>
            <div className="flex items-center gap-4 text-xs text-white/30">
              <NavLink href="/privacy" className="hover:text-white/60 transition-colors">Privacy</NavLink>
              <NavLink href="/terms" className="hover:text-white/60 transition-colors">Terms</NavLink>
            </div>
          </div>
        </div>
      </footer>

    </HomeWrapper>
  )
}
