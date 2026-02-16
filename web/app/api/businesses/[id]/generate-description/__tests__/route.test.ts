import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as geminiBusiness from '@/lib/gemini-business'

// Mock gemini-business module
vi.mock('@/lib/gemini-business', () => ({
  generateBusinessDescription: vi.fn(),
  generateFallbackDescription: vi.fn(),
  scrapeBusinessWebsite: vi.fn(),
  summarizeGoogleReviews: vi.fn(),
  shouldRegenerateDescription: vi.fn(),
}))

// Mock Supabase client - differentiate by table and operation
let businessSelectResult: { data: unknown; error: unknown } = { data: null, error: null }
let reviewsSelectResult: { data: unknown; error: unknown } = { data: [], error: null }
let businessUpdateResult: { error: unknown } = { error: null }

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: vi.fn((table: string) => {
        if (table === 'businesses') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve(businessSelectResult)),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve(businessUpdateResult)),
            })),
          }
        }
        if (table === 'reviews') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  limit: vi.fn(() => Promise.resolve(reviewsSelectResult)),
                })),
              })),
            })),
          }
        }
        return { select: vi.fn() }
      }),
    })
  ),
}))

import { POST, GET } from '../route'

const mockBusiness = {
  id: '123',
  name: 'Test Cafe',
  city: 'Portland',
  state: 'OR',
  description: null,
  short_description: null,
  website: null,
  place_id: null,
  ai_description: null,
  ai_description_generated_at: null,
  categories: { name: 'Cafe' },
}

describe('POST /api/businesses/[id]/generate-description', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    businessSelectResult = { data: null, error: { code: 'PGRST116' } }
    reviewsSelectResult = { data: [], error: null }
    businessUpdateResult = { error: null }
  })

  it('returns 404 when business not found', async () => {
    businessSelectResult = { data: null, error: { code: 'PGRST116' } }

    const request = new Request(
      'http://localhost/api/businesses/123/generate-description',
      { method: 'POST' }
    )
    const response = await POST(request, {
      params: Promise.resolve({ id: '123' }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Business not found')
  })

  it('returns cached description when fresh and force is not set', async () => {
    const recentDate = new Date().toISOString()
    businessSelectResult = {
      data: {
        ...mockBusiness,
        ai_description: 'Cached AI description',
        ai_description_generated_at: recentDate,
      },
      error: null,
    }
    vi.mocked(geminiBusiness.shouldRegenerateDescription).mockReturnValue(false)

    const request = new Request(
      'http://localhost/api/businesses/123/generate-description',
      { method: 'POST' }
    )
    const response = await POST(request, {
      params: Promise.resolve({ id: '123' }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.description).toBe('Cached AI description')
    expect(data.cached).toBe(true)
  })

  it('generates new description when force=true bypasses cache', async () => {
    businessSelectResult = {
      data: {
        ...mockBusiness,
        website: 'https://testcafe.com',
        ai_description: 'Old description',
        ai_description_generated_at: new Date().toISOString(),
      },
      error: null,
    }
    vi.mocked(geminiBusiness.summarizeGoogleReviews).mockResolvedValue({
      averageRating: 4.5,
      totalReviews: 10,
      topPositiveThemes: [],
      topNegativeThemes: [],
      sampleReviews: [],
    })
    vi.mocked(geminiBusiness.scrapeBusinessWebsite).mockResolvedValue({
      url: 'https://testcafe.com',
      title: 'Test Cafe',
      description: '',
      textContent: 'A'.repeat(300),
    })
    vi.mocked(geminiBusiness.generateBusinessDescription).mockResolvedValue(
      'Fresh new AI description'
    )

    const request = new Request(
      'http://localhost/api/businesses/123/generate-description?force=true',
      { method: 'POST' }
    )
    const response = await POST(request, {
      params: Promise.resolve({ id: '123' }),
    })
    const data = await response.json()

    expect(data.description).toBe('Fresh new AI description')
    expect(data.cached).toBe(false)
  })

  it('falls back to review-only generation when no website', async () => {
    businessSelectResult = {
      data: { ...mockBusiness },
      error: null,
    }
    vi.mocked(geminiBusiness.shouldRegenerateDescription).mockReturnValue(true)
    vi.mocked(geminiBusiness.summarizeGoogleReviews).mockResolvedValue({
      averageRating: 4.0,
      totalReviews: 5,
      topPositiveThemes: ['great'],
      topNegativeThemes: [],
      sampleReviews: ['Loved it'],
    })
    vi.mocked(geminiBusiness.generateFallbackDescription).mockResolvedValue(
      'Fallback description text'
    )

    const request = new Request(
      'http://localhost/api/businesses/123/generate-description',
      { method: 'POST' }
    )
    const response = await POST(request, {
      params: Promise.resolve({ id: '123' }),
    })
    const data = await response.json()

    expect(data.description).toBe('Fallback description text')
    expect(data.source).toBe('reviews_only')
    expect(geminiBusiness.generateFallbackDescription).toHaveBeenCalled()
    expect(geminiBusiness.generateBusinessDescription).not.toHaveBeenCalled()
  })

  it('uses full generation when website content is sufficient', async () => {
    businessSelectResult = {
      data: {
        ...mockBusiness,
        website: 'https://testcafe.com',
      },
      error: null,
    }
    vi.mocked(geminiBusiness.shouldRegenerateDescription).mockReturnValue(true)
    vi.mocked(geminiBusiness.summarizeGoogleReviews).mockResolvedValue({
      averageRating: 0,
      totalReviews: 0,
      topPositiveThemes: [],
      topNegativeThemes: [],
      sampleReviews: [],
    })
    vi.mocked(geminiBusiness.scrapeBusinessWebsite).mockResolvedValue({
      url: 'https://testcafe.com',
      title: 'Test',
      description: 'desc',
      textContent: 'A'.repeat(300),
    })
    vi.mocked(geminiBusiness.generateBusinessDescription).mockResolvedValue(
      'Full AI description'
    )

    const request = new Request(
      'http://localhost/api/businesses/123/generate-description',
      { method: 'POST' }
    )
    const response = await POST(request, {
      params: Promise.resolve({ id: '123' }),
    })
    const data = await response.json()

    expect(data.description).toBe('Full AI description')
    expect(data.source).toBe('website_and_reviews')
    expect(geminiBusiness.generateBusinessDescription).toHaveBeenCalled()
  })

  it('returns 500 when generation throws an error', async () => {
    businessSelectResult = {
      data: { ...mockBusiness },
      error: null,
    }
    vi.mocked(geminiBusiness.shouldRegenerateDescription).mockReturnValue(true)
    vi.mocked(geminiBusiness.summarizeGoogleReviews).mockRejectedValue(
      new Error('Gemini API down')
    )

    const request = new Request(
      'http://localhost/api/businesses/123/generate-description',
      { method: 'POST' }
    )
    const response = await POST(request, {
      params: Promise.resolve({ id: '123' }),
    })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to generate description')
  })
})

describe('GET /api/businesses/[id]/generate-description', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    businessSelectResult = { data: null, error: { code: 'PGRST116' } }
  })

  it('returns 404 when business not found', async () => {
    businessSelectResult = { data: null, error: { code: 'PGRST116' } }

    const request = new Request(
      'http://localhost/api/businesses/123/generate-description'
    )
    const response = await GET(request, {
      params: Promise.resolve({ id: '123' }),
    })

    expect(response.status).toBe(404)
  })

  it('returns description with is_fresh true when fresh', async () => {
    businessSelectResult = {
      data: {
        ai_description: 'Existing description',
        ai_description_generated_at: new Date().toISOString(),
      },
      error: null,
    }
    vi.mocked(geminiBusiness.shouldRegenerateDescription).mockReturnValue(false)

    const request = new Request(
      'http://localhost/api/businesses/123/generate-description'
    )
    const response = await GET(request, {
      params: Promise.resolve({ id: '123' }),
    })
    const data = await response.json()

    expect(data.description).toBe('Existing description')
    expect(data.is_fresh).toBe(true)
    expect(data.needs_regeneration).toBe(false)
  })

  it('returns needs_regeneration true when stale', async () => {
    businessSelectResult = {
      data: {
        ai_description: 'Old description',
        ai_description_generated_at: new Date(
          Date.now() - 100 * 24 * 60 * 60 * 1000
        ).toISOString(),
      },
      error: null,
    }
    vi.mocked(geminiBusiness.shouldRegenerateDescription).mockReturnValue(true)

    const request = new Request(
      'http://localhost/api/businesses/123/generate-description'
    )
    const response = await GET(request, {
      params: Promise.resolve({ id: '123' }),
    })
    const data = await response.json()

    expect(data.description).toBe('Old description')
    expect(data.is_fresh).toBe(false)
    expect(data.needs_regeneration).toBe(true)
  })
})
