import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoisted mocks
const { mockGenerateContent, mockGetGenerativeModel } = vi.hoisted(() => {
  const mockGenerateContent = vi.fn()
  const mockGetGenerativeModel = vi.fn(() => ({
    generateContent: mockGenerateContent,
  }))
  return { mockGenerateContent, mockGetGenerativeModel }
})

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel = mockGetGenerativeModel
  },
}))

// Mock the gemini-business module
vi.mock('@/lib/gemini-business', () => ({
  sanitizeForPrompt: (input: string, maxLength = 5000) => {
    if (!input || typeof input !== 'string') return ''
    return input.slice(0, maxLength).trim()
  },
  scrapeBusinessWebsite: vi.fn(),
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { scrapeWebsiteText, extractDealsWithGemini, upsertScrapedDeals } from '@/lib/deal-scraper'
import { scrapeBusinessWebsite } from '@/lib/gemini-business'

const mockScrapeBusinessWebsite = vi.mocked(scrapeBusinessWebsite)

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// scrapeWebsiteText
// ============================================================================

describe('scrapeWebsiteText', () => {
  it('uses API Ninjas when key is available and returns text', async () => {
    process.env.API_NINJAS_KEY = 'test-key'
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: 'Welcome to our store! This week we have 50% off all items in our inventory for loyal customers.' }),
    })

    const result = await scrapeWebsiteText('https://example.com')
    expect(result.text).toContain('50% off')
    expect(result.error).toBeUndefined()
    expect(mockScrapeBusinessWebsite).not.toHaveBeenCalled()
    delete process.env.API_NINJAS_KEY
  })

  it('falls back to built-in scraper when API Ninjas fails', async () => {
    process.env.API_NINJAS_KEY = 'test-key'
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    mockScrapeBusinessWebsite.mockResolvedValueOnce({
      url: 'https://example.com',
      title: 'Example',
      description: 'Test',
      textContent: 'Fallback content with deals and offers for customers visiting our location.',
    })

    const result = await scrapeWebsiteText('https://example.com')
    expect(result.text).toContain('Fallback content')
    delete process.env.API_NINJAS_KEY
  })

  it('returns error when both scrapers fail', async () => {
    process.env.API_NINJAS_KEY = 'test-key'
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    mockScrapeBusinessWebsite.mockResolvedValueOnce({
      url: 'https://example.com',
      title: '',
      description: '',
      textContent: '',
      error: 'Connection timeout',
    })

    const result = await scrapeWebsiteText('https://example.com')
    expect(result.text).toBe('')
    expect(result.error).toBeTruthy()
    delete process.env.API_NINJAS_KEY
  })

  it('falls back when API Ninjas returns short content', async () => {
    process.env.API_NINJAS_KEY = 'test-key'
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: 'short' }),
    })
    mockScrapeBusinessWebsite.mockResolvedValueOnce({
      url: 'https://example.com',
      title: 'Example',
      description: 'Test',
      textContent: 'Longer fallback content with enough text to be useful for extraction.',
    })

    const result = await scrapeWebsiteText('https://example.com')
    expect(result.text).toContain('Longer fallback')
    delete process.env.API_NINJAS_KEY
  })
})

// ============================================================================
// extractDealsWithGemini
// ============================================================================

describe('extractDealsWithGemini', () => {
  it('returns empty array for empty/short text', async () => {
    const result = await extractDealsWithGemini('Test Business', 'short')
    expect(result).toEqual([])
  })

  it('extracts deals from Gemini response', async () => {
    const geminiResponse = JSON.stringify([
      {
        title: '20% Off All Pizzas',
        description: 'Get 20% off any pizza order this week.',
        discount_type: 'percentage',
        discount_value: 20,
        code: 'PIZZA20',
        end_date: '2026-03-01',
      },
    ])

    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => geminiResponse },
    })

    const result = await extractDealsWithGemini(
      'Pizza Palace',
      'Welcome to Pizza Palace! This week only: 20% off all pizzas. Use code PIZZA20 at checkout. Offer ends March 1st.'
    )

    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('20% Off All Pizzas')
    expect(result[0].discount_type).toBe('percentage')
    expect(result[0].discount_value).toBe(20)
    expect(result[0].code).toBe('PIZZA20')
  })

  it('returns empty array when Gemini finds no deals', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => '[]' },
    })

    const result = await extractDealsWithGemini(
      'Test Business',
      'We are a regular business with standard pricing. No special offers at this time.'
    )

    expect(result).toEqual([])
  })

  it('handles Gemini returning invalid JSON gracefully', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => 'This is not valid JSON' },
    })

    const result = await extractDealsWithGemini(
      'Test Business',
      'Some website content about deals and offers that could not be parsed properly.'
    )

    expect(result).toEqual([])
  })

  it('filters out deals with missing required fields', async () => {
    const geminiResponse = JSON.stringify([
      {
        title: 'Valid Deal',
        description: 'A valid deal description',
        discount_type: 'percentage',
        discount_value: 10,
        code: null,
        end_date: null,
      },
      {
        title: '',
        description: 'Missing title',
        discount_type: 'percentage',
        discount_value: 5,
        code: null,
        end_date: null,
      },
      {
        description: 'No title field at all',
        discount_type: 'bogo',
      },
    ])

    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => geminiResponse },
    })

    const result = await extractDealsWithGemini(
      'Test',
      'Website with multiple deals: 10% off everything, buy one get one free, and more special offers.'
    )

    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Valid Deal')
  })

  it('caps results at 10 deals', async () => {
    const deals = Array.from({ length: 15 }, (_, i) => ({
      title: `Deal ${i + 1}`,
      description: `Description for deal ${i + 1}`,
      discount_type: 'percentage',
      discount_value: 10,
      code: null,
      end_date: null,
    }))

    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(deals) },
    })

    const result = await extractDealsWithGemini(
      'Test',
      'A website with many deals. There are lots of promotions happening this month for all customers.'
    )

    expect(result.length).toBeLessThanOrEqual(10)
  })

  it('defaults invalid discount_type to percentage', async () => {
    const geminiResponse = JSON.stringify([
      {
        title: 'Special Deal',
        description: 'A special deal',
        discount_type: 'invalid_type',
        discount_value: 15,
        code: null,
        end_date: null,
      },
    ])

    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => geminiResponse },
    })

    const result = await extractDealsWithGemini(
      'Test',
      'Check out our special deal: 15% off everything in store this weekend only.'
    )

    expect(result[0].discount_type).toBe('percentage')
  })
})

// ============================================================================
// upsertScrapedDeals
// ============================================================================

describe('upsertScrapedDeals', () => {
  function createMockSupabase(existingDeals: Array<{ id: string; title: string }> = []) {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          ilike: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
      in: vi.fn().mockResolvedValue({ error: null }),
    })

    const mockInsert = vi.fn().mockResolvedValue({ error: null })

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: existingDeals, error: null }),
      }),
    })

    return {
      from: vi.fn().mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
        delete: vi.fn(),
      }),
      _mockInsert: mockInsert,
      _mockUpdate: mockUpdate,
    }
  }

  it('returns 0 and deactivates old deals when no new deals provided', async () => {
    const supabase = createMockSupabase()
    const result = await upsertScrapedDeals('biz-1', [], supabase as any)
    expect(result).toBe(0)
  })

  it('inserts new deals and returns count', async () => {
    const supabase = createMockSupabase([])
    const deals: import('@/lib/deal-scraper').ExtractedDeal[] = [
      {
        title: 'New Deal',
        description: 'A brand new deal',
        discount_type: 'percentage',
        discount_value: 25,
        code: 'SAVE25',
        end_date: null,
      },
    ]

    const result = await upsertScrapedDeals('biz-1', deals, supabase as any)
    expect(result).toBe(1)
  })

  it('updates existing deals instead of duplicating', async () => {
    const supabase = createMockSupabase([
      { id: 'deal-1', title: 'Existing Deal' },
    ])

    const deals: import('@/lib/deal-scraper').ExtractedDeal[] = [
      {
        title: 'existing deal',
        description: 'Updated description',
        discount_type: 'percentage',
        discount_value: 30,
        code: null,
        end_date: null,
      },
    ]

    const result = await upsertScrapedDeals('biz-1', deals, supabase as any)
    expect(result).toBe(0) // No new deals, just updated
  })
})
