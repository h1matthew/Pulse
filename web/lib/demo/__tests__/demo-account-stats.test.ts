import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  shouldUseDemoStatsForUser,
  isDemoContentEnabled,
  getDemoBusiness,
  DEMO_BUSINESS_ID,
} from '../demo-account-stats'

const user = { id: 'user-1', email: 'someone@example.com' }

const DEMO_ENV_KEYS = [
  'PULSE_ENABLE_DEMO_STATS',
  'PULSE_DEMO_ACCOUNT_ID',
  'PULSE_DEMO_ACCOUNT_EMAIL',
] as const

const savedEnv: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const key of DEMO_ENV_KEYS) {
    savedEnv[key] = process.env[key]
    delete process.env[key]
  }
})

afterEach(() => {
  for (const key of DEMO_ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key]
    else process.env[key] = savedEnv[key]
  }
})

describe('demo account stats gating', () => {
  it('is OFF by default — real users get real data', () => {
    // Regression: demo stats used to default ON for every user, replacing
    // the whole dashboard with fabricated numbers.
    expect(shouldUseDemoStatsForUser(user)).toBe(false)
    expect(isDemoContentEnabled()).toBe(false)
  })

  it('stays off when explicitly disabled', () => {
    process.env.PULSE_ENABLE_DEMO_STATS = 'false'
    expect(shouldUseDemoStatsForUser(user)).toBe(false)
    expect(isDemoContentEnabled()).toBe(false)
  })

  it('enables for all users when the flag is set without a target', () => {
    process.env.PULSE_ENABLE_DEMO_STATS = 'true'
    expect(shouldUseDemoStatsForUser(user)).toBe(true)
    expect(isDemoContentEnabled()).toBe(true)
  })

  it('targets a single account by id when configured', () => {
    process.env.PULSE_ENABLE_DEMO_STATS = 'true'
    process.env.PULSE_DEMO_ACCOUNT_ID = 'demo-account'
    expect(shouldUseDemoStatsForUser({ id: 'demo-account' })).toBe(true)
    expect(shouldUseDemoStatsForUser(user)).toBe(false)
  })

  it('targets a single account by email when configured', () => {
    process.env.PULSE_ENABLE_DEMO_STATS = 'true'
    process.env.PULSE_DEMO_ACCOUNT_EMAIL = 'Demo@Example.com'
    expect(
      shouldUseDemoStatsForUser({ id: 'x', email: 'demo@example.com' })
    ).toBe(true)
    expect(shouldUseDemoStatsForUser(user)).toBe(false)
  })
})

describe('getDemoBusiness (La Villita Cafe)', () => {
  it('always has a real photo so it never renders the gradient poster', () => {
    const business = getDemoBusiness()
    expect(business.photos.length).toBeGreaterThan(0)
    const first = business.photos[0]
    expect(typeof first).toBe('string')
    expect(first).toMatch(/^https:\/\//)
  })

  it('is stocked with reviews so the detail page never looks empty', () => {
    const business = getDemoBusiness()
    expect(business.reviews.length).toBeGreaterThan(0)
    expect(business.review_count).toBe(business.reviews.length)
    expect(business.local_review_count).toBe(business.reviews.length)
    for (const review of business.reviews) {
      expect(review.business_id).toBe(DEMO_BUSINESS_ID)
      expect(review.rating).toBeGreaterThanOrEqual(1)
      expect(review.rating).toBeLessThanOrEqual(5)
      expect(review.content.length).toBeGreaterThan(0)
      expect(review.user?.full_name).toBeTruthy()
    }
  })

  it('is stocked with active deals with future expiry and codes', () => {
    const business = getDemoBusiness()
    const now = Date.now()
    expect(business.deals.length).toBeGreaterThan(0)
    for (const deal of business.deals) {
      expect(deal.business_id).toBe(DEMO_BUSINESS_ID)
      expect(deal.is_active).toBe(true)
      expect(deal.code).toBeTruthy()
      expect(new Date(deal.end_date as string).getTime()).toBeGreaterThan(now)
    }
  })
})
