/**
 * Utility functions for flashcard study modes
 */

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @param array - The array to shuffle
 * @returns A new shuffled array
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Normalize text for comparison
 * - Convert to lowercase
 * - Trim whitespace
 * - Remove common punctuation
 * @param text - The text to normalize
 * @returns Normalized text
 */
export function normalizeAnswer(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"]/g, '')
    .replace(/\s+/g, ' ')
}

/**
 * Calculate Levenshtein distance between two strings
 * @param a - First string
 * @param b - Second string
 * @returns The edit distance
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  // Initialize first column
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  // Initialize first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  // Fill the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Check if a user's answer is correct using fuzzy matching
 * - Exact matches always pass
 * - Uses Levenshtein distance for typo tolerance
 * - Normalized comparison (case-insensitive, no punctuation)
 * @param userAnswer - The answer provided by the user
 * @param correctAnswer - The correct answer
 * @param threshold - Similarity threshold (0-1), default 0.7
 * @returns true if answer is correct or close enough
 */
export function isAnswerCorrect(
  userAnswer: string,
  correctAnswer: string,
  threshold = 0.65
): boolean {
  const user = normalizeAnswer(userAnswer)
  const correct = normalizeAnswer(correctAnswer)

  // Exact match after normalization
  if (user === correct) return true

  // Empty answer is always wrong
  if (user.length === 0) return false

  // Calculate similarity using Levenshtein distance
  const distance = levenshteinDistance(user, correct)
  const maxLength = Math.max(user.length, correct.length)
  const similarity = 1 - distance / maxLength

  return similarity >= threshold
}
