/**
 * Input sanitization utilities
 * Prevents XSS and sanitizes user inputs
 */

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(input: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return input.replace(/[&<>"'/]/g, (char) => htmlEscapes[char] || char);
}

/**
 * Sanitize a string by trimming and escaping HTML
 */
export function sanitizeString(input: string | null | undefined): string {
  if (input == null) return '';
  return escapeHtml(input.trim());
}

/**
 * Sanitize a URL string - only allow http/https protocols
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url.trim());
    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitize an email by lowercasing and trimming
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Remove extra whitespace and normalize line breaks
 */
export function normalizeWhitespace(input: string): string {
  return input
    .replace(/\r\n/g, '\n') // Normalize Windows line endings
    .replace(/\r/g, '\n')   // Normalize old Mac line endings
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
    .trim();
}

/**
 * Strip all HTML tags from a string (for plain text fields)
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Check if input contains potential SQL injection patterns
 * Note: This is a basic check - actual protection comes from parameterized queries
 */
export function containsSqlInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(--|#|\/\*|\*\/)/,
    /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/i,
    /';\s*$/,
    /"\s*OR\s*"/i,
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Check if input contains suspicious script content
 */
export function containsScript(input: string): boolean {
  const scriptPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/i,
    /on\w+\s*=/i, // onclick, onload, etc.
    /<iframe/i,
    /<object/i,
    /<embed/i,
  ];

  return scriptPatterns.some(pattern => pattern.test(input));
}

/**
 * Sanitize an array of strings
 */
export function sanitizeStringArray(arr: string[]): string[] {
  return arr
    .map(item => sanitizeString(item))
    .filter(item => item.length > 0);
}

/**
 * Sanitize review content specifically
 * - Normalizes whitespace
 * - Escapes HTML
 * - Preserves allowed formatting (if we later allow markdown)
 */
export function sanitizeReviewContent(content: string): string {
  const normalized = normalizeWhitespace(content);
  return escapeHtml(normalized);
}

/**
 * Validate and sanitize a filename
 */
export function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  const withoutPath = filename.replace(/^.*[\\/]/, '');
  // Remove null bytes
  const withoutNull = withoutPath.replace(/\0/g, '');
  // Limit length
  return withoutNull.slice(0, 255);
}

/**
 * Sanitize search query input
 */
export function sanitizeSearchQuery(query: string): string {
  return query
    .trim()
    .slice(0, 100) // Limit search query length
    .replace(/[<>]/g, ''); // Remove angle brackets
}
