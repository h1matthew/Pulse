/**
 * Application-wide limits and thresholds.
 * Centralizes magic numbers for easier maintenance and consistency.
 */

/**
 * Rate limits for various API categories
 * These values are also defined in rateLimit.ts for the actual limiter configuration
 */
export const RATE_LIMITS = {
  /** AI tutor chat: messages per hour */
  AI_TUTOR_MESSAGES_PER_HOUR: 30,
  /** General AI requests per minute */
  AI_REQUESTS_PER_MINUTE: 10,
  /** Admin AI endpoints per minute */
  ADMIN_AI_REQUESTS_PER_MINUTE: 10,
  /** Progress tracking mutations per minute */
  PROGRESS_REQUESTS_PER_MINUTE: 30,
  /** General API requests per minute */
  GENERAL_REQUESTS_PER_MINUTE: 60,
  /** Contact form submissions per hour */
  CONTACT_SUBMISSIONS_PER_HOUR: 5,
  /** Auth/destructive operations per hour */
  AUTH_OPERATIONS_PER_HOUR: 3,
} as const

/**
 * Input validation limits
 */
export const INPUT_LIMITS = {
  /** Maximum length for AI tutor questions */
  QUESTION_MAX_LENGTH: 5000,
  /** Maximum length for chat messages */
  MESSAGE_MAX_LENGTH: 10000,
  /** Maximum lesson context length */
  LESSON_CONTEXT_MAX_LENGTH: 10000,
  /** Maximum conversation history messages */
  CONVERSATION_HISTORY_MAX_LENGTH: 50,
  /** Maximum ID length for lesson/module IDs */
  ID_MAX_LENGTH: 100,
  /** Maximum quiz questions per quiz */
  QUIZ_MAX_QUESTIONS: 100,
} as const

/**
 * Pagination and query limits
 */
export const QUERY_LIMITS = {
  /** Default page size for lists */
  DEFAULT_PAGE_SIZE: 20,
  /** Maximum page size for lists */
  MAX_PAGE_SIZE: 100,
  /** Maximum community flashcards per query */
  MAX_COMMUNITY_FLASHCARDS: 500,
  /** Maximum AI flashcards per query */
  MAX_AI_FLASHCARDS: 500,
} as const

/**
 * Cache durations (in milliseconds)
 */
export const CACHE_DURATIONS = {
  /** Stale time for conversation lists (30 seconds) */
  CONVERSATION_LIST_STALE: 30 * 1000,
  /** Stale time for single conversation (10 seconds) */
  CONVERSATION_DETAIL_STALE: 10 * 1000,
  /** Cache garbage collection time (5 minutes) */
  QUERY_GC_TIME: 5 * 60 * 1000,
  /** Rate limit info TTL (2 minutes) */
  RATE_LIMIT_INFO_TTL: 2 * 60 * 1000,
} as const
