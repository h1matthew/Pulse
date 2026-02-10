import { describe, it, expect } from 'vitest'
import { shuffleArray, normalizeAnswer, isAnswerCorrect } from '../flashcardUtils'

describe('flashcardUtils', () => {
  describe('shuffleArray', () => {
    it('returns array with same length', () => {
      const input = [1, 2, 3, 4, 5]
      const result = shuffleArray(input)
      expect(result).toHaveLength(5)
    })

    it('contains all original elements', () => {
      const input = ['a', 'b', 'c', 'd']
      const result = shuffleArray(input)
      const sorted = [...result].sort()
      expect(sorted).toEqual(['a', 'b', 'c', 'd'])
    })

    it('does not mutate original array', () => {
      const input = [1, 2, 3]
      const original = [...input]
      shuffleArray(input)
      expect(input).toEqual(original)
    })

    it('handles empty array', () => {
      const result = shuffleArray([])
      expect(result).toEqual([])
    })

    it('handles single element', () => {
      const result = shuffleArray([42])
      expect(result).toEqual([42])
    })
  })

  describe('normalizeAnswer', () => {
    it('converts to lowercase', () => {
      expect(normalizeAnswer('GRAVITY')).toBe('gravity')
    })

    it('trims whitespace', () => {
      expect(normalizeAnswer('  thrust  ')).toBe('thrust')
    })

    it('removes punctuation', () => {
      expect(normalizeAnswer('Newton\'s Third Law!')).toBe('newtons third law')
    })

    it('normalizes multiple spaces', () => {
      expect(normalizeAnswer('a  force   that   pulls')).toBe('a force that pulls')
    })

    it('handles complex sentences', () => {
      expect(normalizeAnswer('  Hello, World!  ')).toBe('hello world')
    })

    it('handles empty string', () => {
      expect(normalizeAnswer('')).toBe('')
    })
  })

  describe('isAnswerCorrect', () => {
    it('matches exact answers', () => {
      expect(isAnswerCorrect('gravity', 'gravity')).toBe(true)
    })

    it('ignores case', () => {
      expect(isAnswerCorrect('GRAVITY', 'gravity')).toBe(true)
      expect(isAnswerCorrect('Gravity', 'gravity')).toBe(true)
    })

    it('ignores punctuation', () => {
      expect(isAnswerCorrect('Gravity!', 'gravity')).toBe(true)
      expect(isAnswerCorrect("Newton's law", 'newtons law')).toBe(true)
    })

    it('ignores extra whitespace', () => {
      expect(isAnswerCorrect('  gravity  ', 'gravity')).toBe(true)
      expect(isAnswerCorrect('a  force', 'a force')).toBe(true)
    })

    it('allows minor typos', () => {
      expect(isAnswerCorrect('gravty', 'gravity')).toBe(true)
      expect(isAnswerCorrect('thurst', 'thrust')).toBe(true)
    })

    it('allows typos with custom threshold', () => {
      // 'gravit' vs 'gravity' = 1 char difference, 6 char length = 83% similarity
      expect(isAnswerCorrect('gravit', 'gravity', 0.8)).toBe(true)
      expect(isAnswerCorrect('gravit', 'gravity', 0.9)).toBe(false)
    })

    it('rejects completely wrong answers', () => {
      expect(isAnswerCorrect('thrust', 'gravity')).toBe(false)
      expect(isAnswerCorrect('rocket', 'orbital mechanics')).toBe(false)
    })

    it('rejects empty answers', () => {
      expect(isAnswerCorrect('', 'gravity')).toBe(false)
      expect(isAnswerCorrect('   ', 'gravity')).toBe(false)
    })

    it('handles multi-word answers', () => {
      expect(isAnswerCorrect('a pushing force', 'a pushing force')).toBe(true)
      expect(isAnswerCorrect('pushing force', 'a pushing force')).toBe(true)
    })

    it('handles answers with typos in multi-word phrases', () => {
      expect(isAnswerCorrect('newtons thrid law', 'newtons third law')).toBe(true)
    })
  })
})
