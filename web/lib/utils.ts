import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitize code by removing box-drawing and formatting characters
 * that appear when AI generates "pretty" code blocks
 */
export function sanitizeCode(code: string): string {
  return code
    // Remove box-drawing characters (often added by AI for "pretty" formatting)
    .replace(/[│┌┐└┘├┤┬┴┼─═║╔╗╚╝╠╣╦╩╬▏▎▍▌▋▊▉█]/g, '')
    // Remove zero-width characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Remove non-breaking spaces
    .replace(/\u00A0/g, ' ')
    // Remove other common invisible/special characters
    .replace(/[\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Clean up multiple blank lines (keep at most 2)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
