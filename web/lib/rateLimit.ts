import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'
import { NextRequest } from 'next/server'

const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

// Check if Upstash (or Vercel KV) is configured
const isUpstashConfigured = Boolean(redisUrl && redisToken)

// Initialize Redis client only when configured to avoid runtime warnings
const redis = isUpstashConfigured ? new Redis({ url: redisUrl!, token: redisToken! }) : null

// Rate limit info structure stored in Redis
interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
}

// In-memory cache for rate limit info (used when Upstash is not configured)
// This allows the rate limit display to work in development without Redis
const rateLimitCache = new Map<string, { info: RateLimitInfo; expires: number }>()

// In-memory rate limiter for development (tracks actual request counts)
// Structure: { count: number, windowStart: number }
const devRateLimiter = new Map<string, { count: number; windowStart: number }>()

// Rate limiters by category using sliding window algorithm
// AI tutor chat: 30 messages per hour
const aiTutorLimiter = isUpstashConfigured
  ? new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(30, '1 h'),
      prefix: 'ratelimit:ai-tutor',
      analytics: true,
    })
  : null

// AI endpoints: 10 requests per 60 seconds
const aiLimiter = isUpstashConfigured
  ? new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      prefix: 'ratelimit:ai',
      analytics: true,
    })
  : null

// Admin AI endpoints: 10 requests per 60 seconds
const adminAiLimiter = isUpstashConfigured
  ? new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      prefix: 'ratelimit:admin-ai',
      analytics: true,
    })
  : null

// Progress/mutations: 30 requests per 60 seconds
const progressLimiter = isUpstashConfigured
  ? new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(30, '60 s'),
      prefix: 'ratelimit:progress',
      analytics: true,
    })
  : null

// General API: 60 requests per 60 seconds
const generalLimiter = isUpstashConfigured
  ? new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(60, '60 s'),
      prefix: 'ratelimit:general',
      analytics: true,
    })
  : null

// Contact form: 5 requests per hour (stricter limit)
const contactLimiter = isUpstashConfigured
  ? new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(5, '1 h'),
      prefix: 'ratelimit:contact',
      analytics: true,
    })
  : null

// Auth/destructive operations: 3 requests per hour (very restrictive)
const authLimiter = isUpstashConfigured
  ? new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(3, '1 h'),
      prefix: 'ratelimit:auth',
      analytics: true,
    })
  : null

export interface RateLimitResult {
  success: boolean
  remaining: number
  retryAfterMs: number
  limit: number
  reset: number // Timestamp when the rate limit window resets
}

export type RateLimitCategory = 'ai' | 'ai-tutor' | 'admin-ai' | 'progress' | 'general' | 'contact' | 'auth'

// Get the appropriate limiter based on category
function getLimiter(category: RateLimitCategory): Ratelimit | null {
  switch (category) {
    case 'ai':
      return aiLimiter
    case 'ai-tutor':
      return aiTutorLimiter
    case 'admin-ai':
      return adminAiLimiter
    case 'progress':
      return progressLimiter
    case 'contact':
      return contactLimiter
    case 'auth':
      return authLimiter
    case 'general':
    default:
      return generalLimiter
  }
}

// Get limit for category (for headers)
function getLimitForCategory(category: RateLimitCategory): number {
  switch (category) {
    case 'ai-tutor':
      return 30
    case 'ai':
    case 'admin-ai':
      return 10
    case 'progress':
      return 30
    case 'contact':
      return 5
    case 'auth':
      return 3
    case 'general':
    default:
      return 60
  }
}

// Get window duration in ms for a category
function getWindowDurationMs(category: RateLimitCategory): number {
  switch (category) {
    case 'contact':
    case 'auth':
    case 'ai-tutor':
      return 3600000 // 1 hour
    default:
      return 60000 // 60 seconds
  }
}

/**
 * Check rate limit for a given identifier and category
 * @param identifier - Unique identifier (usually IP address or user ID)
 * @param category - Rate limit category
 * @returns RateLimitResult with success status and metadata
 */
export async function checkRateLimit(
  identifier: string,
  category: RateLimitCategory = 'general'
): Promise<RateLimitResult> {
  const limiter = getLimiter(category)
  const limit = getLimitForCategory(category)
  const windowMs = getWindowDurationMs(category)

  // If Upstash is not configured, use in-memory rate limiter (development mode)
  if (!limiter) {
    const key = `dev:${category}:${identifier}`
    const now = Date.now()
    const entry = devRateLimiter.get(key)

    // Check if we have an existing window
    if (entry && now - entry.windowStart < windowMs) {
      // Within the same window
      entry.count++
      const remaining = Math.max(0, limit - entry.count)
      const reset = entry.windowStart + windowMs

      return {
        success: entry.count <= limit,
        remaining,
        retryAfterMs: entry.count > limit ? reset - now : 0,
        limit,
        reset,
      }
    } else {
      // Start a new window
      devRateLimiter.set(key, { count: 1, windowStart: now })
      return {
        success: true,
        remaining: limit - 1,
        retryAfterMs: 0,
        limit,
        reset: now + windowMs,
      }
    }
  }

  try {
    const result = await limiter.limit(identifier)

    return {
      success: result.success,
      remaining: result.remaining,
      retryAfterMs: result.success ? 0 : Math.max(0, result.reset - Date.now()),
      limit,
      reset: result.reset,
    }
  } catch (error) {
    console.error('Rate limit check failed:', error)
    // On error, allow the request but log it
    return {
      success: true,
      remaining: limit,
      retryAfterMs: 0,
      limit,
      reset: Date.now() + windowMs,
    }
  }
}

/**
 * Determine rate limit category based on request path
 */
export function getCategoryFromPath(pathname: string): RateLimitCategory {
  // AI tutor chat endpoints (only count user message sends)
  if (
    pathname.startsWith('/api/ai/conversations') &&
    pathname.includes('/messages')
  ) {
    return 'ai-tutor'
  }

  if (pathname.startsWith('/api/gemini/ask')) {
    return 'ai-tutor'
  }

  // AI endpoints - includes Gemini AI, flashcard generation/grading
  if (
    pathname.startsWith('/api/gemini/') ||
    pathname.startsWith('/api/flashcards/generate') ||
    pathname.startsWith('/api/flashcards/grade')
  ) {
    return 'ai'
  }

  // Admin AI endpoints - AI generation for admin content
  if (
    pathname.startsWith('/api/admin/generate-content') ||
    pathname.startsWith('/api/admin/generate-quiz') ||
    pathname.startsWith('/api/admin/generate-video') ||
    pathname.startsWith('/api/admin/quizzes') ||
    pathname.startsWith('/api/admin/video-chat')
  ) {
    return 'admin-ai'
  }

  // Progress/mutations - user progress tracking and AI chat
  if (
    pathname.startsWith('/api/lessons/progress') ||
    pathname.startsWith('/api/practice/progress')
  ) {
    return 'progress'
  }

  // Auth/destructive operations - account deletion, etc.
  if (pathname.startsWith('/api/auth/delete-account')) {
    return 'auth'
  }

  // Contact form
  if (pathname.startsWith('/api/contact')) {
    return 'contact'
  }

  // Default to general
  return 'general'
}

/**
 * Legacy synchronous rate limit function for backward compatibility
 * @deprecated Use checkRateLimit instead
 */
export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number }
): { success: boolean; remaining: number; retryAfterMs: number } {
  // This is a no-op now - actual rate limiting happens in middleware
  // Kept for backward compatibility during migration
  console.warn(
    'Synchronous rateLimit() is deprecated. Rate limiting is now handled by middleware.'
  )
  return {
    success: true,
    remaining: opts.limit,
    retryAfterMs: 0,
  }
}

/**
 * Store rate limit info in Redis for route handlers to read
 * Called by middleware after checking rate limit
 */
export async function storeRateLimitInfo(
  identifier: string,
  category: RateLimitCategory,
  info: RateLimitInfo
): Promise<void> {
  const key = `ratelimit-info:${category}:${identifier}`

  // Use in-memory cache when Upstash is not configured (development mode)
  if (!isUpstashConfigured || !redis) {
    rateLimitCache.set(key, {
      info,
      expires: Date.now() + 120000, // 2 min TTL
    })
    return
  }

  try {
    await redis.set(key, JSON.stringify(info), { ex: 120 }) // 2 min TTL
  } catch (error) {
    console.error('Failed to store rate limit info:', error)
  }
}

/**
 * Get rate limit info from Redis (or in-memory cache in development)
 * Called by route handlers to retrieve rate limit state set by middleware
 */
export async function getRateLimitInfoFromRedis(
  identifier: string,
  category: RateLimitCategory
): Promise<RateLimitInfo | null> {
  const key = `ratelimit-info:${category}:${identifier}`

  // Use in-memory cache when Upstash is not configured (development mode)
  if (!isUpstashConfigured || !redis) {
    const cached = rateLimitCache.get(key)
    if (cached && cached.expires > Date.now()) {
      return cached.info
    }
    // Clean up expired entry
    if (cached) {
      rateLimitCache.delete(key)
    }
    return null
  }

  try {
    const data = await redis.get<string>(key)
    if (!data) return null

    // Handle both string and already-parsed object (Upstash can return either)
    if (typeof data === 'string') {
      return JSON.parse(data) as RateLimitInfo
    }
    return data as unknown as RateLimitInfo
  } catch (error) {
    console.error('Failed to get rate limit info:', error)
    return null
  }
}

/**
 * Peek at the current rate limit state without incrementing the counter
 * Used by route handlers when the cached value is unavailable
 */
export function peekRateLimitState(
  identifier: string,
  category: RateLimitCategory
): RateLimitInfo | null {
  // Only works in development mode (when using in-memory rate limiter)
  if (isUpstashConfigured) return null

  const key = `dev:${category}:${identifier}`
  const limit = getLimitForCategory(category)
  const windowMs = getWindowDurationMs(category)
  const now = Date.now()
  const entry = devRateLimiter.get(key)

  if (entry && now - entry.windowStart < windowMs) {
    return {
      limit,
      remaining: Math.max(0, limit - entry.count),
      reset: entry.windowStart + windowMs,
    }
  }

  // No entry or expired - return full limit
  return {
    limit,
    remaining: limit,
    reset: now + windowMs,
  }
}

/**
 * Helper to get rate limit info for a request.
 * Uses Redis in production, falls back to in-memory state in development.
 * This consolidates the duplicate getRateLimitInfo patterns in route handlers.
 *
 * @param request - The NextRequest object
 * @returns Rate limit info or null if unavailable
 */
export async function getRateLimitInfo(request: NextRequest): Promise<{
  limit: number
  remaining: number
  reset: number
} | null> {
  const ip = getClientIP(request)
  const category = getCategoryFromPath(request.nextUrl.pathname)

  // Try to get from Redis first (works in production with Upstash)
  const info = await getRateLimitInfoFromRedis(ip, category)
  if (info) return info

  // Fallback: peek local dev state (does not increment)
  const peek = peekRateLimitState(ip, category)
  if (peek) return peek

  return null
}

/**
 * Get client IP address from request headers
 * Works across different hosting environments (Vercel, Cloudflare, etc.)
 */
export function getClientIP(request: NextRequest): string {
  // Check various headers that may contain the real IP
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim()
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  // Vercel-specific header
  const vercelForwardedFor = request.headers.get('x-vercel-forwarded-for')
  if (vercelForwardedFor) {
    return vercelForwardedFor.split(',')[0].trim()
  }

  // Fallback to a default identifier
  return 'unknown'
}
