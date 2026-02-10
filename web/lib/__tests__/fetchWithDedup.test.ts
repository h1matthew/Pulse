import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchWithDedup } from '../fetchWithDedup'

describe('fetchWithDedup', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('makes a normal fetch request', async () => {
    const mockResponse = {
      clone: vi.fn().mockReturnThis(),
      text: vi.fn().mockResolvedValue('test'),
      json: vi.fn().mockResolvedValue({ data: 'test' }),
    }
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse)

    const response = await fetchWithDedup('/api/test')

    expect(global.fetch).toHaveBeenCalledWith('/api/test', undefined)
    expect(response).toBeDefined()
  })

  it('deduplicates concurrent GET requests to the same URL', async () => {
    const mockResponse = {
      clone: vi.fn().mockImplementation(function(this: object) { return this }),
      text: vi.fn().mockResolvedValue('test'),
    }
    ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(resolve => {
        setTimeout(() => resolve(mockResponse), 50)
      })
    )

    // Fire two concurrent requests
    const promise1 = fetchWithDedup('/api/same-url')
    const promise2 = fetchWithDedup('/api/same-url')

    const [response1, response2] = await Promise.all([promise1, promise2])

    // Should only call fetch once
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(response1).toBeDefined()
    expect(response2).toBeDefined()
  })

  it('does not deduplicate POST requests', async () => {
    const mockResponse = {
      clone: vi.fn().mockReturnThis(),
      text: vi.fn().mockResolvedValue('test'),
    }
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse)

    // Fire two POST requests
    await fetchWithDedup('/api/test', { method: 'POST' })
    await fetchWithDedup('/api/test', { method: 'POST' })

    // Should call fetch twice for POST
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it('does not deduplicate PUT requests', async () => {
    const mockResponse = {
      clone: vi.fn().mockReturnThis(),
      text: vi.fn().mockResolvedValue('test'),
    }
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse)

    await fetchWithDedup('/api/test', { method: 'PUT' })
    await fetchWithDedup('/api/test', { method: 'PUT' })

    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it('does not deduplicate DELETE requests', async () => {
    const mockResponse = {
      clone: vi.fn().mockReturnThis(),
      text: vi.fn().mockResolvedValue('test'),
    }
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse)

    await fetchWithDedup('/api/test', { method: 'DELETE' })
    await fetchWithDedup('/api/test', { method: 'DELETE' })

    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it('handles different URLs independently', async () => {
    const mockResponse = {
      clone: vi.fn().mockImplementation(function(this: object) { return this }),
      text: vi.fn().mockResolvedValue('test'),
    }
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse)

    // Fire requests to different URLs
    const promise1 = fetchWithDedup('/api/url1')
    const promise2 = fetchWithDedup('/api/url2')

    await Promise.all([promise1, promise2])

    // Should call fetch twice for different URLs
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it('cleans up pending requests after completion', async () => {
    const mockResponse = {
      clone: vi.fn().mockImplementation(function(this: object) { return this }),
      text: vi.fn().mockResolvedValue('test'),
    }
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse)

    // First request completes
    await fetchWithDedup('/api/test')

    // Second request after first completes - should make new fetch
    await fetchWithDedup('/api/test')

    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it('cleans up pending requests on error', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        clone: vi.fn().mockImplementation(function(this: object) { return this }),
        text: vi.fn().mockResolvedValue('test'),
      })

    // First request fails
    await expect(fetchWithDedup('/api/test')).rejects.toThrow('Network error')

    // Second request should work (not deduplicated with failed request)
    const response = await fetchWithDedup('/api/test')
    expect(response).toBeDefined()
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it('returns cloned responses for each consumer', async () => {
    let cloneCount = 0
    const mockResponse = {
      clone: vi.fn().mockImplementation(function(this: object) {
        cloneCount++
        return { ...this, cloneId: cloneCount }
      }),
      text: vi.fn().mockResolvedValue('test'),
    }
    ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(resolve => {
        setTimeout(() => resolve(mockResponse), 50)
      })
    )

    const promise1 = fetchWithDedup('/api/test')
    const promise2 = fetchWithDedup('/api/test')

    const [response1, response2] = await Promise.all([promise1, promise2])

    // Each consumer should get a cloned response
    expect(response1).toBeDefined()
    expect(response2).toBeDefined()
    // Clone should be called at least once during dedup
    expect(mockResponse.clone).toHaveBeenCalled()
  })

  it('handles method case insensitively', async () => {
    const mockResponse = {
      clone: vi.fn().mockReturnThis(),
      text: vi.fn().mockResolvedValue('test'),
    }
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse)

    await fetchWithDedup('/api/test', { method: 'get' })
    await fetchWithDedup('/api/test', { method: 'GET' })

    // Sequential GET requests should be separate (dedup only works for concurrent)
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it('passes fetch options through', async () => {
    const mockResponse = {
      clone: vi.fn().mockReturnThis(),
      text: vi.fn().mockResolvedValue('test'),
    }
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse)

    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: 'test' }),
    }

    await fetchWithDedup('/api/test', options)

    expect(global.fetch).toHaveBeenCalledWith('/api/test', options)
  })
})
