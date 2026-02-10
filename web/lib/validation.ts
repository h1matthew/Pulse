/**
 * Shared validation patterns and utilities.
 * Consolidates regex patterns used across the codebase.
 */

/**
 * Common regex patterns for validation
 */
export const PATTERNS = {
  /** UUID v4 format validation */
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,

  /** Basic email validation (not RFC 5322 compliant, but catches common issues) */
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  /** Slug format: lowercase letters, numbers, hyphens */
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,

  /** Safe filename: alphanumeric, hyphens, underscores, dots */
  SAFE_FILENAME: /^[\w\-. ]+$/,
} as const

/**
 * Validate a UUID string
 */
export function isValidUUID(value: string): boolean {
  return PATTERNS.UUID.test(value)
}

/**
 * Validate an email string
 */
export function isValidEmail(value: string): boolean {
  return PATTERNS.EMAIL.test(value)
}

/**
 * Validate a slug string
 */
export function isValidSlug(value: string): boolean {
  return PATTERNS.SLUG.test(value)
}

/**
 * Validate a filename is safe
 */
export function isSafeFilename(value: string): boolean {
  return PATTERNS.SAFE_FILENAME.test(value) && !value.includes('..')
}

/**
 * Validate a non-negative integer
 */
export function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

/**
 * Validate a positive integer
 */
export function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

/**
 * Validate string length is within bounds
 */
export function isWithinLength(value: string, maxLength: number, minLength = 0): boolean {
  return value.length >= minLength && value.length <= maxLength
}
