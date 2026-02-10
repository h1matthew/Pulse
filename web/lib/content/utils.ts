// Content utilities for backward compatibility
// Lesson content is now stored in the database

interface ContentOptions {
  excludeQuizzes?: boolean
}

/**
 * Get concatenated lesson content for AI generation purposes
 * Note: This function now returns empty string as content is in the database.
 * For AI flashcard generation, use the database-backed content APIs instead.
 */
export function getModuleLessonContent(
  moduleId: string,
  lessonIds: string[],
  options?: ContentOptions
): string {
  // Content is now fetched from the database
  // This stub returns empty string for backward compatibility
  // Use the /api/admin/lesson-content endpoint for database-backed content
  console.warn(
    'getModuleLessonContent: Lesson content is now stored in the database. ' +
    'This function returns empty string. Use database APIs instead.'
  )
  return ''
}

/**
 * Get all lesson IDs for a module
 */
export function getModuleLessonIds(moduleId: string): string[] {
  // Modules are now fetched from the database
  return []
}
