import { describe, it, expect } from 'vitest'
import {
  PULSE_ASSISTANT_SYSTEM_PROMPT,
  createRecommendationPrompt,
  createImpactPrompt,
  createGeneralPrompt,
  SUGGESTED_QUESTIONS,
  QUESTION_CATEGORIES,
} from '../prompts'

describe('Pulse Assistant Prompts', () => {
  describe('PULSE_ASSISTANT_SYSTEM_PROMPT', () => {
    it('contains the Pulse mission statement', () => {
      expect(PULSE_ASSISTANT_SYSTEM_PROMPT).toContain('Powering the Heart of Local Business')
    })

    it('mentions business discovery', () => {
      expect(PULSE_ASSISTANT_SYSTEM_PROMPT).toContain('discover')
    })

    it('mentions economic impact', () => {
      expect(PULSE_ASSISTANT_SYSTEM_PROMPT).toContain('impact')
    })

    it('contains local business focus', () => {
      expect(PULSE_ASSISTANT_SYSTEM_PROMPT).toContain('local business')
    })
  })

  describe('createRecommendationPrompt', () => {
    it('includes user query', () => {
      const prompt = createRecommendationPrompt('Find me a coffee shop', 'Business data', 'New York')
      expect(prompt).toContain('Find me a coffee shop')
    })

    it('includes business context', () => {
      const prompt = createRecommendationPrompt('test', 'Coffee Shop A, Coffee Shop B', undefined)
      expect(prompt).toContain('Coffee Shop A')
      expect(prompt).toContain('Coffee Shop B')
    })

    it('includes location when provided', () => {
      const prompt = createRecommendationPrompt('test', 'data', 'Seattle')
      expect(prompt).toContain('Seattle')
    })

    it('does not include location when not provided', () => {
      const prompt = createRecommendationPrompt('test', 'data', undefined)
      expect(prompt).not.toContain('User Location Context')
    })
  })

  describe('createImpactPrompt', () => {
    it('includes user query', () => {
      const prompt = createImpactPrompt('How does local help?')
      expect(prompt).toContain('How does local help?')
    })

    it('includes user impact data when provided', () => {
      const impactData = 'Dollars kept: $100\nBusinesses: 5'
      const prompt = createImpactPrompt('test', impactData)
      expect(prompt).toContain('Dollars kept: $100')
      expect(prompt).toContain('Businesses: 5')
    })

    it('does not include impact data section when not provided', () => {
      const prompt = createImpactPrompt('test', undefined)
      expect(prompt).not.toContain('Personal Impact Data')
    })

    it('contains local multiplier facts', () => {
      const prompt = createImpactPrompt('test')
      expect(prompt).toContain('$68')
    })
  })

  describe('createGeneralPrompt', () => {
    it('includes user query', () => {
      const prompt = createGeneralPrompt('What is Pulse?')
      expect(prompt).toContain('What is Pulse?')
    })

    it('includes system prompt context', () => {
      const prompt = createGeneralPrompt('test')
      expect(prompt).toContain('Pulse Assistant')
    })
  })

  describe('SUGGESTED_QUESTIONS', () => {
    it('has discovery questions', () => {
      expect(SUGGESTED_QUESTIONS.discovery.length).toBeGreaterThan(0)
      expect(SUGGESTED_QUESTIONS.discovery[0]).toContain('coffee')
    })

    it('has impact questions', () => {
      expect(SUGGESTED_QUESTIONS.impact.length).toBeGreaterThan(0)
      expect(SUGGESTED_QUESTIONS.impact[0]).toContain('supporting local')
    })

    it('has feature questions', () => {
      expect(SUGGESTED_QUESTIONS.features.length).toBeGreaterThan(0)
      expect(SUGGESTED_QUESTIONS.features[0]).toContain('Boost Missions')
    })
  })

  describe('QUESTION_CATEGORIES', () => {
    it('defines all expected categories', () => {
      expect(QUESTION_CATEGORIES.BUSINESS_DISCOVERY).toBe('business_discovery')
      expect(QUESTION_CATEGORIES.IMPACT_EDUCATION).toBe('impact_education')
      expect(QUESTION_CATEGORIES.SPECIFIC_BUSINESS).toBe('specific_business')
      expect(QUESTION_CATEGORIES.PULSE_FEATURES).toBe('pulse_features')
      expect(QUESTION_CATEGORIES.GENERAL).toBe('general')
    })
  })
})
