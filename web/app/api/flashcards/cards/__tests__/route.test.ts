import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'

// Mock supabase
const mockUser = { id: 'user-123', email: 'test@example.com' }
const mockFrom = vi.fn()

function createQueryResult(data: unknown, error: unknown = null) {
  const result = { data, error }
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    range: vi.fn(() => builder),
    then: vi.fn((resolve) => Promise.resolve(result).then(resolve)),
  }
  return builder
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: mockUser } })),
    },
    from: mockFrom,
  })),
}))

vi.mock('@/lib/content/flashcards', () => ({
  FLASHCARDS: [
    { id: 'card-1', moduleId: 'module-1', front: 'Q1', back: 'A1', difficulty: 'easy' },
    { id: 'card-2', moduleId: 'module-1', front: 'Q2', back: 'A2', difficulty: 'medium' },
    { id: 'card-3', moduleId: 'module-2', front: 'Q3', back: 'A3', difficulty: 'hard' },
  ],
}))

describe('GET /api/flashcards/cards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns all flashcards without filters', async () => {
    // Mock community cards query
    mockFrom.mockReturnValueOnce(createQueryResult([]))

    const request = new NextRequest('http://localhost/api/flashcards/cards')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.count).toBe(3)
    expect(json.cards.length).toBe(3)
  })

  it('filters by moduleId when provided', async () => {
    // Mock community cards query
    mockFrom.mockReturnValueOnce(createQueryResult([]))

    const request = new NextRequest('http://localhost/api/flashcards/cards?moduleId=module-1')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.count).toBe(2)
    expect(json.cards.every((c: { moduleId: string }) => c.moduleId === 'module-1')).toBe(true)
  })

  it('includes AI-generated flashcards when includeAI=true', async () => {
    const mockAICards = [
      { flashcard_id: 'ai-1', module_id: 'module-1', front: 'AI Q1', back: 'AI A1', difficulty: 'easy' },
    ]

    // Mock community cards query
    mockFrom.mockReturnValueOnce(createQueryResult([]))

    // Mock AI cards query
    mockFrom.mockReturnValueOnce(createQueryResult(mockAICards))

    const request = new NextRequest('http://localhost/api/flashcards/cards?includeAI=true')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.count).toBe(4) // 3 hardcoded + 1 AI
    expect(json.cards.some((c: { isAiGenerated: boolean }) => c.isAiGenerated)).toBe(true)
  })

  it('excludes known cards when excludeKnown=true', async () => {
    const mockKnownCards = [{ flashcard_id: 'card-1' }, { flashcard_id: 'card-2' }]

    // Mock community cards query
    mockFrom.mockReturnValueOnce(createQueryResult([]))

    // Mock known cards query
    mockFrom.mockReturnValueOnce(createQueryResult(mockKnownCards))

    const request = new NextRequest('http://localhost/api/flashcards/cards?excludeKnown=true')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.count).toBe(1) // Only card-3 not known
    expect(json.cards[0].id).toBe('card-3')
  })

  it('includes community flashcards', async () => {
    const mockCommunityCards = [
      { id: 'comm-1', module_id: 'module-1', front: 'Community Q', back: 'Community A', hint: 'A hint', difficulty: 'medium', status: 'approved' },
    ]

    // Mock community cards query
    mockFrom.mockReturnValueOnce(createQueryResult(mockCommunityCards))

    const request = new NextRequest('http://localhost/api/flashcards/cards')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.count).toBe(4) // 3 hardcoded + 1 community
    expect(json.cards.some((c: { front: string }) => c.front === 'Community Q')).toBe(true)
  })

  it('handles community flashcards query error gracefully', async () => {
    // Mock community cards query with error
    mockFrom.mockReturnValueOnce(createQueryResult(null, new Error('DB error')))

    const request = new NextRequest('http://localhost/api/flashcards/cards')
    const response = await GET(request)

    // Should still succeed with just hardcoded cards
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.count).toBe(3)
  })

  it('does not require authentication for reading cards', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: null } })),
      },
      from: mockFrom,
    } as never)

    // Mock community cards query
    mockFrom.mockReturnValueOnce(createQueryResult([]))

    const request = new NextRequest('http://localhost/api/flashcards/cards')
    const response = await GET(request)

    // Should succeed even without auth
    expect(response.status).toBe(200)
  })
})
