import { describe, it, expect, vi } from 'vitest'
import type { BusinessWithCategory } from '@/types/business'
import {
  formatBusinessContext,
  formatUserImpactContext,
} from '../rag'

describe('RAG (Retrieval Augmented Generation)', () => {
  describe('formatBusinessContext', () => {
    it('returns empty message when no businesses', () => {
      const context = {
        businesses: [],
        categories: [],
        totalCount: 0,
        queryUsed: 'test',
      }
      const result = formatBusinessContext(context)
      expect(result).toContain('No specific businesses')
    })

    it('formats single business correctly', () => {
      const business = {
        id: '1',
        name: 'Test Coffee Shop',
        category: { id: 'c1', name: 'Food & Drink', slug: 'food-drink' },
        short_description: 'Great coffee and WiFi',
        address: '123 Main St',
        average_rating: 4.5,
        review_count: 100,
        price_range: 2,
        tags: ['wifi', 'quiet'],
      } as BusinessWithCategory

      const context = {
        businesses: [business],
        categories: [],
        totalCount: 1,
        queryUsed: 'coffee',
      }
      const result = formatBusinessContext(context)
      expect(result).toContain('Test Coffee Shop')
      expect(result).toContain('Food & Drink')
      expect(result).toContain('4.5')
      expect(result).toContain('$$')
    })

    it('formats multiple businesses with numbering', () => {
      const businesses = [
        {
          id: '1',
          name: 'Shop A',
          category: { id: 'c1', name: 'Retail' },
        } as BusinessWithCategory,
        {
          id: '2',
          name: 'Shop B',
          category: { id: 'c2', name: 'Food' },
        } as BusinessWithCategory,
      ]

      const context = {
        businesses,
        categories: [],
        totalCount: 2,
        queryUsed: 'shops',
      }
      const result = formatBusinessContext(context)
      expect(result).toContain('1. **Shop A**')
      expect(result).toContain('2. **Shop B**')
    })

    it('handles missing optional fields gracefully', () => {
      const business = {
        id: '1',
        name: 'Minimal Shop',
        category: null,
        short_description: null,
        address: null,
        average_rating: 0,
        review_count: 0,
        price_range: null,
        tags: [],
      } as unknown as BusinessWithCategory

      const context = {
        businesses: [business],
        categories: [],
        totalCount: 1,
        queryUsed: 'test',
      }
      const result = formatBusinessContext(context)
      expect(result).toContain('Minimal Shop')
    })
  })

  describe('formatUserImpactContext', () => {
    it('formats impact data correctly', () => {
      const impact = {
        estimatedDollarsKeptLocal: 500.75,
        businessesSupported: 10,
        reviewsLeft: 5,
        totalCheckIns: 20,
        missionsCompleted: 3,
      }

      const result = formatUserImpactContext(impact)
      expect(result).toContain('$500.75')
      expect(result).toContain('10')
      expect(result).toContain('5')
      expect(result).toContain('20')
      expect(result).toContain('3')
    })

    it('handles zero values', () => {
      const impact = {
        estimatedDollarsKeptLocal: 0,
        businessesSupported: 0,
        reviewsLeft: 0,
        totalCheckIns: 0,
        missionsCompleted: 0,
      }

      const result = formatUserImpactContext(impact)
      expect(result).toContain('$0.00')
      expect(result).toContain('Businesses supported: 0')
    })
  })
})
