import { describe, expect, it } from 'vitest'
import { KNOWN_CHAINS, isChainBusiness } from '../classify'

describe('KNOWN_CHAINS', () => {
  it('contains a thorough curated list (120+ entries)', () => {
    expect(KNOWN_CHAINS.length).toBeGreaterThanOrEqual(120)
  })

  it('is fully lowercase', () => {
    for (const entry of KNOWN_CHAINS) {
      expect(entry).toBe(entry.toLowerCase())
    }
  })

  it('contains no duplicates', () => {
    expect(new Set(KNOWN_CHAINS).size).toBe(KNOWN_CHAINS.length)
  })

  it('contains no empty or whitespace-padded entries', () => {
    for (const entry of KNOWN_CHAINS) {
      expect(entry.length).toBeGreaterThan(0)
      expect(entry).toBe(entry.trim())
    }
  })

  it('includes key required brands', () => {
    for (const brand of [
      'subway',
      "mcdonald's",
      'starbucks',
      'wienerschnitzel',
      '7-eleven',
      'h mart',
      '99 ranch market',
      'harkins theatres',
      'round1',
      'raging waters',
      'the ups store',
      '85°c bakery cafe',
      'at&t',
    ]) {
      expect(KNOWN_CHAINS).toContain(brand)
    }
  })
})

describe('isChainBusiness', () => {
  describe('chain positives (exact names)', () => {
    it.each([
      'Subway',
      'subway',
      'SUBWAY',
      'Wienerschnitzel',
      '99 Ranch Market',
      'Starbucks',
      'Chipotle',
      'Panda Express',
      'In-N-Out Burger',
      'Chick-fil-A',
      '7-Eleven',
      "Trader Joe's",
      "Dunkin'",
      'The UPS Store',
      'IHOP',
      'AMC',
    ])('classifies "%s" as a chain', (name) => {
      expect(isChainBusiness({ name })).toBe(true)
    })
  })

  describe('chain positives (location-suffixed names)', () => {
    it.each([
      'H Mart Diamond Bar',
      'Harkins Theatres Chino Hills',
      'Round1 Diamond Bar',
      'Raging Waters Los Angeles',
      'Starbucks Diamond Bar',
      "McDonald's Chino Hills",
      'Chase Bank',
      'H Mart - Diamond Bar',
      '85°C Bakery Cafe Diamond Bar',
    ])('classifies "%s" as a chain', (name) => {
      expect(isChainBusiness({ name })).toBe(true)
    })
  })

  describe('punctuation and apostrophe variants', () => {
    it('matches curly apostrophes', () => {
      expect(isChainBusiness({ name: 'McDonald’s' })).toBe(true)
      expect(isChainBusiness({ name: 'Domino’s Pizza' })).toBe(true)
    })

    it('matches hyphen/space variants of hyphenated brands', () => {
      expect(isChainBusiness({ name: 'Chick Fil A' })).toBe(true)
      expect(isChainBusiness({ name: '7 Eleven' })).toBe(true)
    })

    it('matches names with extra whitespace', () => {
      expect(isChainBusiness({ name: '  Subway   Diamond Bar  ' })).toBe(true)
    })

    it('matches a leading "The" being present or absent', () => {
      expect(isChainBusiness({ name: 'The Gap' })).toBe(true)
      expect(isChainBusiness({ name: 'Habit Burger Grill' })).toBe(true)
    })
  })

  describe('independent negatives', () => {
    it.each([
      'Diamond Bar Dental Studio',
      'Little Skewer',
      'Corner Bistro',
      'Brewed Awakening Coffee House',
      'Diamond Bar Family Dentistry',
      'Golden Dragon Restaurant',
      "Maria's Taqueria",
    ])('classifies "%s" as independent', (name) => {
      expect(isChainBusiness({ name })).toBe(false)
    })

    it('does not match a chain entry without a word boundary', () => {
      // "target" / "gap" / "subway" / "shell" are entries, but these are not chains
      expect(isChainBusiness({ name: 'Targetting Solutions' })).toBe(false)
      expect(isChainBusiness({ name: 'Gapview Cafe' })).toBe(false)
      expect(isChainBusiness({ name: 'Subwayz Barbershop' })).toBe(false)
      expect(isChainBusiness({ name: 'Shellfish House' })).toBe(false)
    })

    it('does not match short numeric entries mid-word', () => {
      // "76" is a chain entry but "760 Auto Repair" is not
      expect(isChainBusiness({ name: '760 Auto Repair' })).toBe(false)
    })

    it('does not treat "Little Skewer" as Little Caesars', () => {
      expect(isChainBusiness({ name: 'Little Skewer' })).toBe(false)
    })

    it('does not treat "Corner Bistro" as Corner Bakery', () => {
      expect(isChainBusiness({ name: 'Corner Bistro' })).toBe(false)
    })
  })

  describe('defensive handling', () => {
    it('returns false for empty or whitespace-only names', () => {
      expect(isChainBusiness({ name: '' })).toBe(false)
      expect(isChainBusiness({ name: '   ' })).toBe(false)
    })

    it('returns false for non-string names', () => {
      expect(isChainBusiness({ name: undefined as unknown as string })).toBe(false)
      expect(isChainBusiness({ name: 42 as unknown as string })).toBe(false)
      expect(isChainBusiness(null as unknown as { name: string })).toBe(false)
    })

    it('accepts optional tags without affecting classification', () => {
      expect(
        isChainBusiness({ name: 'Subway', tags: ['fast_food_restaurant', 'sandwich_shop'] })
      ).toBe(true)
      expect(
        isChainBusiness({ name: 'Little Skewer', tags: ['fast_food_restaurant'] })
      ).toBe(false)
    })
  })
})
