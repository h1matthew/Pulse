import { LessonData } from '@/types/course'

// Lesson content is now stored in the database
// This file provides a stub for backward compatibility
const LESSON_CONTENT: Record<string, LessonData> = {}

export function getLessonContent(lessonId: string): LessonData | undefined {
  return LESSON_CONTENT[lessonId]
}
