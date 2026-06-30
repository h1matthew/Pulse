import { describe, it, expect } from 'vitest'
import {
  TOUR_DEMO_BUSINESS_ID,
  TOUR_DEMO_BUSINESS_PATH,
  getTourDemoBusiness,
} from '../demo-business'

describe('tour demo business', () => {
  it('exposes a stable id and matching path', () => {
    expect(TOUR_DEMO_BUSINESS_ID).toBe('onboarding-demo')
    expect(TOUR_DEMO_BUSINESS_PATH).toBe(`/business/${TOUR_DEMO_BUSINESS_ID}`)
  })

  it('is always stocked with deals and reviews so tour steps never look empty', () => {
    const business = getTourDemoBusiness()

    expect(business.id).toBe(TOUR_DEMO_BUSINESS_ID)
    expect(business.deals.length).toBeGreaterThan(0)
    expect(business.reviews.length).toBeGreaterThan(0)
    // review_count / local_review_count should agree with the seeded reviews
    expect(business.review_count).toBe(business.reviews.length)
    expect(business.local_review_count).toBe(business.reviews.length)
    expect(business.category?.name).toBeTruthy()
  })

  it('seeds well-formed deals (future expiry, demo ids, codes)', () => {
    const { deals } = getTourDemoBusiness()
    const now = Date.now()

    for (const deal of deals) {
      expect(deal.business_id).toBe(TOUR_DEMO_BUSINESS_ID)
      expect(deal.id.startsWith('demo-')).toBe(true)
      expect(deal.is_active).toBe(true)
      expect(deal.code).toBeTruthy()
      // end_date is in the future so the deal never shows as expired
      expect(new Date(deal.end_date as string).getTime()).toBeGreaterThan(now)
    }
  })

  it('seeds reviews with ratings, content, and a display name', () => {
    const { reviews } = getTourDemoBusiness()

    for (const review of reviews) {
      expect(review.business_id).toBe(TOUR_DEMO_BUSINESS_ID)
      expect(review.rating).toBeGreaterThanOrEqual(1)
      expect(review.rating).toBeLessThanOrEqual(5)
      expect(review.content.length).toBeGreaterThan(0)
      expect(review.user?.full_name).toBeTruthy()
    }
  })
})
