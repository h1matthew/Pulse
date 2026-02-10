/**
 * Security utilities for API route handlers.
 *
 * This module provides reusable helpers for:
 * - Authentication and authorization
 * - Rate limiting enforcement
 * - Input validation
 * - Prompt sanitization
 *
 * @example
 * import { requireAuth, enforceRateLimit, validateUUIDParam, sanitizeForPrompt } from '@/lib/security'
 *
 * export async function POST(request: NextRequest, { params }: RouteParams) {
 *   // 1. Check authentication
 *   const { user, supabase, error: authError } = await requireAuth()
 *   if (authError) return authError
 *
 *   // 2. Enforce rate limiting
 *   const rateLimitError = await enforceRateLimit(request, 'ai')
 *   if (rateLimitError) return rateLimitError
 *
 *   // 3. Validate input
 *   const { id } = await params
 *   const uuidError = validateUUIDParam(id, 'resource ID')
 *   if (uuidError) return uuidError
 *
 *   // 4. Sanitize user input for AI
 *   const { prompt } = await request.json()
 *   const sanitizedPrompt = sanitizeForPrompt(prompt)
 *
 *   // ... rest of handler
 * }
 */

// Authentication and authorization helpers
export { requireAuth, requireAdmin } from './authMiddleware'

// Rate limiting helpers
export { enforceRateLimit, getRateLimitHeaders } from './rateLimitHelper'

// Input validation helpers
export {
  validateUUIDParam,
  validateOptionalUUID,
  validateStringLength,
  validateRequiredString,
  validateUUIDArray,
  validateEnum,
  validateIntegerBounds,
} from './inputValidation'

// Prompt sanitization helpers
export { sanitizeForPrompt, sanitizeLessonContext, sanitizeAIOutput } from './sanitize'
