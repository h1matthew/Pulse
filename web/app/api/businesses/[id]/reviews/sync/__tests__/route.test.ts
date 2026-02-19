import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import * as syncModule from '@/lib/reviews/sync-server'

// Mock the sync module
vi.mock('@/lib/reviews/sync-server', () => ({
  syncGoogleReviews: vi.fn(),
}))

// Mock Supabase client
const mockMaybeSingle = vi.fn()
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    from: mockFrom,
  })),
}))

describe('POST /api/businesses/[id]/reviews/sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 when business not found', async () => {
    mockMaybeSingle
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })

    const request = new Request('http://localhost/api/businesses/123/reviews/sync', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: '123' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Business not found')
  })

  it('returns 400 when business has no place_id', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'biz-123', place_id: null, name: 'Test Business' },
      error: null,
    })

    const request = new Request('http://localhost/api/businesses/123/reviews/sync', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: '123' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('No Google Place ID for this business')
  })

  it('returns synced review count on success', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'biz-123', place_id: 'ChIJ123', name: 'Test Business' },
      error: null,
    })

    vi.mocked(syncModule.syncGoogleReviews).mockResolvedValue({
      synced: 5,
      skipped: false,
      googleRating: 4.5,
      googleReviewCount: 127,
    })

    const request = new Request('http://localhost/api/businesses/123/reviews/sync', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: '123' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.synced).toBe(5)
    expect(data.google_rating).toBe(4.5)
    expect(data.google_review_count).toBe(127)
  })

  it('returns 503 when sync is skipped due to API error', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'biz-123', place_id: 'ChIJ123', name: 'Test Business' },
      error: null,
    })

    vi.mocked(syncModule.syncGoogleReviews).mockResolvedValue({
      synced: 0,
      skipped: true,
      error: 'Google Places API error: 403',
    })

    const request = new Request('http://localhost/api/businesses/123/reviews/sync', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: '123' }) })
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.error).toBe('Google Places API error: 403')
  })

  it('returns 500 when sync function returns error not skipped', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'biz-123', place_id: 'ChIJ123', name: 'Test Business' },
      error: null,
    })

    vi.mocked(syncModule.syncGoogleReviews).mockResolvedValue({
      synced: 0,
      skipped: false,
      error: 'Database error',
    })

    const request = new Request('http://localhost/api/businesses/123/reviews/sync', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: '123' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Database error')
  })

  it('calls syncGoogleReviews with correct parameters', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'biz-999', place_id: 'ChIJ456', name: 'Another Business' },
      error: null,
    })

    vi.mocked(syncModule.syncGoogleReviews).mockResolvedValue({
      synced: 3,
      skipped: false,
    })

    const request = new Request('http://localhost/api/businesses/abc-123/reviews/sync', {
      method: 'POST',
    })

    await POST(request, { params: Promise.resolve({ id: 'abc-123' }) })

    expect(syncModule.syncGoogleReviews).toHaveBeenCalledWith('biz-999', 'ChIJ456')
  })

  it('falls back to lookup by place_id when id lookup misses', async () => {
    mockMaybeSingle
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
      .mockResolvedValueOnce({
        data: { id: 'biz-from-place', place_id: 'ChIJ456', name: 'Another Business' },
        error: null,
      })

    vi.mocked(syncModule.syncGoogleReviews).mockResolvedValue({
      synced: 1,
      skipped: false,
    })

    const request = new Request('http://localhost/api/businesses/ChIJ456/reviews/sync', {
      method: 'POST',
    })

    await POST(request, { params: Promise.resolve({ id: 'ChIJ456' }) })

    expect(syncModule.syncGoogleReviews).toHaveBeenCalledWith('biz-from-place', 'ChIJ456')
  })
})
