import type { Flashcard } from '@/types/flashcards'

// Flashcards are now managed through the database
// This file provides stubs for backward compatibility
export const FLASHCARDS: Flashcard[] = []

export function getFlashcardsByModule(moduleId: string): Flashcard[] {
  // Flashcards are now fetched from the database via API
  // This function returns an empty array for backward compatibility
  return []
}

export function getAllFlashcards(): Flashcard[] {
  return FLASHCARDS
}
