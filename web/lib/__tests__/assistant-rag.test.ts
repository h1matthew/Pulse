/**
 * RAG grounding tests for the Pulse Assistant.
 *
 * Verifies that the assistant retrieves real businesses from the database,
 * ranks them by distance when the user's location is known, injects them
 * into the LLM prompt, and degrades safely when retrieval fails.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mock Google Generative AI (captures prompts, returns canned text) ---
const mockGenerateContent = vi.fn()
const mockGenerateContentStream = vi.fn()
const mockStartChat = vi.fn()

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
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
const mockCreateClient = vi.fn(() =>
  Promise.resolve({ from: mockFrom, auth: { getUser: vi.fn() } })
)

vi.mock('@/lib/supabase/server', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}))

import {
  retrieveBusinessContext,
  formatDirectoryContext,
  generateAssistantResponse,
  type RetrievedBusiness,
} from '../assistant'

// Diamond Bar city center — the seeded data's home turf
const USER_LOCATION = { lat: 34.0286, lng: -117.8103 }

const dbRows = [
  {
    // Higher rated but ~7 miles away
    name: 'Far Famous Bistro',
    average_rating: 4.9,
    review_count: 500,
    city: 'Pomona',
    price_range: 3,
    is_chain: false,
    hours: [],
    latitude: 34.1,
    longitude: -117.9,
    categories: { name: 'Food & Drink', slug: 'food-drink' },
  },
  {
    // Slightly lower rated but a few blocks away
    name: 'Little Skewer',
    average_rating: 4.8,
    review_count: 212,
    city: 'Diamond Bar',
    price_range: 2,
    is_chain: false,
    hours: [],
    latitude: 34.029,
    longitude: -117.811,
    categories: { name: 'Food & Drink', slug: 'food-drink' },
  },
  {
    // Chain, no coordinates — should sort last when ranking by distance
    name: 'Subway',
    average_rating: 4.1,
    review_count: 88,
    city: 'Diamond Bar',
    price_range: 1,
    is_chain: true,
    hours: [],
    latitude: null,
    longitude: null,
    categories: { name: 'Food & Drink', slug: 'food-drink' },
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateClient.mockImplementation(() =>
    Promise.resolve({ from: mockFrom, auth: { getUser: vi.fn() } })
  )
  mockLimit.mockResolvedValue({ data: dbRows, error: null })
  mockGenerateContent.mockResolvedValue({
    response: { text: () => 'Here are my grounded picks!' },
  })
})

describe('retrieveBusinessContext', () => {
  it('maps database rows into retrieved businesses with joined category names', async () => {
    const result = await retrieveBusinessContext('where should I eat?')

    // Subway (chain) is excluded — only independents are retrieved
    expect(result).toHaveLength(2)
    const skewer = result.find((b) => b.name === 'Little Skewer')
    expect(skewer).toMatchObject({
      category: 'Food & Drink',
      rating: 4.8,
      reviewCount: 212,
      city: 'Diamond Bar',
      priceRange: 2,
      isChain: false,
    })
  })

  it('ranks by distance from the user location', async () => {
    const result = await retrieveBusinessContext('dinner spots', USER_LOCATION)

    expect(result.map((b) => b.name)).toEqual([
      'Little Skewer', // ~0.06 mi
      'Far Famous Bistro', // ~7 mi
    ])
    expect(result[0].distanceMiles).not.toBeNull()
    expect(result[0].distanceMiles as number).toBeLessThan(1)
    expect(result[1].distanceMiles as number).toBeGreaterThan(5)
  })

  it('excludes chains from retrieval entirely', async () => {
    mockLimit.mockResolvedValueOnce({
      data: [
        {
          // Chain literally at the user's location
          name: 'Subway',
          average_rating: 4.1,
          review_count: 88,
          city: 'Diamond Bar',
          price_range: 1,
          is_chain: true,
          hours: [],
          latitude: USER_LOCATION.lat,
          longitude: USER_LOCATION.lng,
          categories: { name: 'Food & Drink', slug: 'food-drink' },
        },
        {
          // Better independent ~1 mile away
          name: 'Corner Bistro',
          average_rating: 4.6,
          review_count: 150,
          city: 'Diamond Bar',
          price_range: 2,
          is_chain: false,
          hours: [],
          latitude: 34.043,
          longitude: -117.8103,
          categories: { name: 'Food & Drink', slug: 'food-drink' },
        },
      ],
      error: null,
    })

    const result = await retrieveBusinessContext('dinner spots', USER_LOCATION)
    expect(result.map((b) => b.name)).toEqual(['Corner Bistro'])
  })

  it('keeps the rating order from the database when no location is given', async () => {
    const result = await retrieveBusinessContext('dinner spots')
    expect(result.map((b) => b.name)).toEqual([
      'Far Famous Bistro',
      'Little Skewer',
    ])
  })

  it('respects the limit parameter', async () => {
    const result = await retrieveBusinessContext('dinner spots', USER_LOCATION, 2)
    expect(result).toHaveLength(2)
  })

  it('returns an empty list when the query errors', async () => {
    mockLimit.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })
    expect(await retrieveBusinessContext('food')).toEqual([])
  })

  it('returns an empty list when the supabase client throws', async () => {
    mockCreateClient.mockImplementationOnce(() => {
      throw new Error('cookies outside request scope')
    })
    expect(await retrieveBusinessContext('food')).toEqual([])
  })
})

describe('formatDirectoryContext', () => {
  const base: RetrievedBusiness = {
    name: 'Test Spot',
    category: 'Food & Drink',
    rating: 4.5,
    reviewCount: 10,
    city: 'Diamond Bar',
    priceRange: 2,
    isChain: false,
    distanceMiles: 1.23,
    openNow: true,
  }

  it('renders all known fields on one line', () => {
    const line = formatDirectoryContext([base])
    expect(line).toContain('Test Spot')
    expect(line).toContain('Food & Drink')
    expect(line).toContain('4.5 stars (10 reviews)')
    expect(line).toContain('Diamond Bar')
    expect(line).toContain('$$')
    expect(line).toContain('1.2 mi away')
    expect(line).toContain('Open now')
    expect(line).toContain('Independent')
  })

  it('omits unknown fields and labels chains', () => {
    const line = formatDirectoryContext([
      {
        ...base,
        category: null,
        city: null,
        priceRange: null,
        distanceMiles: null,
        openNow: null,
        isChain: true,
      },
    ])
    expect(line).not.toContain('mi away')
    expect(line).not.toContain('Open now')
    expect(line).not.toContain('$')
    expect(line).toContain('Chain')
    expect(line).not.toContain('Independent')
  })
})

describe('generateAssistantResponse grounding', () => {
  it('injects the retrieved directory into the LLM prompt', async () => {
    await generateAssistantResponse('where should I eat dinner?')

    const prompt = mockGenerateContent.mock.calls[0][0] as string
    expect(prompt).toContain('Local Business Directory')
    expect(prompt).toContain('Little Skewer')
    expect(prompt).toContain('4.8 stars (212 reviews)')
    expect(prompt).toContain('Independent')
    expect(prompt).toContain('Recommend only from this list')
  })

  it('includes distances in the prompt when the user shares a location', async () => {
    await generateAssistantResponse('dinner near me', {
      userContext: { location: USER_LOCATION },
    })

    const prompt = mockGenerateContent.mock.calls[0][0] as string
    expect(prompt).toContain('mi away')
    expect(prompt).toContain("user's current location")
  })

  it('instructs the model not to invent businesses when retrieval is empty', async () => {
    mockLimit.mockResolvedValueOnce({ data: [], error: null })

    await generateAssistantResponse('where should I eat?')

    const prompt = mockGenerateContent.mock.calls[0][0] as string
    expect(prompt).toContain('directory is unavailable')
    expect(prompt).toContain('do NOT name specific businesses')
  })

  it('still answers (ungrounded) when retrieval throws — never crashes the request', async () => {
    mockCreateClient.mockImplementationOnce(() => {
      throw new Error('no request scope')
    })

    const result = await generateAssistantResponse('where should I eat?')

    expect(result.text).toBe('Here are my grounded picks!')
    const prompt = mockGenerateContent.mock.calls[0][0] as string
    expect(prompt).toContain('directory is unavailable')
  })

  it('grounds multi-turn conversations through the chat history system context', async () => {
    const mockSendMessage = vi.fn().mockResolvedValue({
      response: { text: () => 'Follow-up answer' },
    })
    mockStartChat.mockReturnValue({ sendMessage: mockSendMessage })

    await generateAssistantResponse('any cheaper options?', {
      history: [
        { role: 'user', content: 'where should I eat?' },
        { role: 'assistant', content: 'Try Little Skewer!' },
      ],
    })

    const chatConfig = mockStartChat.mock.calls[0][0]
    const systemText = chatConfig.history[0].parts[0].text as string
    expect(systemText).toContain('Local Business Directory')
    expect(systemText).toContain('Little Skewer')
  })
})
