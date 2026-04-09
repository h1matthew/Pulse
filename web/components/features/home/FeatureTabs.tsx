'use client'

import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Search, Star, TrendingUp, Tag, MapPin, Heart, ArrowRight, DollarSign, Store } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NavLink } from '@/components/ui/nav-link'

const TABS = [
  { id: 'discover', label: 'Discover' },
  { id: 'review', label: 'Review' },
  { id: 'impact', label: 'Impact' },
  { id: 'deals', label: 'Deals' },
  { id: 'missions', label: 'Missions' },
] as const

type TabId = (typeof TABS)[number]['id']

const TAB_CONTENT: Record<TabId, { description: string; cta: string; href: string }> = {
  discover: {
    description: 'Browse by category, sort by rating, or let AI match you with local spots. Real businesses from Google Places, not a static directory.',
    cta: 'Start discovering',
    href: '/discover',
  },
  review: {
    description: 'Leave star ratings and written reviews protected by CAPTCHA. Sort businesses by rating to find the best local spots — no fake reviews.',
    cta: 'Write a review',
    href: '/discover',
  },
  impact: {
    description: '68 cents of every local dollar stays in your community. Track dollars kept local, jobs supported, and your impact tier on a personal dashboard.',
    cta: 'View your impact',
    href: '/dashboard',
  },
  deals: {
    description: 'Claim deals with unique redemption codes. From percentage discounts to free items — the more you engage locally, the more perks you unlock.',
    cta: 'Browse deals',
    href: '/deals',
  },
  missions: {
    description: 'Complete Boost Missions like "Try 3 new coffee shops this month." Track progress with visual bars and unlock rewards when you finish.',
    cta: 'See missions',
    href: '/missions',
  },
}

// ── Category banners with gradient backgrounds ──

const CATEGORIES = [
  { name: 'All', slug: '', gradient: 'from-white/10 to-white/5' },
  { name: 'Food & Drink', slug: 'food-drink', gradient: 'from-orange-500/20 to-amber-500/10' },
  { name: 'Retail', slug: 'retail', gradient: 'from-blue-500/20 to-indigo-500/10' },
  { name: 'Services', slug: 'services', gradient: 'from-emerald-500/20 to-teal-500/10' },
]

// ── Real businesses from the Pulse platform ──

const BUSINESSES = [
  { name: 'H Mart Diamond Bar', cat: 'Food & Drink', rating: 4.6, reviews: 312 },
  { name: '99 Ranch Market', cat: 'Food & Drink', rating: 4.4, reviews: 287 },
  { name: 'The Boiling Crab', cat: 'Food & Drink', rating: 4.3, reviews: 458 },
]

const REVIEWS = [
  {
    author: 'Emily R.',
    avatar: 'bg-gradient-to-br from-rose-400 to-pink-600',
    initials: 'ER',
    rating: 5,
    text: 'The seafood boil is incredible — generous portions and the Whole Sha-Bang sauce is addictive. Always packed for a reason.',
    business: 'The Boiling Crab',
    time: '3 days ago',
  },
  {
    author: 'David L.',
    avatar: 'bg-gradient-to-br from-sky-400 to-blue-600',
    initials: 'DL',
    rating: 4,
    text: 'Best Asian grocery selection in the SGV. Fresh produce, great bakery section, and the food court has amazing options.',
    business: 'H Mart Diamond Bar',
    time: '1 week ago',
  },
]

// ── Visual components for each tab ──

function DiscoverVisual() {
  return (
    <div className="space-y-3">
      <NavLink href="/discover" className="block">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors cursor-pointer">
          <Search className="h-4 w-4 text-white/40" />
          <span className="text-sm text-white/40">Search businesses near you...</span>
        </div>
      </NavLink>

      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat, i) => (
          <NavLink
            key={cat.name}
            href={cat.slug ? `/discover?category=${cat.slug}` : '/discover'}
          >
            <span className={cn(
              "relative overflow-hidden text-xs px-4 py-1.5 rounded-full border cursor-pointer transition-all hover:border-white/30",
              i === 0
                ? "bg-white/10 border-white/20 text-white"
                : "border-white/10 text-white/70 hover:text-white",
              `bg-gradient-to-r ${cat.gradient}`
            )}>
              {cat.name}
            </span>
          </NavLink>
        ))}
      </div>

      {BUSINESSES.map((b) => (
        <div key={b.name} className="flex items-center justify-between px-4 py-3.5 rounded-lg bg-white/[0.03] border border-white/10 hover:border-white/20 transition-colors">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-teal-500/20 to-teal-500/5 flex items-center justify-center">
              <Store className="h-4 w-4 text-teal-400/70" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">{b.name}</div>
              <div className="text-xs text-white/40">{b.cat}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-xs">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-white font-medium">{b.rating}</span>
            </div>
            <div className="text-xs text-white/30">{b.reviews} reviews</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ReviewVisual() {
  return (
    <div className="space-y-3">
      {REVIEWS.map((r) => (
        <div key={r.author} className="px-4 py-3.5 rounded-lg bg-white/[0.03] border border-white/10">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2.5">
              <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white", r.avatar)}>
                {r.initials}
              </div>
              <span className="text-sm font-medium text-white">{r.author}</span>
            </div>
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className={cn("h-3 w-3", s <= r.rating ? "fill-amber-400 text-amber-400" : "text-white/20")} />
              ))}
            </div>
          </div>
          <p className="text-sm text-white/70 leading-relaxed">&ldquo;{r.text}&rdquo;</p>
          <div className="text-xs text-white/30 mt-2">{r.business} · {r.time}</div>
        </div>
      ))}
      <div className="px-4 py-2.5 rounded-lg border border-dashed border-white/10 flex items-center justify-center gap-2 text-white/30 text-sm">
        <Star className="h-4 w-4" /> Protected by CAPTCHA verification
      </div>
    </div>
  )
}

function ImpactVisual() {
  const metrics: { label: string; value: string; icon: LucideIcon; iconColor: string }[] = [
    { label: 'Kept Local', value: '$1,240', icon: DollarSign, iconColor: 'text-emerald-400' },
    { label: 'Businesses', value: '18', icon: Store, iconColor: 'text-blue-400' },
    { label: 'Reviews', value: '12', icon: Star, iconColor: 'text-amber-400' },
    { label: 'Jobs Impacted', value: '2', icon: Heart, iconColor: 'text-pink-400' },
  ]

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5">
        {metrics.map(m => {
          const Icon = m.icon
          return (
            <div key={m.label} className="px-3 py-3 rounded-lg bg-white/[0.03] border border-white/10">
              <Icon className={cn("h-4 w-4 mb-1.5", m.iconColor)} />
              <div className="text-xl font-bold text-white">{m.value}</div>
              <div className="text-xs text-white/40">{m.label}</div>
            </div>
          )
        })}
      </div>
      <div className="px-4 py-3 rounded-lg border border-teal-500/20 bg-teal-500/5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/70">Impact Tier</span>
          <span className="text-sm font-semibold text-teal-400">Local Supporter 💚</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 mt-2 overflow-hidden">
          <div className="h-full w-3/5 rounded-full bg-gradient-to-r from-teal-500 to-teal-400" />
        </div>
      </div>
    </div>
  )
}

function DealsVisual() {
  const deals = [
    { title: 'Weeknight Bento Bundle', biz: 'H Mart Diamond Bar', discount: '15% off', code: 'HMART15', codeColor: 'text-teal-400' },
    { title: 'Fresh Produce Friday', biz: '99 Ranch Market', discount: '20% off', code: 'RANCH20', codeColor: 'text-amber-400' },
    { title: 'Seafood Combo Perk', biz: 'The Boiling Crab', discount: '$8 off', code: 'CRAB8', codeColor: 'text-rose-400' },
  ]

  return (
    <div className="space-y-2.5">
      {deals.map(d => (
        <div key={d.code} className="flex items-center justify-between px-4 py-3.5 rounded-lg bg-white/[0.03] border border-white/10">
          <div>
            <div className="text-sm font-medium text-white">{d.title}</div>
            <div className="text-xs text-white/40">{d.biz}</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-teal-400">{d.discount}</span>
            <span className={cn("text-xs font-mono font-bold bg-white/5 px-2.5 py-1 rounded border border-white/10", d.codeColor)}>
              {d.code}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function MissionsVisual() {
  return (
    <div className="space-y-2.5">
      {[
        { name: 'Coffee Explorer', desc: 'Visit 3 different coffee shops', progress: 2, target: 3, color: 'bg-amber-400' },
        { name: 'Retail Champion', desc: 'Support 5 local retail stores', progress: 3, target: 5, color: 'bg-teal-400' },
        { name: 'Review Rockstar', desc: 'Leave 10 verified reviews', progress: 7, target: 10, color: 'bg-purple-400' },
      ].map(m => (
        <div key={m.name} className="px-4 py-3.5 rounded-lg bg-white/[0.03] border border-white/10">
          <div className="flex items-center justify-between mb-1">
            <div>
              <div className="text-sm font-medium text-white">{m.name}</div>
              <div className="text-xs text-white/40">{m.desc}</div>
            </div>
            <span className="text-xs font-medium text-white/60">{m.progress}/{m.target}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 mt-2 overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-500", m.color)} style={{ width: `${(m.progress / m.target) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

const VISUALS: Record<TabId, () => React.ReactNode> = {
  discover: DiscoverVisual,
  review: ReviewVisual,
  impact: ImpactVisual,
  deals: DealsVisual,
  missions: MissionsVisual,
}

export function FeatureTabs() {
  const [active, setActive] = useState<TabId>('discover')
  const content = TAB_CONTENT[active]
  const Visual = VISUALS[active]

  return (
    <div>
      {/* Product demo frame */}
      <div className="mx-auto max-w-3xl mb-8">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 shadow-2xl shadow-black/20 backdrop-blur-sm">
          <Visual />
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex items-center justify-center mb-6">
        <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] p-1 backdrop-blur-sm">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                active === tab.id
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-white/50 hover:text-white/70"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab description */}
      <div className="text-center max-w-2xl mx-auto">
        <p className="text-white/60 text-base sm:text-lg leading-relaxed mb-4">
          {content.description}
        </p>
        <NavLink
          href={content.href}
          className="inline-flex items-center gap-1.5 text-teal-400 font-medium text-sm hover:underline underline-offset-4"
        >
          {content.cta} <ArrowRight className="h-3.5 w-3.5" />
        </NavLink>
      </div>
    </div>
  )
}
