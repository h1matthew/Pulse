import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIP, RateLimitCategory } from '@/lib/rateLimit'

/**
 * Enforce rate limiting and return error response if limit exceeded.
 * Returns null if within limit (request can proceed).
 *
 * @param request - The NextRequest object
 * @param category - Rate limit category from lib/rateLimit.ts
 * @returns NextResponse with 429 status if rate limited, null otherwise
 *
 * @example
 * export async function POST(request: NextRequest) {
 *   const rateLimitError = await enforceRateLimit(request, 'admin-ai')
 *   if (rateLimitError) return rateLimitError
 *
 *   // Continue processing...
 * }
 */
export async function enforceRateLimit(
  request: NextRequest,
  category: RateLimitCategory
): Promise<NextResponse | null> {
  const ip = getClientIP(request)
  const result = await checkRateLimit(ip, category)

  if (!result.success) {
    const retryAfter = Math.ceil(result.retryAfterMs / 1000)
    return NextResponse.json(
      {
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
        },
      }
    )
  }

  return null
}

/**
 * Get rate limit info with headers for successful responses.
 * Useful for including rate limit headers in successful responses.
 *
 * @param request - The NextRequest object
 * @param category - Rate limit category
 * @returns Object with remaining, limit, and reset values
 */
export async function getRateLimitHeaders(
  request: NextRequest,
  category: RateLimitCategory
): Promise<{
  'X-RateLimit-Limit': string
  'X-RateLimit-Remaining': string
  'X-RateLimit-Reset': string
}> {
  const ip = getClientIP(request)
  const result = await checkRateLimit(ip, category)

  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(Math.max(0, result.remaining)),
    'X-RateLimit-Reset': String(result.reset),
  }
}
