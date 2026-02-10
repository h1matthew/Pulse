/**
 * Flashcard Deduplication Utilities
 * Provides functions to detect duplicate flashcards using text normalization and Levenshtein distance
 */

/**
 * Normalize text for comparison by:
 * - Converting to lowercase
 * - Removing punctuation and special characters
 * - Trimming whitespace
 * - Collapsing multiple spaces to single space
 */
export function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim()
}

/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of single-character edits (insertions, deletions, substitutions)
 * required to change one word into the other
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length

  // Create a 2D array to store distances
  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0))

  // Initialize first row and column
  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      )
    }
  }

  return matrix[len1][len2]
}

/**
 * Calculate similarity percentage between two strings (0-1)
 * Uses normalized Levenshtein distance
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const normalized1 = normalizeForComparison(str1)
  const normalized2 = normalizeForComparison(str2)

  if (normalized1 === normalized2) return 1.0

  const distance = levenshteinDistance(normalized1, normalized2)
  const maxLength = Math.max(normalized1.length, normalized2.length)

  if (maxLength === 0) return 1.0

  return 1 - distance / maxLength
}

/**
 * Check if two flashcards are duplicates
 * Considers both front and back text similarity
 * Threshold: 90% similarity (distance < 10%)
 */
export function isDuplicateFlashcard(
  front1: string,
  back1: string,
  front2: string,
  back2: string,
  threshold: number = 0.9
): boolean {
  const frontSimilarity = calculateSimilarity(front1, front2)
  const backSimilarity = calculateSimilarity(back1, back2)

  // Both front and back must be highly similar
  return frontSimilarity >= threshold && backSimilarity >= threshold
}

/**
 * Find duplicate flashcards in a list
 * Returns array of existing cards that match the new card
 */
export function findDuplicates(
  newFront: string,
  newBack: string,
  existingCards: Array<{ front: string; back: string }>,
  threshold: number = 0.9
): Array<{ front: string; back: string }> {
  return existingCards.filter((card) =>
    isDuplicateFlashcard(newFront, newBack, card.front, card.back, threshold)
  )
}

/**
 * Generate a hash for a flashcard based on front and back text
 * Used for creating unique flashcard IDs
 */
export function hashFlashcard(front: string, back: string): string {
  const normalized = normalizeForComparison(front + back)
  let hash = 0

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36)
}

/**
 * Generate a unique flashcard ID for AI-generated cards
 * Format: "ai-{hash}-{timestamp}"
 */
export function generateFlashcardId(front: string, back: string): string {
  const hash = hashFlashcard(front, back)
  const timestamp = Date.now().toString(36)
  return `ai-${hash}-${timestamp}`
}
