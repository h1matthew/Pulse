/**
 * Prompt sanitization utilities for assistant inputs.
 * Prevents prompt injection attacks by escaping and filtering malicious patterns.
 */

/**
 * Sanitize user input for safe inclusion in assistant prompts.
 * Prevents prompt injection attacks by:
 * 1. Limiting input length
 * 2. Stripping control characters
 * 3. Escaping special instruction markers
 * 4. Neutralizing common injection patterns
 *
 * @param input - The user input to sanitize
 * @param maxLength - Maximum allowed length (default: 2000)
 * @returns Sanitized string safe for AI prompts
 *
 * @example
 * const userPrompt = sanitizeForPrompt(req.body.prompt, 5000)
 * const systemPrompt = `Generate content for: ${userPrompt}`
 */
export function sanitizeForPrompt(input: string, maxLength = 2000): string {
  if (!input || typeof input !== 'string') return ''

  return input
    // Limit length first to prevent processing huge strings
    .slice(0, maxLength)
    // Remove null bytes and control characters (except newlines/tabs)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Escape markdown-like instruction markers that could confuse the model
    .replace(/^#{1,6}\s/gm, '\\# ')
    .replace(/^##\s*(System|Instructions|Rules|Context|IMPORTANT)/gim, '[Section: $1]')
    // Neutralize common injection patterns
    .replace(/ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|rules?|context)/gi, '[filtered]')
    .replace(/disregard\s+(all\s+)?(previous|above|prior)/gi, '[filtered]')
    .replace(/new\s+instructions?:/gi, '[filtered]:')
    .replace(/you\s+are\s+now/gi, '[filtered]')
    .replace(/from\s+now\s+on/gi, '[filtered]')
    .replace(/forget\s+(everything|all)/gi, '[filtered]')
    // Escape XML-like tags that might be interpreted as system markers
    .replace(/<\/?system[^>]*>/gi, '[tag]')
    .replace(/<\/?instructions?[^>]*>/gi, '[tag]')
    .replace(/<\/?context[^>]*>/gi, '[tag]')
    .trim()
}

/**
 * Sanitize lesson/content context which may contain structured content.
 * Less aggressive than user input sanitization since content comes from
 * trusted sources (database/files).
 *
 * @param input - The context to sanitize
 * @param maxLength - Maximum allowed length (default: 5000)
 * @returns Sanitized string
 */
export function sanitizeLessonContext(input: string, maxLength = 5000): string {
  if (!input || typeof input !== 'string') return ''

  return input
    .slice(0, maxLength)
    // Remove null bytes and control characters (except newlines/tabs)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
}

/**
 * Sanitize assistant content before displaying to users.
 * Removes potentially harmful patterns from generated output.
 *
 * @param content - The content to sanitize
 * @returns Sanitized content safe for display
 */
export function sanitizeAIOutput(content: string): string {
  if (!content || typeof content !== 'string') return ''

  return content
    // Remove any script tags (unlikely but defensive)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    // Remove any on* event handlers
    .replace(/\bon\w+\s*=/gi, '')
    // Remove javascript: URLs
    .replace(/javascript:/gi, '')
    .trim()
}
