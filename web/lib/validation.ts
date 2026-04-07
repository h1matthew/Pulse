import { z } from "zod";
import {
  escapeHtml,
  sanitizeString,
  sanitizeUrl,
  sanitizeEmail,
  normalizeWhitespace,
  stripHtml,
  containsSqlInjection,
  containsScript,
  sanitizeStringArray,
  sanitizeReviewContent,
  sanitizeFilename,
  sanitizeSearchQuery,
} from "./validation/sanitization";

// Re-export sanitization utilities
export {
  escapeHtml,
  sanitizeString,
  sanitizeUrl,
  sanitizeEmail,
  normalizeWhitespace,
  stripHtml,
  containsSqlInjection,
  containsScript,
  sanitizeStringArray,
  sanitizeReviewContent,
  sanitizeFilename,
  sanitizeSearchQuery,
};

/**
 * ============================================================================
 * Shared Validation — Syntactical & Semantic Rules
 * ============================================================================
 *
 * USER JOURNEY:
 *   Every user-submitted form (review, bookmark, deal claim, login, contact)
 *   passes through these schemas on both the client (instant feedback) and the
 *   server (authoritative gate) before touching the database.
 *
 * SYNTACTICAL VALIDATION (structure / format):
 *   - String length bounds (min/max) for every text field
 *   - UUID format for all entity IDs (business_id, review_id, deal_id)
 *   - Email format (RFC-ish regex) and URL protocol whitelist (http/https only)
 *   - Integer range constraints (rating 1-5, price_range 1-4, coordinates ±90/±180)
 *   - Array cardinality limits (photos max 5, tags max 20)
 *
 * SEMANTIC VALIDATION (meaning / business rules):
 *   - Duplicate review guard (checked server-side via DB unique constraint)
 *   - CAPTCHA verification (bot prevention — checked server-side)
 *   - verified_purchase derived from check-in history (not user-supplied)
 *   - Honeypot field on contact form must be empty (spam trap)
 *   - Report reason must be a known enum value
 *
 * SANITIZATION (see ./validation/sanitization.ts):
 *   - HTML entity escaping on all string inputs (XSS prevention)
 *   - SQL injection pattern detection (defense-in-depth; parameterized queries are primary)
 *   - Script tag / event handler detection
 *   - Filename path-traversal stripping
 *   - Search query length capping + angle-bracket removal
 *
 * ACCESSIBILITY:
 *   - Zod error messages are human-readable, suitable for aria-live announcements
 *   - formatZodError() flattens nested errors into a single string for toast display
 * ============================================================================
 */

// ============================================================================
// Zod Validation Schemas
// ============================================================================

export const businessHoursSchema = z.record(z.string(), z.string().optional()).optional();

export const createBusinessSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000, "Description must be less than 2000 characters").optional(),
  short_description: z.string().max(500, "Short description must be less than 500 characters").optional(),
  address: z.string().min(5, "Address is required").max(200),
  city: z.string().min(2, "City is required").max(100),
  state: z.string().min(2, "State is required").max(50),
  zip_code: z.string().min(5, "ZIP code is required").max(20),
  phone: z.string().max(20).optional(),
  email: z.string().email("Invalid email").max(100).optional(),
  website: z.string().url("Invalid URL").max(200).optional(),
  category_id: z.string().uuid("Invalid category ID").optional(),
  price_range: z.number().int().min(1).max(4).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  amenities: z.array(z.string().max(50)).max(20).optional(),
  hours: businessHoursSchema,
});

export const updateBusinessSchema = createBusinessSchema.partial();

export const createReviewSchema = z.object({
  business_id: z.string().uuid("Invalid business ID"),
  rating: z.number().int().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
  content: z.string().min(10, "Review must be at least 10 characters").max(2000, "Review must be less than 2000 characters"),
  photos: z.array(z.string().url("Invalid photo URL")).max(5).optional(),
});

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  content: z.string().min(10).max(2000).optional(),
  photos: z.array(z.string().url()).max(5).optional(),
});

export const createBookmarkSchema = z.object({
  business_id: z.string().uuid("Invalid business ID"),
  note: z.string().max(500, "Note must be less than 500 characters").optional(),
});

export const updateBookmarkSchema = z.object({
  note: z.string().max(500, "Note must be less than 500 characters").optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100),
});

export const createCheckInSchema = z.object({
  business_id: z.string().uuid("Invalid business ID"),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  spend_amount: z.number().min(0).max(10000).optional(),
  notes: z.string().max(500).optional(),
});

// ============================================================================
// User Preferences Validation
// ============================================================================

export const userPreferencesSchema = z.object({
  preferred_categories: z.array(z.string().uuid()).max(10).optional(),
  price_range: z.array(z.number().int().min(1).max(4)).max(4).optional(),
  max_distance: z.number().min(1).max(100).optional(),
  dietary_restrictions: z.array(z.string().max(50)).max(10).optional(),
  ambiance_preferences: z.array(z.enum([
    "quiet",
    "lively",
    "family-friendly",
    "romantic",
    "professional",
    "casual",
    "trendy",
    "cozy",
  ])).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  accent_color: z.enum(["blue", "green", "purple", "orange", "pink"]).optional(),
});

export const notificationPreferencesSchema = z.object({
  email_digest_frequency: z.enum(["daily", "weekly", "monthly", "never"]).optional(),
  push_notifications: z.boolean().optional(),
  deal_alerts: z.boolean().optional(),
  mission_reminders: z.boolean().optional(),
  bookmark_updates: z.boolean().optional(),
});

export const privacySettingsSchema = z.object({
  profile_visibility: z.enum(["public", "private"]).optional(),
  show_on_leaderboard: z.boolean().optional(),
  anonymous_reviews: z.boolean().optional(),
  allow_data_export: z.boolean().optional(),
});

// ============================================================================
// Contact & Report Forms Validation
// ============================================================================

export const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email").max(100),
  subject: z.string().min(5, "Subject must be at least 5 characters").max(200),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
  honeypot: z.string().max(0, "Spam detected").optional(), // Honeypot field
});

export const reportReviewSchema = z.object({
  review_id: z.string().uuid("Invalid review ID"),
  reason: z.enum([
    "spam",
    "fake_review",
    "inappropriate_content",
    "conflict_of_interest",
    "other",
  ]),
  details: z.string().min(10).max(1000).optional(),
});

// ============================================================================
// Deal & Mission Validation
// ============================================================================

export const claimDealSchema = z.object({
  deal_id: z.string().uuid("Invalid deal ID"),
});

export const createCollectionSchema = z.object({
  name: z.string().min(1, "Collection name is required").max(50),
  description: z.string().max(200).optional(),
  is_public: z.boolean().optional(),
});

export const updateCollectionSchema = createCollectionSchema.partial();

// ============================================================================
// CAPTCHA Validation
// ============================================================================

export const captchaTokenSchema = z.object({
  token: z.string().min(1, "CAPTCHA token is required"),
});

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
}

// ============================================================================
// Legacy Regex Patterns (kept for backwards compatibility)
// ============================================================================

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
