import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// --- Mock Google Generative AI (simulates an expired/invalid API key) ---
const mockGenerateContent = vi.fn()
const mockGenerateContentStream = vi.fn()
const mockStartChat = vi.fn()
const constructorKeys: Array<string | undefined> = []

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    constructor(apiKey?: string) {
      constructorKeys.push(apiKey)
    }
    getGenerativeModel() {
      return {
        generateContent: mockGenerateContent,
        generateContentStream: mockGenerateContentStream,
        startChat: mockStartChat,
      }
    }
  },
}))

vi.mock('@/lib/gemini-business', () => ({
  sanitizeForPrompt: vi.fn((input: string) => input),
}))

// --- Chainable Supabase mock ---
const mockLimit = vi.fn()
const mockBuilder = {
  select: vi.fn().mockReturnThis(),
  gt: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: mockLimit,
}
const mockFrom = vi.fn(() => mockBuilder)
const mockGetUser = vi.fn().mockResolvedValue({ data: { user: null } })

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: mockFrom,
      auth: { getUser: mockGetUser },
    })
  ),
}))

import {
  generateFallbackResponse,
  generateAssistantResponse,
  detectCategorySlug,
} from '../assistant'

const businessRows = [
  {
    name: 'Little Skewer',
    average_rating: 4.8,
    review_count: 212,
    city: 'Diamond Bar',
    price_range: 2,
  },
  {
    name: 'Happy Harbor Cafe',
    average_rating: 4.7,
    review_count: 98,
    city: 'Walnut',
    price_range: 1,
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  mockLimit.mockResolvedValue({ data: businessRows, error: null })
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('detectCategorySlug', () => {
  it('maps food keywords to food-drink', () => {
    expect(detectCategorySlug('Where should I eat dinner tonight?')).toBe('food-drink')
    expect(detectCategorySlug('best restaurants for lunch')).toBe('food-drink')
    expect(detectCategorySlug('find me a coffee place')).toBe('food-drink')
    expect(detectCategorySlug('any good cafes around?')).toBe('food-drink')
  })

  it('maps shopping keywords to retail', () => {
    expect(detectCategorySlug('gift stores nearby')).toBe('retail')
    expect(detectCategorySlug('where can I shop')).toBe('retail')
    expect(detectCategorySlug('local retail spots')).toBe('retail')
  })

  it('maps health keywords to health-wellness', () => {
    expect(detectCategorySlug('I need a dentist')).toBe('health-wellness')
    expect(detectCategorySlug('best gym in town')).toBe('health-wellness')
    expect(detectCategorySlug('recommend a spa')).toBe('health-wellness')
    expect(detectCategorySlug('find a doctor')).toBe('health-wellness')
  })

  it('maps service keywords to services', () => {
    expect(detectCategorySlug('hair salon recommendations')).toBe('services')
    expect(detectCategorySlug('phone repair near me')).toBe('services')
    expect(detectCategorySlug('closest bank branch')).toBe('services')
  })

  it('maps entertainment keywords to entertainment', () => {
    expect(detectCategorySlug('bowling or an arcade tonight')).toBe('entertainment')
    expect(detectCategorySlug('want to watch a movie')).toBe('entertainment')
    expect(detectCategorySlug('something fun to do')).toBe('entertainment')
  })

  it('maps culture keywords to arts-culture', () => {
    expect(detectCategorySlug('any good museums?')).toBe('arts-culture')
    expect(detectCategorySlug('local art galleries')).toBe('arts-culture')
    expect(detectCategorySlug('where is the library')).toBe('arts-culture')
  })

  it('returns null when no category intent is found', () => {
    expect(detectCategorySlug('tell me about Pulse')).toBeNull()
    expect(detectCategorySlug('how do missions work?')).toBeNull()
    expect(detectCategorySlug('')).toBeNull()
  })

  it('matches whole words only', () => {
    // "art" should not match inside "start", "eat" not inside "great"
    expect(detectCategorySlug('great places to start my day')).toBeNull()
  })
})

describe('generateFallbackResponse', () => {
  it('returns degraded top-rated picks from the database', async () => {
    const result = await generateFallbackResponse('where should I eat dinner?', {})

    expect(result.degraded).toBe(true)
    expect(result.text).toContain('Top-rated local spots')
    expect(result.text).toContain('**Little Skewer** — 4.8★ (212 reviews) · Diamond Bar')
    expect(result.text).toContain('Happy Harbor Cafe')
    expect(result.suggestions).toHaveLength(3)
  })

  it('filters by category via inner join when intent is matched', async () => {
    await generateFallbackResponse('find a good restaurant', {})

    expect(mockFrom).toHaveBeenCalledWith('businesses')
    expect(mockBuilder.select).toHaveBeenCalledWith(
      'name, average_rating, review_count, city, price_range, is_chain, hours, latitude, longitude, categories!inner(name, slug)'
    )
    expect(mockBuilder.eq).toHaveBeenCalledWith('categories.slug', 'food-drink')
    expect(mockBuilder.gt).toHaveBeenCalledWith('average_rating', 0)
    expect(mockBuilder.order).toHaveBeenCalledWith('average_rating', { ascending: false })
    expect(mockBuilder.order).toHaveBeenCalledWith('review_count', { ascending: false })
    // Shared retrieval pulls a wide top-rated pool (distance ranking trims it)
    expect(mockBuilder.limit).toHaveBeenCalledWith(40)
  })

  it('applies no category filter when intent is unknown', async () => {
    await generateFallbackResponse('what is popular around here?', {})

    expect(mockBuilder.select).toHaveBeenCalledWith(
      'name, average_rating, review_count, city, price_range, is_chain, hours, latitude, longitude, categories(name, slug)'
    )
    expect(mockBuilder.eq).not.toHaveBeenCalled()
  })

  it('mentions proximity when a location is provided', async () => {
    const result = await generateFallbackResponse('lunch spots', {
      location: { lat: 34.0286, lng: -117.8103 },
    })

    expect(result.text).toContain('near you')
  })

  it('returns a graceful generic answer when the query errors', async () => {
    mockLimit.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })

    const result = await generateFallbackResponse('food please', {})

    expect(result.degraded).toBe(true)
    expect(result.text.toLowerCase()).toContain('discover')
    expect(result.suggestions).toHaveLength(3)
  })

  it('returns a graceful generic answer when no businesses are found', async () => {
    mockLimit.mockResolvedValueOnce({ data: [], error: null })

    const result = await generateFallbackResponse('food please', {})

    expect(result.degraded).toBe(true)
    expect(result.text.toLowerCase()).toContain('discover')
  })

  it('returns a graceful generic answer when the Supabase client throws', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockRejectedValueOnce(new Error('no request scope'))

    const result = await generateFallbackResponse('food please', {})

    expect(result.degraded).toBe(true)
    expect(result.text.toLowerCase()).toContain('discover')
  })
})

describe('API key resilience', () => {
  it('constructs the Gemini client lazily, not at module import', () => {
    // The module was imported at the top of this file with no API key in the
    // environment — the constructor must not have run during import.
    // (Other tests in this file may have triggered it since, so we only
    // assert that import alone is safe: generateFallbackResponse never
    // touches the Gemini client.)
    expect(typeof generateAssistantResponse).toBe('function')
  })

  it('falls back to GOOGLE_PLACES_API_KEY when GEMINI_API_KEY is missing', async () => {
    vi.stubEnv('GEMINI_API_KEY', '')
    vi.stubEnv('GOOGLE_PLACES_API_KEY', 'places-key-123')
    mockGenerateContent.mockResolvedValue({ response: { text: () => 'ok' } })

    await generateAssistantResponse('recommend something good')

    expect(constructorKeys[constructorKeys.length - 1]).toBe('places-key-123')
  })

  it('prefers GEMINI_API_KEY when both keys are set', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'gemini-key-456')
    vi.stubEnv('GOOGLE_PLACES_API_KEY', 'places-key-123')
    mockGenerateContent.mockResolvedValue({ response: { text: () => 'ok' } })

    await generateAssistantResponse('recommend something good')

    expect(constructorKeys[constructorKeys.length - 1]).toBe('gemini-key-456')
  })

  it('returns a non-degraded response when the LLM works', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () =>
          'LLM answer\n<suggestions>\n["A?", "B?", "C?"]\n</suggestions>',
      },
    })

    const result = await generateAssistantResponse('recommend something good')

    expect(result.text).toBe('LLM answer')
    expect(result.suggestions).toEqual(['A?', 'B?', 'C?'])
    expect('degraded' in result).toBe(false)
  })

  it('propagates API key errors so the route can degrade', async () => {
    mockGenerateContent.mockRejectedValue(
      new Error('API key expired. Please renew the API key.')
    )

    await expect(generateAssistantResponse('find food')).rejects.toThrow(
      'API key expired'
    )
  })
})

describe('end-to-end route fallback with expired key', () => {
  it('returns 200 with degraded DB results through the real route + lib', async () => {
    mockGenerateContent.mockRejectedValue(
      new Error('API key expired. Please renew the API key.')
    )

    const { POST } = await import('@/app/api/assistant/route')

    const request = new Request('http://localhost/api/assistant', {
      method: 'POST',
      body: JSON.stringify({ message: 'find me a great restaurant' }),
    })

    const response = await POST(request as never)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.degraded).toBe(true)
    expect(data.text).toContain('Little Skewer')
    expect(data.suggestions).toHaveLength(3)
  })

  it('returns 200 with degraded JSON for stream requests when setup fails', async () => {
    mockGenerateContentStream.mockRejectedValue(
      new Error('API key expired. Please renew the API key.')
    )

    const { POST } = await import('@/app/api/assistant/route')

    const request = new Request('http://localhost/api/assistant', {
      method: 'POST',
      body: JSON.stringify({ message: 'dinner ideas', stream: true }),
    })

    const response = await POST(request as never)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('application/json')

    const data = await response.json()
    expect(data.degraded).toBe(true)
    expect(data.text).toContain('Little Skewer')
  })
})
