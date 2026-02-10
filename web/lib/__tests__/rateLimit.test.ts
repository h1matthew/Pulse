import { describe, it, expect } from 'vitest'
import { getCategoryFromPath, type RateLimitCategory } from '../rateLimit'

describe('getCategoryFromPath', () => {
  describe('ai category', () => {
    it('categorizes Gemini explain endpoint as ai', () => {
      expect(getCategoryFromPath('/api/gemini/explain')).toBe('ai')
    })

    it('categorizes flashcard endpoints as ai', () => {
      expect(getCategoryFromPath('/api/flashcards/generate')).toBe('ai')
      expect(getCategoryFromPath('/api/flashcards/grade')).toBe('ai')
    })
  })

  describe('admin-ai category', () => {
    it('categorizes admin generate endpoints as admin-ai', () => {
      expect(getCategoryFromPath('/api/admin/generate-content')).toBe('admin-ai')
      expect(getCategoryFromPath('/api/admin/generate-quiz')).toBe('admin-ai')
      expect(getCategoryFromPath('/api/admin/generate-video')).toBe('admin-ai')
    })

    it('categorizes admin quizzes endpoint as admin-ai', () => {
      expect(getCategoryFromPath('/api/admin/quizzes')).toBe('admin-ai')
    })

    it('categorizes admin video-chat endpoint as admin-ai', () => {
      expect(getCategoryFromPath('/api/admin/video-chat')).toBe('admin-ai')
    })
  })

  describe('ai-tutor category', () => {
    it('categorizes AI tutor chat endpoints as ai-tutor', () => {
      expect(getCategoryFromPath('/api/ai/conversations/123/messages')).toBe('ai-tutor')
      expect(getCategoryFromPath('/api/gemini/ask')).toBe('ai-tutor')
    })
  })

  describe('progress category', () => {
    it('categorizes lessons progress endpoint as progress', () => {
      expect(getCategoryFromPath('/api/lessons/progress')).toBe('progress')
    })

    it('categorizes practice progress endpoint as progress', () => {
      expect(getCategoryFromPath('/api/practice/progress')).toBe('progress')
    })
  })

  describe('contact category', () => {
    it('categorizes contact endpoint as contact', () => {
      expect(getCategoryFromPath('/api/contact')).toBe('contact')
    })
  })

  describe('auth category', () => {
    it('categorizes delete-account endpoint as auth', () => {
      expect(getCategoryFromPath('/api/auth/delete-account')).toBe('auth')
    })
  })

  describe('general category (default)', () => {
    it('categorizes unknown endpoints as general', () => {
      expect(getCategoryFromPath('/api/unknown')).toBe('general')
      expect(getCategoryFromPath('/api/some/other/route')).toBe('general')
    })

    it('categorizes AI conversation metadata endpoints as general', () => {
      expect(getCategoryFromPath('/api/ai/conversations')).toBe('general')
      expect(getCategoryFromPath('/api/ai/conversations/123')).toBe('general')
    })

    it('categorizes other admin endpoints as general', () => {
      expect(getCategoryFromPath('/api/admin/reorder')).toBe('general')
      expect(getCategoryFromPath('/api/admin/settings')).toBe('general')
    })

    it('categorizes other auth endpoints as general', () => {
      expect(getCategoryFromPath('/api/auth/callback')).toBe('general')
      expect(getCategoryFromPath('/api/auth/signout')).toBe('general')
    })
  })

  describe('rate limit categories exist', () => {
    it('should have all expected categories', () => {
      const categories: RateLimitCategory[] = ['ai', 'ai-tutor', 'admin-ai', 'progress', 'general', 'contact', 'auth']
      // This test verifies the type includes all expected categories
      expect(categories).toHaveLength(7)
    })
  })
})
