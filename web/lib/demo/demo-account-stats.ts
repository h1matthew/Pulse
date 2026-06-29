import type { ImpactReportData } from '@/lib/report-generator'

interface DemoUser {
  id: string
  email?: string | null
}

interface DemoImpactResponse {
  user_id: string
  estimated_dollars_kept_local: number
  businesses_supported: number
  jobs_impacted_estimate: number
  reviews_left: number
  missions_completed: number
  deals_claimed: number
  total_check_ins: number
  community_rank: number | null
  last_updated: string
  is_demo_data: true
}

interface DemoActivityItem {
  id: string
  type: 'check_in' | 'review' | 'bookmark' | 'deal_claimed'
  business: string
  time: string
  impact: number
}

function parseBoolean(value: string | undefined): boolean | null {
  if (value == null) return null
  if (value === 'true') return true
  if (value === 'false') return false
  return null
}

function isDemoStatsEnabled(): boolean {
  const override = parseBoolean(process.env.PULSE_ENABLE_DEMO_STATS)
  if (override != null) return override

  // Off unless explicitly enabled: real users must see real data. Set
  // PULSE_ENABLE_DEMO_STATS=true (optionally with PULSE_DEMO_ACCOUNT_ID or
  // PULSE_DEMO_ACCOUNT_EMAIL to target one account) for presentations.
  return false
}

/**
 * Gate for non-user-specific demo content (e.g. fallback demo deals).
 * Same env switch as demo stats: off unless PULSE_ENABLE_DEMO_STATS=true.
 */
export function isDemoContentEnabled(): boolean {
  return isDemoStatsEnabled()
}

function getTargetedDemoAccounts() {
  const targetId = process.env.PULSE_DEMO_ACCOUNT_ID?.trim() || null
  const targetEmail = process.env.PULSE_DEMO_ACCOUNT_EMAIL?.trim().toLowerCase() || null
  return { targetId, targetEmail }
}

/**
 * Toggle + account targeting for temporary demo stats.
 * Remove this file and related route checks after presentation.
 */
export function shouldUseDemoStatsForUser(user: DemoUser): boolean {
  if (!isDemoStatsEnabled()) return false

  const { targetId, targetEmail } = getTargetedDemoAccounts()

  if (!targetId && !targetEmail) {
    return true
  }

  if (targetId && user.id === targetId) {
    return true
  }

  if (targetEmail && user.email?.toLowerCase() === targetEmail) {
    return true
  }

  return false
}

export function getDemoImpact(userId: string): DemoImpactResponse {
  return {
    user_id: userId,
    estimated_dollars_kept_local: 1840,
    businesses_supported: 14,
    jobs_impacted_estimate: 2,
    reviews_left: 9,
    missions_completed: 4,
    deals_claimed: 7,
    total_check_ins: 26,
    community_rank: 12,
    last_updated: new Date().toISOString(),
    is_demo_data: true,
  }
}

export function getDemoActivity(): DemoActivityItem[] {
  return [
    {
      id: 'demo-checkin-1',
      type: 'check_in',
      business: 'Rosario\'s Mexican Cafe y Cantina',
      time: '2 hours ago',
      impact: 5,
    },
    {
      id: 'demo-review-1',
      type: 'review',
      business: 'The Friendly Spot Ice House',
      time: '6 hours ago',
      impact: 25,
    },
    {
      id: 'demo-deal-1',
      type: 'deal_claimed',
      business: 'The Twig Book Shop',
      time: '1 day ago',
      impact: 10,
    },
    {
      id: 'demo-bookmark-1',
      type: 'bookmark',
      business: 'Alamo Candy Company',
      time: '2 days ago',
      impact: 2,
    },
    {
      id: 'demo-checkin-2',
      type: 'check_in',
      business: 'Bakery Lorraine',
      time: '3 days ago',
      impact: 5,
    },
  ]
}

export function getDemoMissionProgress(userId: string) {
  const now = new Date()
  const thirtyDaysFromNow = new Date(now)
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
  const fourteenDaysFromNow = new Date(now)
  fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14)
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  return [
    {
      id: 'demo-progress-1',
      mission_id: 'demo-mission-1',
      user_id: userId,
      current_count: 2,
      is_completed: false,
      completed_at: null,
      reward_claimed: false,
      reward_claimed_at: null,
      created_at: sevenDaysAgo.toISOString(),
      updated_at: now.toISOString(),
      mission: {
        id: 'demo-mission-1',
        title: 'SA Coffee Crawl',
        description: 'Visit 3 local coffee shops in San Antonio',
        mission_type: 'visit_count' as const,
        target_count: 3,
        target_category_id: null,
        reward_deal_id: null,
        reward_description: '15% off your next local coffee order',
        start_date: sevenDaysAgo.toISOString(),
        end_date: thirtyDaysFromNow.toISOString(),
        is_active: true,
        created_at: sevenDaysAgo.toISOString(),
        category: { id: 'cat-1', name: 'Food & Drink', slug: 'food-drink', icon: '🍽️' },
      },
    },
    {
      id: 'demo-progress-2',
      mission_id: 'demo-mission-2',
      user_id: userId,
      current_count: 4,
      is_completed: false,
      completed_at: null,
      reward_claimed: false,
      reward_claimed_at: null,
      created_at: sevenDaysAgo.toISOString(),
      updated_at: now.toISOString(),
      mission: {
        id: 'demo-mission-2',
        title: 'Southtown Explorer',
        description: 'Leave reviews for 5 businesses in the Southtown district',
        mission_type: 'review_count' as const,
        target_count: 5,
        target_category_id: null,
        reward_deal_id: null,
        reward_description: 'Exclusive Southtown Supporter badge',
        start_date: sevenDaysAgo.toISOString(),
        end_date: fourteenDaysFromNow.toISOString(),
        is_active: true,
        created_at: sevenDaysAgo.toISOString(),
        category: { id: 'cat-2', name: 'Arts & Culture', slug: 'arts-culture', icon: '🎨' },
      },
    },
    {
      id: 'demo-progress-3',
      mission_id: 'demo-mission-3',
      user_id: userId,
      current_count: 3,
      is_completed: true,
      completed_at: sevenDaysAgo.toISOString(),
      reward_claimed: false,
      reward_claimed_at: null,
      created_at: sevenDaysAgo.toISOString(),
      updated_at: now.toISOString(),
      mission: {
        id: 'demo-mission-3',
        title: 'Support 3 New Local Shops',
        description: 'Check in at 3 businesses you haven\'t visited before',
        mission_type: 'visit_count' as const,
        target_count: 3,
        target_category_id: null,
        reward_deal_id: null,
        reward_description: 'Local Champion sticker pack',
        start_date: null,
        end_date: null,
        is_active: true,
        created_at: sevenDaysAgo.toISOString(),
        category: { id: 'cat-3', name: 'Retail', slug: 'retail', icon: '🛍️' },
      },
    },
  ]
}

export const DEMO_BUSINESS_ID = 'demo-la-villita-cafe'

export function getDemoBusiness() {
  const now = new Date().toISOString()
  return {
    id: DEMO_BUSINESS_ID,
    name: 'La Villita Cafe LLC',
    slug: 'la-villita-cafe-llc',
    category_id: 'cat-food-drink',
    description: 'A beloved San Antonio cafe in the heart of the historic La Villita Arts Village, serving fresh wraps, breakfast tacos, and specialty coffee. A neighborhood favorite since opening on Villita Street.',
    short_description: 'Fresh wraps, tacos & coffee in historic La Villita',
    address: '418 Villita St',
    city: 'San Antonio',
    state: 'TX',
    zip_code: '78205',
    phone: '(210) 223-4700',
    email: null,
    website: null,
    latitude: 29.4218,
    longitude: -98.4890,
    hours: {
      monday: '7:00 AM - 3:00 PM',
      tuesday: '7:00 AM - 3:00 PM',
      wednesday: '7:00 AM - 3:00 PM',
      thursday: '7:00 AM - 3:00 PM',
      friday: '7:00 AM - 3:00 PM',
      saturday: '8:00 AM - 4:00 PM',
      sunday: '8:00 AM - 4:00 PM',
    },
    photos: [] as string[],
    logo_url: null,
    owner_id: null,
    is_verified: true,
    is_featured: true,
    price_range: 1,
    tags: ['breakfast', 'lunch', 'wraps', 'tacos', 'coffee'],
    amenities: ['Dine-in', 'Outdoor seating', 'Takeout'],
    average_rating: 4.6,
    review_count: 142,
    bookmark_count: 38,
    place_id: null,
    data_source: 'user_added' as const,
    last_synced_at: null,
    sync_status: 'active' as const,
    claimed_at: null,
    created_at: now,
    updated_at: now,
    ai_description: null,
    ai_description_generated_at: null,
    ai_description_source: null,
    editorial_summary: null,
    ai_business_summary: null,
    category: {
      id: 'cat-food-drink',
      slug: 'food-drink',
      name: 'Food & Drink',
      description: 'Restaurants, cafes, bars, and food trucks',
      icon: '🍽️',
      color: '#f97316',
      sort_order: 1,
      is_active: true,
      created_at: now,
    },
  }
}

export function getDemoCheckinResult() {
  return {
    message: 'Receipt verified — checked in!',
    verification: {
      merchant: 'La Villita Cafe LLC',
      total: 15.97,
      items: [{ name: 'Rio Wrap', price: 12.50 }],
      date: '2026-06-29',
    },
    impact: {
      dollarsKeptLocal: 15.97,
      pointsEarned: 25,
      jobsSupported: 1,
    },
    missionUpdates: [
      {
        missionId: 'demo-mission-1',
        title: 'SA Coffee Crawl',
        currentCount: 3,
        targetCount: 3,
        completed: true,
      },
    ],
  }
}

function daysAgoIso(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

export function getDemoImpactReport(dateRange: {
  from: string | null
  to: string
}): ImpactReportData {
  const reviewOneDate = daysAgoIso(2)
  const reviewTwoDate = daysAgoIso(6)
  const dealDate = daysAgoIso(4)
  const checkInOneDate = daysAgoIso(1)
  const checkInTwoDate = daysAgoIso(3)
  const checkInThreeDate = daysAgoIso(8)
  const checkInFourDate = daysAgoIso(10)
  const missionDate = daysAgoIso(5)

  return {
    dateRange,
    metrics: {
      dollarsKeptLocal: 1840,
      businessesSupported: 14,
      jobsImpacted: 2,
      carbonSaved: 13,
      reviewsLeft: 9,
      dealsClaimed: 7,
      totalCheckIns: 26,
    },
    tier: { name: 'Pulse Champion', icon: 'star' },
    categoryBreakdown: [
      { category: 'Food & Drink', checkIns: 11, dollarsSpent: 1480 },
      { category: 'Retail', checkIns: 8, dollarsSpent: 720 },
      { category: 'Services', checkIns: 7, dollarsSpent: 505 },
    ],
    businesses: [
      {
        name: 'Rosario\'s Mexican Cafe y Cantina',
        category: 'Food & Drink',
        checkIns: 6,
        totalSpent: 410,
        lastVisit: checkInOneDate,
      },
      {
        name: 'The Friendly Spot Ice House',
        category: 'Food & Drink',
        checkIns: 4,
        totalSpent: 360,
        lastVisit: checkInTwoDate,
      },
      {
        name: 'The Twig Book Shop',
        category: 'Retail',
        checkIns: 3,
        totalSpent: 180,
        lastVisit: checkInThreeDate,
      },
      {
        name: 'Bakery Lorraine',
        category: 'Food & Drink',
        checkIns: 5,
        totalSpent: 295,
        lastVisit: checkInFourDate,
      },
    ],
    reviews: [
      {
        businessName: 'The Friendly Spot Ice House',
        rating: 5,
        content: 'Great patio vibes and awesome local craft beer selection.',
        createdAt: reviewOneDate,
      },
      {
        businessName: 'Rosario\'s Mexican Cafe y Cantina',
        rating: 4,
        content: 'Incredible enchiladas and friendly staff.',
        createdAt: reviewTwoDate,
      },
    ],
    deals: [
      {
        dealTitle: 'Buy 1 Get 1 Latte',
        businessName: 'Bakery Lorraine',
        claimedAt: dealDate,
        redeemedAt: null,
      },
      {
        dealTitle: '20% Off New Releases',
        businessName: 'The Twig Book Shop',
        claimedAt: checkInThreeDate,
        redeemedAt: checkInTwoDate,
      },
    ],
    timeline: [
      {
        type: 'Check-in',
        businessName: 'Rosario\'s Mexican Cafe y Cantina',
        detail: 'Spent $42',
        date: checkInOneDate,
      },
      {
        type: 'Review',
        businessName: 'The Friendly Spot Ice House',
        detail: 'Rated 5/5',
        date: reviewOneDate,
      },
      {
        type: 'Deal Claimed',
        businessName: 'The Twig Book Shop',
        detail: '20% Off New Releases',
        date: dealDate,
      },
      {
        type: 'Mission Complete',
        businessName: '',
        detail: 'Support 3 new local shops',
        date: missionDate,
      },
      {
        type: 'Bookmark',
        businessName: 'Alamo Candy Company',
        detail: 'Saved to bookmarks',
        date: checkInFourDate,
      },
    ],
  }
}
