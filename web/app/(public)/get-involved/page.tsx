import { AnimatedSection } from '@/components/features/home/AnimatedSection'
import { Heart, Users, Store, Star, ArrowRight, Megaphone, Gift } from 'lucide-react'
import { NavLink } from '@/components/ui/nav-link'

export const dynamic = 'force-static'
export const revalidate = 3600

const WAYS_TO_HELP = [
  {
    icon: Star,
    title: 'Leave Reviews',
    description:
      'Your honest reviews help other community members discover the best local spots. Every review strengthens a small business\'s visibility.',
    href: '/discover',
    cta: 'Start Reviewing',
  },
  {
    icon: Store,
    title: 'Shop Local',
    description:
      'Choose local businesses over chains whenever you can. Studies show 68 cents of every dollar spent locally recirculates in your community.',
    href: '/discover',
    cta: 'Find Businesses',
  },
  {
    icon: Megaphone,
    title: 'Spread the Word',
    description:
      'Tell your friends, family, and coworkers about the local businesses you love. Word-of-mouth is the most powerful marketing a small business can get.',
    href: '/about',
    cta: 'Learn More',
  },
  {
    icon: Gift,
    title: 'Claim & Share Deals',
    description:
      'Claiming deals directly supports local businesses running promotions. Share deals with friends to multiply the impact.',
    href: '/deals',
    cta: 'Browse Deals',
  },
]

export default function GetInvolvedPage() {
  return (
    <div className="relative">
      <main className="pt-16 pb-24 px-6">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-16 text-center">
            <AnimatedSection animation="fade-up">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary">
                <Heart className="h-4 w-4" />
                Get Involved
              </div>
            </AnimatedSection>
            <AnimatedSection animation="fade-up" delay={0.1}>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                <span className="bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                  Strengthen Your Local Economy
                </span>
              </h1>
            </AnimatedSection>
            <AnimatedSection animation="fade-up" delay={0.2}>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                Every action you take on Pulse — every review, bookmark, and deal claimed — directly
                supports the small businesses that make your community unique.
              </p>
            </AnimatedSection>
          </div>

          {/* Ways to Help Grid */}
          <div className="grid gap-6 sm:grid-cols-2 mb-20">
            {WAYS_TO_HELP.map((item, i) => (
              <AnimatedSection key={item.title} animation="fade-up" delay={0.2 + i * 0.1}>
                <NavLink href={item.href} className="block h-full">
                  <div className="group h-full rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-8 transition-colors duration-300 hover:border-primary/20">
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary/15">
                      <item.icon className="h-7 w-7" />
                    </div>
                    <h2 className="mb-3 text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                      {item.title}
                    </h2>
                    <p className="mb-6 text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                      {item.cta}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </NavLink>
              </AnimatedSection>
            ))}
          </div>

          {/* Volunteer CTA */}
          <AnimatedSection animation="fade-up" delay={0.6}>
            <div className="mx-auto max-w-2xl text-center rounded-2xl border border-primary/20 bg-primary/5 p-10">
              <div className="mb-4 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Users className="h-8 w-8" />
                </div>
              </div>
              <h2 className="mb-3 text-2xl font-bold">Are You a Local Business Owner?</h2>
              <p className="mb-6 text-muted-foreground leading-relaxed">
                List your business on Pulse to reach community members who are actively looking
                to support local. Create deals, respond to reviews, and grow your customer base —
                all for free.
              </p>
              <NavLink
                href="/about"
                className="inline-flex items-center gap-2 btn-primary rounded-xl px-6 py-3 text-sm font-medium text-primary-foreground transition-all"
              >
                Learn More
                <ArrowRight className="h-4 w-4" />
              </NavLink>
            </div>
          </AnimatedSection>
        </div>
      </main>
    </div>
  )
}
