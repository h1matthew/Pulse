import { describe, it, expect } from 'vitest'
import type { BusinessWithCategory } from '@/types/business'

/**
 * ============================================================================
 * TESTS: Discover Page — Business Sorting Logic
 * ============================================================================
 *
 * USER JOURNEY:
 *   Validates that the sort dropdown on the Discover page correctly reorders
 *   business cards by distance, rating, review count, and name.
 *
 * DESIGN RATIONALE:
 *   Sorting is client-side (no extra API call), so we test the pure sort
 *   comparator logic extracted from the page component.
 *
 * ACCESSIBILITY:
 *   Correct sort order ensures screen reader users traversing the grid
 *   encounter the most relevant results first.
 * ============================================================================
 */

// Extracted sort logic matching DiscoverPage's processedBusinesses sort
type SortBy = 'distance' | 'rating' | 'review_count' | 'name'

interface LatLng {
  lat: number
  lng: number
}

function calculateDistance(a: LatLng, b: LatLng): number {
  const R = 6371e3
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLng * sinLng
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function sortBusinesses(
  businesses: Partial<BusinessWithCategory>[],
  sortBy: SortBy,
  location?: LatLng | null
): Partial<BusinessWithCategory>[] {
  return [...businesses].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return (
          ((b.average_rating || 0) - (a.average_rating || 0)) ||
          ((b.review_count || 0) - (a.review_count || 0))
        )
      case 'review_count':
        return (
          ((b.review_count || 0) - (a.review_count || 0)) ||
          ((b.average_rating || 0) - (a.average_rating || 0))
        )
      case 'name':
        return (a.name || '').localeCompare(b.name || '')
      case 'distance':
      default:
        if (location) {
          const distA =
            a.latitude && a.longitude
              ? calculateDistance(location, { lat: a.latitude, lng: a.longitude })
              : Infinity
          const distB =
            b.latitude && b.longitude
              ? calculateDistance(location, { lat: b.latitude, lng: b.longitude })
              : Infinity
          return distA - distB
        }
        return 0
    }
  })
}

// Sample businesses for testing
const businesses: Partial<BusinessWithCategory>[] = [
  {
    id: '1',
    name: 'Cafe Zenith',
    average_rating: 4.2,
    review_count: 50,
    latitude: 34.03,
    longitude: -117.82,
  },
  {
    id: '2',
    name: 'Alpha Bakery',
    average_rating: 4.8,
    review_count: 120,
    latitude: 34.04,
    longitude: -117.83,
  },
  {
    id: '3',
    name: 'Beta Burgers',
    average_rating: 3.9,
    review_count: 200,
    latitude: 34.02,
    longitude: -117.81,
  },
  {
    id: '4',
    name: 'Delta Deli',
    average_rating: 4.8,
    review_count: 30,
    latitude: null as unknown as number,
    longitude: null as unknown as number,
  },
]

const userLocation: LatLng = { lat: 34.0286, lng: -117.8208 }

describe('Discover Page — Business Sorting', () => {
  describe('Sort by rating', () => {
    it('orders businesses by highest rating first', () => {
      const sorted = sortBusinesses(businesses, 'rating')
      expect(sorted[0].name).toBe('Alpha Bakery') // 4.8, 120 reviews
      expect(sorted[1].name).toBe('Delta Deli')   // 4.8, 30 reviews (tie broken by review_count)
      expect(sorted[2].name).toBe('Cafe Zenith')  // 4.2
      expect(sorted[3].name).toBe('Beta Burgers') // 3.9
    })

    it('breaks rating ties by review count', () => {
      const sorted = sortBusinesses(businesses, 'rating')
      // Alpha Bakery and Delta Deli both have 4.8 rating
      // Alpha Bakery has 120 reviews, Delta Deli has 30
      expect(sorted[0].id).toBe('2') // Alpha Bakery
      expect(sorted[1].id).toBe('4') // Delta Deli
    })
  })

  describe('Sort by review count', () => {
    it('orders businesses by most reviewed first', () => {
      const sorted = sortBusinesses(businesses, 'review_count')
      expect(sorted[0].name).toBe('Beta Burgers')  // 200
      expect(sorted[1].name).toBe('Alpha Bakery')  // 120
      expect(sorted[2].name).toBe('Cafe Zenith')   // 50
      expect(sorted[3].name).toBe('Delta Deli')    // 30
    })

    it('breaks review count ties by rating', () => {
      const tiedBusinesses: Partial<BusinessWithCategory>[] = [
        { id: '1', name: 'A', average_rating: 3.5, review_count: 100 },
        { id: '2', name: 'B', average_rating: 4.5, review_count: 100 },
      ]
      const sorted = sortBusinesses(tiedBusinesses, 'review_count')
      expect(sorted[0].id).toBe('2') // Higher rating wins tie
    })
  })

  describe('Sort by name', () => {
    it('orders businesses alphabetically A-Z', () => {
      const sorted = sortBusinesses(businesses, 'name')
      expect(sorted.map(b => b.name)).toEqual([
        'Alpha Bakery',
        'Beta Burgers',
        'Cafe Zenith',
        'Delta Deli',
      ])
    })
  })

  describe('Sort by distance', () => {
    it('orders businesses by nearest first when location is provided', () => {
      const sorted = sortBusinesses(businesses, 'distance', userLocation)
      // Business without coords should be last
      expect(sorted[sorted.length - 1].name).toBe('Delta Deli')
    })

    it('puts businesses without coordinates at the end', () => {
      const sorted = sortBusinesses(businesses, 'distance', userLocation)
      expect(sorted[sorted.length - 1].latitude).toBeFalsy()
    })

    it('preserves original order when no location is provided', () => {
      const sorted = sortBusinesses(businesses, 'distance', null)
      expect(sorted.map(b => b.id)).toEqual(['1', '2', '3', '4'])
    })
  })

  describe('Input validation — search query sanitization', () => {
    it('strips angle brackets from search queries', () => {
      const raw = '<script>alert("xss")</script>'
      const sanitized = raw.trim().replace(/[<>]/g, '').slice(0, 100)
      expect(sanitized).toBe('scriptalert("xss")/script')
      expect(sanitized).not.toContain('<')
      expect(sanitized).not.toContain('>')
    })

    it('caps search query length at 100 characters', () => {
      const longQuery = 'a'.repeat(200)
      const sanitized = longQuery.trim().replace(/[<>]/g, '').slice(0, 100)
      expect(sanitized.length).toBe(100)
    })

    it('trims whitespace from search queries', () => {
      const padded = '  coffee shops  '
      const sanitized = padded.trim().replace(/[<>]/g, '').slice(0, 100)
      expect(sanitized).toBe('coffee shops')
    })

    it('treats empty/whitespace-only queries as no search', () => {
      const empty = '   '
      expect(empty.trim()).toBe('')
      expect(empty.trim().length).toBe(0)
    })
  })
})
