import { Heart, MapPin, Star, TrendingUp, ArrowRight, Zap, Target, Users } from "lucide-react"
import { Header } from "@/components/layout/Header"
import { AnimatedSection } from "@/components/features/home/AnimatedSection"
import { NavLink } from "@/components/ui/nav-link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section className="relative isolate flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-6 pt-16">
        {/* Background gradient */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-chart-2/5" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/10 rounded-full blur-3xl opacity-50" />
        </div>

        <div className="mx-auto max-w-5xl text-center">
          <AnimatedSection animation="fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-8">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Strengthening Local Economies</span>
            </div>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={0.1}>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-6">
              Discover Local.
              <br />
              <span className="gradient-text">Impact Community.</span>
            </h1>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={0.2}>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground mb-10">
              Every review, bookmark, and visit strengthens your local economy.
              See exactly how your support creates real impact in your community.
            </p>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={0.3}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <NavLink href="/discover">
                <Button size="lg" className="group px-8">
                  Explore Local Businesses
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </NavLink>
              <NavLink href="/about">
                <Button variant="outline" size="lg" className="px-8">
                  Learn How It Works
                </Button>
              </NavLink>
            </div>
          </AnimatedSection>

          {/* Stats Preview */}
          <AnimatedSection animation="fade-up" delay={0.4}>
            <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
              <Card className="bg-card/50 backdrop-blur">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">$2.4M</div>
                  <div className="text-xs text-muted-foreground">Kept Local</div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 backdrop-blur">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-chart-2">847</div>
                  <div className="text-xs text-muted-foreground">Businesses</div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 backdrop-blur">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-chart-3">12.5K</div>
                  <div className="text-xs text-muted-foreground">Reviews</div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 backdrop-blur">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-chart-4">3.2K</div>
                  <div className="text-xs text-muted-foreground">Community Members</div>
                </CardContent>
              </Card>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative px-6 py-24 bg-muted/30">
        <div className="mx-auto max-w-6xl">
          <AnimatedSection animation="fade-up">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                More Than a Directory
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Pulse transforms how you discover and support local businesses with
                powerful features designed to maximize your community impact.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatedSection animation="fade-up" delay={0.1}>
              <Card className="h-full card-lift">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Economic Impact Dashboard</h3>
                  <p className="text-sm text-muted-foreground">
                    See exactly how your spending strengthens the local economy with
                    real-time metrics on dollars kept local and jobs supported.
                  </p>
                </CardContent>
              </Card>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={0.15}>
              <Card className="h-full card-lift">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-xl bg-chart-2/10 flex items-center justify-center mb-4">
                    <Target className="h-6 w-6 text-chart-2" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">AI-Matched For You</h3>
                  <p className="text-sm text-muted-foreground">
                    Our recommendation engine learns from your ratings and bookmarks
                    to surface businesses you'll love, not just static categories.
                  </p>
                </CardContent>
              </Card>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={0.2}>
              <Card className="h-full card-lift">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-xl bg-chart-3/10 flex items-center justify-center mb-4">
                    <Zap className="h-6 w-6 text-chart-3" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Boost Missions</h3>
                  <p className="text-sm text-muted-foreground">
                    Complete challenges like "Try 3 new coffee shops this month"
                    and unlock exclusive perks and rewards from local businesses.
                  </p>
                </CardContent>
              </Card>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={0.25}>
              <Card className="h-full card-lift">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-xl bg-chart-4/10 flex items-center justify-center mb-4">
                    <Star className="h-6 w-6 text-chart-4" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Verified Reviews</h3>
                  <p className="text-sm text-muted-foreground">
                    Leave ratings and reviews with bot prevention via CAPTCHA.
                    Sort businesses by rating to find the best local gems.
                  </p>
                </CardContent>
              </Card>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={0.3}>
              <Card className="h-full card-lift">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-xl bg-chart-5/10 flex items-center justify-center mb-4">
                    <Heart className="h-6 w-6 text-chart-5" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Save Favorites</h3>
                  <p className="text-sm text-muted-foreground">
                    Bookmark businesses you love and want to support. Build your
                    personal list of local favorites to revisit again and again.
                  </p>
                </CardContent>
              </Card>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={0.35}>
              <Card className="h-full card-lift">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Exclusive Deals</h3>
                  <p className="text-sm text-muted-foreground">
                    Access special "Boost Missions" and deals from local businesses.
                    The more you engage, the more perks you unlock.
                  </p>
                </CardContent>
              </Card>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Community Pulse Section */}
      <section className="relative px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection animation="fade-up">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-chart-2/20 bg-chart-2/5 px-4 py-1.5 mb-6">
                  <Users className="h-4 w-4 text-chart-2" />
                  <span className="text-sm font-medium text-chart-2">Community Pulse</span>
                </div>
                <h2 className="text-3xl font-bold tracking-tight mb-4">
                  Feel the Pulse of Your Community
                </h2>
                <p className="text-muted-foreground mb-6">
                  Our community-wide pulse meter shows the aggregate impact of all users.
                  Watch as your collective actions strengthen the local economy in real-time.
                </p>
                <ul className="space-y-3">
                  {[
                    "Track community-wide economic impact",
                    "See which neighborhoods are most active",
                    "Celebrate collective milestones",
                    "Compete on the impact leaderboard"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                        <TrendingUp className="h-3 w-3 text-primary" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <NavLink href="/dashboard">
                    <Button className="group">
                      View Your Impact
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </NavLink>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={0.2}>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-chart-2/20 rounded-3xl blur-3xl" />
                <Card className="relative bg-card/80 backdrop-blur">
                  <CardContent className="p-8">
                    <div className="text-center mb-8">
                      <div className="text-5xl font-bold gradient-text mb-2">8,742</div>
                      <div className="text-sm text-muted-foreground">Community Pulse Score</div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Dollars Kept Local</span>
                        <span className="font-medium">$2.4M</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full w-3/4 bg-gradient-to-r from-primary to-chart-2 rounded-full" />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Businesses Supported</span>
                        <span className="font-medium">847</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full w-2/3 bg-gradient-to-r from-chart-3 to-chart-4 rounded-full" />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Jobs Impacted</span>
                        <span className="font-medium">156</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full w-1/2 bg-gradient-to-r from-chart-5 to-primary rounded-full" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden px-6 py-24 bg-muted/30">
        <div className="relative mx-auto max-w-2xl text-center">
          <AnimatedSection animation="fade-up">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Ready to Make an Impact?
            </h2>
          </AnimatedSection>
          <AnimatedSection animation="fade-up" delay={0.1}>
            <p className="text-muted-foreground mb-8">
              Join thousands of community members discovering and supporting local businesses.
              Every interaction counts toward a stronger local economy.
            </p>
          </AnimatedSection>
          <AnimatedSection animation="fade-up" delay={0.2}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <NavLink href="/discover" className="inline-block">
                <Button size="lg" className="group px-8">
                  Start Exploring
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </NavLink>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative px-6 py-12 border-t">
        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <Heart className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-lg">Pulse</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Discover local businesses and see your real economic impact.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Discover</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><NavLink href="/discover">All Businesses</NavLink></li>
                <li><NavLink href="/categories">Categories</NavLink></li>
                <li><NavLink href="/deals">Deals</NavLink></li>
                <li><NavLink href="/missions">Boost Missions</NavLink></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Community</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><NavLink href="/dashboard">Your Impact</NavLink></li>
                <li><NavLink href="/leaderboard">Leaderboard</NavLink></li>
                <li><NavLink href="/bookmarks">Bookmarks</NavLink></li>
                <li><NavLink href="/reviews">Your Reviews</NavLink></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">About</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><NavLink href="/about">Our Mission</NavLink></li>
                <li><NavLink href="/get-involved">For Business Owners</NavLink></li>
                <li><NavLink href="/contact">Contact</NavLink></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 Pulse. Strengthening local economies, one discovery at a time.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <NavLink href="/privacy">Privacy</NavLink>
              <NavLink href="/terms">Terms</NavLink>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
