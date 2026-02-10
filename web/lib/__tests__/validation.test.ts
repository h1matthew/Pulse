import { describe, it, expect } from 'vitest'
import {
  PATTERNS,
  isValidUUID,
  isValidEmail,
  isValidSlug,
  isSafeFilename,
  isNonNegativeInteger,
  isPositiveInteger,
  isWithinLength,
} from '../validation'

describe('validation patterns', () => {
  describe('PATTERNS.UUID', () => {
    it('matches valid UUID v4 format', () => {
      expect(PATTERNS.UUID.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
      expect(PATTERNS.UUID.test('123e4567-e89b-12d3-a456-426614174000')).toBe(true)
    })

    it('is case insensitive', () => {
      expect(PATTERNS.UUID.test('550E8400-E29B-41D4-A716-446655440000')).toBe(true)
      expect(PATTERNS.UUID.test('550e8400-E29B-41d4-A716-446655440000')).toBe(true)
    })

    it('rejects invalid UUIDs', () => {
      expect(PATTERNS.UUID.test('not-a-uuid')).toBe(false)
      expect(PATTERNS.UUID.test('550e8400-e29b-41d4-a716')).toBe(false) // too short
      expect(PATTERNS.UUID.test('550e8400-e29b-41d4-a716-4466554400001')).toBe(false) // too long
      expect(PATTERNS.UUID.test('550e8400e29b41d4a716446655440000')).toBe(false) // no hyphens
      expect(PATTERNS.UUID.test('')).toBe(false)
    })
  })

  describe('PATTERNS.EMAIL', () => {
    it('matches valid email formats', () => {
      expect(PATTERNS.EMAIL.test('test@example.com')).toBe(true)
      expect(PATTERNS.EMAIL.test('user.name@domain.org')).toBe(true)
      expect(PATTERNS.EMAIL.test('user+tag@example.co.uk')).toBe(true)
    })

    it('rejects invalid email formats', () => {
      expect(PATTERNS.EMAIL.test('not-an-email')).toBe(false)
      expect(PATTERNS.EMAIL.test('missing@domain')).toBe(false)
      expect(PATTERNS.EMAIL.test('@nodomain.com')).toBe(false)
      expect(PATTERNS.EMAIL.test('spaces in@email.com')).toBe(false)
      expect(PATTERNS.EMAIL.test('')).toBe(false)
    })
  })

  describe('PATTERNS.SLUG', () => {
    it('matches valid slug formats', () => {
      expect(PATTERNS.SLUG.test('hello-world')).toBe(true)
      expect(PATTERNS.SLUG.test('simple')).toBe(true)
      expect(PATTERNS.SLUG.test('with123numbers')).toBe(true)
      expect(PATTERNS.SLUG.test('multiple-word-slug')).toBe(true)
    })

    it('rejects invalid slug formats', () => {
      expect(PATTERNS.SLUG.test('UPPERCASE')).toBe(false)
      expect(PATTERNS.SLUG.test('with spaces')).toBe(false)
      expect(PATTERNS.SLUG.test('with_underscore')).toBe(false)
      expect(PATTERNS.SLUG.test('-starts-with-hyphen')).toBe(false)
      expect(PATTERNS.SLUG.test('ends-with-hyphen-')).toBe(false)
      expect(PATTERNS.SLUG.test('double--hyphen')).toBe(false)
      expect(PATTERNS.SLUG.test('')).toBe(false)
    })
  })

  describe('PATTERNS.SAFE_FILENAME', () => {
    it('matches safe filenames', () => {
      expect(PATTERNS.SAFE_FILENAME.test('document.pdf')).toBe(true)
      expect(PATTERNS.SAFE_FILENAME.test('my_file-v2.txt')).toBe(true)
      expect(PATTERNS.SAFE_FILENAME.test('simple')).toBe(true)
      expect(PATTERNS.SAFE_FILENAME.test('file with spaces.doc')).toBe(true)
    })

    it('rejects unsafe filenames', () => {
      expect(PATTERNS.SAFE_FILENAME.test('/etc/passwd')).toBe(false)
      expect(PATTERNS.SAFE_FILENAME.test('file<script>.js')).toBe(false)
      expect(PATTERNS.SAFE_FILENAME.test('file;command.txt')).toBe(false)
      expect(PATTERNS.SAFE_FILENAME.test('')).toBe(false)
    })
  })
})

describe('isValidUUID', () => {
  it('returns true for valid UUIDs', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    expect(isValidUUID('00000000-0000-0000-0000-000000000000')).toBe(true)
  })

  it('returns false for invalid UUIDs', () => {
    expect(isValidUUID('not-a-uuid')).toBe(false)
    expect(isValidUUID('')).toBe(false)
    expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false)
  })
})

describe('isValidEmail', () => {
  it('returns true for valid emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
    expect(isValidEmail('user.name@domain.org')).toBe(true)
  })

  it('returns false for invalid emails', () => {
    expect(isValidEmail('not-an-email')).toBe(false)
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail('@nodomain.com')).toBe(false)
  })
})

describe('isValidSlug', () => {
  it('returns true for valid slugs', () => {
    expect(isValidSlug('hello-world')).toBe(true)
    expect(isValidSlug('simple')).toBe(true)
    expect(isValidSlug('with123numbers')).toBe(true)
  })

  it('returns false for invalid slugs', () => {
    expect(isValidSlug('UPPERCASE')).toBe(false)
    expect(isValidSlug('with spaces')).toBe(false)
    expect(isValidSlug('')).toBe(false)
  })
})

describe('isSafeFilename', () => {
  it('returns true for safe filenames', () => {
    expect(isSafeFilename('document.pdf')).toBe(true)
    expect(isSafeFilename('my_file-v2.txt')).toBe(true)
  })

  it('returns false for unsafe filenames', () => {
    expect(isSafeFilename('/etc/passwd')).toBe(false)
    expect(isSafeFilename('')).toBe(false)
  })

  it('rejects path traversal attempts', () => {
    expect(isSafeFilename('../parent.txt')).toBe(false)
    expect(isSafeFilename('folder/../escape.txt')).toBe(false)
    expect(isSafeFilename('..safe.txt')).toBe(false) // Contains ".."
  })
})

describe('isNonNegativeInteger', () => {
  it('returns true for non-negative integers', () => {
    expect(isNonNegativeInteger(0)).toBe(true)
    expect(isNonNegativeInteger(1)).toBe(true)
    expect(isNonNegativeInteger(100)).toBe(true)
    expect(isNonNegativeInteger(Number.MAX_SAFE_INTEGER)).toBe(true)
  })

  it('returns false for negative numbers', () => {
    expect(isNonNegativeInteger(-1)).toBe(false)
    expect(isNonNegativeInteger(-100)).toBe(false)
  })

  it('returns false for non-integers', () => {
    expect(isNonNegativeInteger(1.5)).toBe(false)
    expect(isNonNegativeInteger(0.1)).toBe(false)
  })

  it('returns false for non-numbers', () => {
    expect(isNonNegativeInteger('1')).toBe(false)
    expect(isNonNegativeInteger(null)).toBe(false)
    expect(isNonNegativeInteger(undefined)).toBe(false)
    expect(isNonNegativeInteger(NaN)).toBe(false)
    expect(isNonNegativeInteger(Infinity)).toBe(false)
  })
})

describe('isPositiveInteger', () => {
  it('returns true for positive integers', () => {
    expect(isPositiveInteger(1)).toBe(true)
    expect(isPositiveInteger(100)).toBe(true)
    expect(isPositiveInteger(Number.MAX_SAFE_INTEGER)).toBe(true)
  })

  it('returns false for zero', () => {
    expect(isPositiveInteger(0)).toBe(false)
  })

  it('returns false for negative numbers', () => {
    expect(isPositiveInteger(-1)).toBe(false)
  })

  it('returns false for non-integers', () => {
    expect(isPositiveInteger(1.5)).toBe(false)
    expect(isPositiveInteger(0.1)).toBe(false)
  })

  it('returns false for non-numbers', () => {
    expect(isPositiveInteger('1')).toBe(false)
    expect(isPositiveInteger(null)).toBe(false)
    expect(isPositiveInteger(undefined)).toBe(false)
  })
})

describe('isWithinLength', () => {
  it('returns true when string is within bounds', () => {
    expect(isWithinLength('hello', 10)).toBe(true)
    expect(isWithinLength('hello', 5)).toBe(true)
    expect(isWithinLength('', 10)).toBe(true)
  })

  it('returns false when string exceeds max length', () => {
    expect(isWithinLength('hello', 4)).toBe(false)
    expect(isWithinLength('hello world', 5)).toBe(false)
  })

  it('respects minimum length', () => {
    expect(isWithinLength('hi', 10, 2)).toBe(true)
    expect(isWithinLength('hi', 10, 3)).toBe(false)
    expect(isWithinLength('', 10, 1)).toBe(false)
  })

  it('handles edge cases', () => {
    expect(isWithinLength('', 0)).toBe(true)
    expect(isWithinLength('a', 1)).toBe(true)
    expect(isWithinLength('ab', 1)).toBe(false)
  })
})
