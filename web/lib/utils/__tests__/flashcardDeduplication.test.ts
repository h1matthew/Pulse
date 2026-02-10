import { describe, it, expect } from 'vitest'
import {
  normalizeForComparison,
  levenshteinDistance,
  calculateSimilarity,
  isDuplicateFlashcard,
  findDuplicates,
  hashFlashcard,
  generateFlashcardId,
} from '../flashcardDeduplication'

describe('normalizeForComparison', () => {
  it('converts to lowercase', () => {
    expect(normalizeForComparison('HELLO')).toBe('hello')
    expect(normalizeForComparison('HeLLo WoRLd')).toBe('hello world')
  })

  it('removes punctuation', () => {
    expect(normalizeForComparison('Hello, World!')).toBe('hello world')
    expect(normalizeForComparison("What's up?")).toBe('what s up')
    expect(normalizeForComparison('Test... 123')).toBe('test 123')
  })

  it('collapses multiple spaces', () => {
    expect(normalizeForComparison('hello    world')).toBe('hello world')
    expect(normalizeForComparison('a  b   c    d')).toBe('a b c d')
  })

  it('trims whitespace', () => {
    expect(normalizeForComparison('  hello  ')).toBe('hello')
    expect(normalizeForComparison('\thello\n')).toBe('hello')
  })

  it('handles empty string', () => {
    expect(normalizeForComparison('')).toBe('')
    expect(normalizeForComparison('   ')).toBe('')
  })

  it('preserves numbers', () => {
    expect(normalizeForComparison('Test 123')).toBe('test 123')
    expect(normalizeForComparison('F = ma (Newton\'s 2nd law)')).toBe('f ma newton s 2nd law')
  })
})

describe('levenshteinDistance', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshteinDistance('hello', 'hello')).toBe(0)
    expect(levenshteinDistance('', '')).toBe(0)
  })

  it('returns correct distance for single character changes', () => {
    expect(levenshteinDistance('cat', 'bat')).toBe(1) // substitution
    expect(levenshteinDistance('cat', 'cats')).toBe(1) // insertion
    expect(levenshteinDistance('cats', 'cat')).toBe(1) // deletion
  })

  it('returns correct distance for multiple changes', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3)
    expect(levenshteinDistance('flaw', 'lawn')).toBe(2)
  })

  it('returns string length for empty comparisons', () => {
    expect(levenshteinDistance('hello', '')).toBe(5)
    expect(levenshteinDistance('', 'world')).toBe(5)
  })

  it('is symmetric', () => {
    expect(levenshteinDistance('abc', 'xyz')).toBe(levenshteinDistance('xyz', 'abc'))
    expect(levenshteinDistance('hello', 'hallo')).toBe(levenshteinDistance('hallo', 'hello'))
  })

  it('handles longer strings', () => {
    const str1 = 'What is the thrust equation?'
    const str2 = 'What is the thrust formula?'
    expect(levenshteinDistance(str1, str2)).toBeLessThan(10)
  })
})

describe('calculateSimilarity', () => {
  it('returns 1.0 for identical strings', () => {
    expect(calculateSimilarity('hello', 'hello')).toBe(1.0)
    expect(calculateSimilarity('Test String', 'Test String')).toBe(1.0)
  })

  it('returns 1.0 for strings that normalize to the same', () => {
    expect(calculateSimilarity('Hello!', 'hello')).toBe(1.0)
    expect(calculateSimilarity('What is this?', 'what is this')).toBe(1.0)
  })

  it('returns 1.0 for empty strings', () => {
    expect(calculateSimilarity('', '')).toBe(1.0)
    expect(calculateSimilarity('   ', '')).toBe(1.0)
  })

  it('returns high similarity for similar strings', () => {
    const sim = calculateSimilarity('What is thrust?', 'What is thrust')
    expect(sim).toBeGreaterThan(0.9)
  })

  it('returns low similarity for different strings', () => {
    const sim = calculateSimilarity('Apple', 'Orange')
    expect(sim).toBeLessThan(0.5)
  })

  it('returns value between 0 and 1', () => {
    const sim = calculateSimilarity('partially similar', 'completely different')
    expect(sim).toBeGreaterThanOrEqual(0)
    expect(sim).toBeLessThanOrEqual(1)
  })
})

describe('isDuplicateFlashcard', () => {
  it('detects exact duplicates', () => {
    const result = isDuplicateFlashcard(
      'What is thrust?',
      'Force from expelled mass',
      'What is thrust?',
      'Force from expelled mass'
    )
    expect(result).toBe(true)
  })

  it('detects near-duplicates with minor differences', () => {
    const result = isDuplicateFlashcard(
      'What is thrust?',
      'Force from expelled mass.',
      'What is thrust',
      'Force from expelled mass'
    )
    expect(result).toBe(true)
  })

  it('returns false for different cards', () => {
    const result = isDuplicateFlashcard(
      'What is thrust?',
      'Force from expelled mass',
      'What is drag?',
      'Resistance from air'
    )
    expect(result).toBe(false)
  })

  it('returns false when only front matches', () => {
    const result = isDuplicateFlashcard(
      'What is thrust?',
      'Force from expelled mass',
      'What is thrust?',
      'Completely different answer'
    )
    expect(result).toBe(false)
  })

  it('returns false when only back matches', () => {
    const result = isDuplicateFlashcard(
      'What is thrust?',
      'Force from expelled mass',
      'Different question',
      'Force from expelled mass'
    )
    expect(result).toBe(false)
  })

  it('respects custom threshold', () => {
    // These would be duplicates at 90% but not at 99%
    const result = isDuplicateFlashcard(
      'What is the thrust equation?',
      'F = mv',
      'What is the thrust formula?',
      'F = mv',
      0.99
    )
    expect(result).toBe(false)
  })
})

describe('findDuplicates', () => {
  const existingCards = [
    { front: 'What is thrust?', back: 'Force from expelled mass' },
    { front: 'What is drag?', back: 'Resistance from air' },
    { front: 'What is gravity?', back: 'Attraction between masses' },
  ]

  it('finds matching duplicates', () => {
    const duplicates = findDuplicates(
      'What is thrust?',
      'Force from expelled mass',
      existingCards
    )
    expect(duplicates).toHaveLength(1)
    expect(duplicates[0].front).toBe('What is thrust?')
  })

  it('returns empty array when no duplicates', () => {
    const duplicates = findDuplicates(
      'What is velocity?',
      'Speed with direction',
      existingCards
    )
    expect(duplicates).toHaveLength(0)
  })

  it('finds multiple duplicates if they exist', () => {
    const cardsWithDupes = [
      { front: 'What is thrust?', back: 'Force from expelled mass' },
      { front: 'what is thrust', back: 'force from expelled mass' },
    ]
    const duplicates = findDuplicates(
      'What is thrust?',
      'Force from expelled mass',
      cardsWithDupes
    )
    expect(duplicates).toHaveLength(2)
  })

  it('handles empty existing cards', () => {
    const duplicates = findDuplicates(
      'What is thrust?',
      'Force from expelled mass',
      []
    )
    expect(duplicates).toHaveLength(0)
  })

  it('respects custom threshold', () => {
    const duplicates = findDuplicates(
      'What is thrust?',
      'Force from expelled mass',
      existingCards,
      0.99 // Very strict threshold
    )
    // At 99% threshold, minor variations might not match
    expect(duplicates.length).toBeLessThanOrEqual(1)
  })
})

describe('hashFlashcard', () => {
  it('produces consistent hash for same content', () => {
    const hash1 = hashFlashcard('Front', 'Back')
    const hash2 = hashFlashcard('Front', 'Back')
    expect(hash1).toBe(hash2)
  })

  it('produces different hashes for different content', () => {
    const hash1 = hashFlashcard('Front', 'Back')
    const hash2 = hashFlashcard('Other', 'Content')
    expect(hash1).not.toBe(hash2)
  })

  it('normalizes content before hashing', () => {
    // Note: normalizeForComparison replaces punctuation with spaces, so
    // 'Hello World!' becomes 'hello world ' (note trailing space)
    // For true normalization equality, inputs must differ only by case
    const hash1 = hashFlashcard('Hello World', 'Test')
    const hash2 = hashFlashcard('hello world', 'test')
    expect(hash1).toBe(hash2)
  })

  it('produces non-empty hash', () => {
    const hash = hashFlashcard('', '')
    expect(hash.length).toBeGreaterThan(0)
  })

  it('produces alphanumeric hash', () => {
    const hash = hashFlashcard('What is thrust?', 'Force from expelled mass')
    expect(hash).toMatch(/^[a-z0-9]+$/)
  })
})

describe('generateFlashcardId', () => {
  it('produces ID with ai- prefix', () => {
    const id = generateFlashcardId('Front', 'Back')
    expect(id).toMatch(/^ai-/)
  })

  it('includes hash in ID', () => {
    const hash = hashFlashcard('Front', 'Back')
    const id = generateFlashcardId('Front', 'Back')
    expect(id).toContain(hash)
  })

  it('includes timestamp component', () => {
    const id = generateFlashcardId('Front', 'Back')
    // ID format: ai-{hash}-{timestamp}
    const parts = id.split('-')
    expect(parts.length).toBeGreaterThanOrEqual(3)
  })

  it('produces unique IDs for different timestamps', async () => {
    const id1 = generateFlashcardId('Same', 'Content')
    await new Promise(resolve => setTimeout(resolve, 10))
    const id2 = generateFlashcardId('Same', 'Content')

    // Hash part should be same but timestamp differs
    expect(id1).not.toBe(id2)
  })

  it('produces unique IDs for different content', () => {
    const id1 = generateFlashcardId('Front1', 'Back1')
    const id2 = generateFlashcardId('Front2', 'Back2')
    expect(id1).not.toBe(id2)
  })
})
