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

  // Enabled by default for demo presentations; tests stay deterministic.
  if (process.env.NODE_ENV === 'test') return false
  return true
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
      business: 'Riverfront Coffee Roasters',
      time: '2 hours ago',
      impact: 5,
    },
    {
      id: 'demo-review-1',
      type: 'review',
      business: 'Maple Street Market',
      time: '6 hours ago',
      impact: 25,
    },
    {
      id: 'demo-deal-1',
      type: 'deal_claimed',
      business: 'Northside Books',
      time: '1 day ago',
      impact: 10,
    },
    {
      id: 'demo-bookmark-1',
      type: 'bookmark',
      business: 'Harbor Hardware',
      time: '2 days ago',
      impact: 2,
    },
    {
      id: 'demo-checkin-2',
      type: 'check_in',
      business: 'Sunrise Bakery',
      time: '3 days ago',
      impact: 5,
    },
  ]
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
        name: 'Riverfront Coffee Roasters',
        category: 'Food & Drink',
        checkIns: 6,
        totalSpent: 410,
        lastVisit: checkInOneDate,
      },
      {
        name: 'Maple Street Market',
        category: 'Retail',
        checkIns: 4,
        totalSpent: 360,
        lastVisit: checkInTwoDate,
      },
      {
        name: 'Northside Books',
        category: 'Retail',
        checkIns: 3,
        totalSpent: 180,
        lastVisit: checkInThreeDate,
      },
      {
        name: 'Sunrise Bakery',
        category: 'Food & Drink',
        checkIns: 5,
        totalSpent: 295,
        lastVisit: checkInFourDate,
      },
    ],
    reviews: [
      {
        businessName: 'Maple Street Market',
        rating: 5,
        content: 'Fast checkout and great local produce selection.',
        createdAt: reviewOneDate,
      },
      {
        businessName: 'Riverfront Coffee Roasters',
        rating: 4,
        content: 'Excellent cold brew and friendly staff.',
        createdAt: reviewTwoDate,
      },
    ],
    deals: [
      {
        dealTitle: 'Buy 1 Get 1 Latte',
        businessName: 'Riverfront Coffee Roasters',
        claimedAt: dealDate,
        redeemedAt: null,
      },
      {
        dealTitle: '20% Off New Releases',
        businessName: 'Northside Books',
        claimedAt: checkInThreeDate,
        redeemedAt: checkInTwoDate,
      },
    ],
    timeline: [
      {
        type: 'Check-in',
        businessName: 'Riverfront Coffee Roasters',
        detail: 'Spent $42',
        date: checkInOneDate,
      },
      {
        type: 'Review',
        businessName: 'Maple Street Market',
        detail: 'Rated 5/5',
        date: reviewOneDate,
      },
      {
        type: 'Deal Claimed',
        businessName: 'Northside Books',
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
        businessName: 'Harbor Hardware',
        detail: 'Saved to bookmarks',
        date: checkInFourDate,
      },
    ],
  }
}
