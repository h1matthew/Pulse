# Max Apogee Code Review - 2026-01-29

## Executive Summary

Overall code quality is good with proper authentication, security headers, and input validation. Main areas for improvement: rate limiting scalability, error handling, and API response caching.

---

## 🔴 High Priority Issues

### 1. Rate Limiting Storage (Security)
**Problem:** In-memory rate limiting won't work across multiple server instances  
**Location:** `web/lib/rateLimit.ts`  
**Fix:**
```typescript
// Use Redis or Supabase for distributed rate limiting
// Option 1: Redis (recommended)
import { Redis } from '@upstash/redis'
const redis = new Redis({ url: process.env.REDIS_URL })

// Option 2: Supabase (simpler, but less performant)
// Store rate limit data in a `rate_limits` table with TTL
```

### 2. GEMINI_API_KEY Exposure Risk
**Problem:** Need to verify API key is server-side only  
**Location:** `web/lib/gemini.ts`  
**Fix:**
- Ensure `.env` uses `GEMINI_API_KEY` (NOT `NEXT_PUBLIC_`)
- Add runtime check:
```typescript
if (typeof window !== 'undefined') {
  throw new Error('Gemini API must only run on server')
}
```

### 3. Error Message Information Leakage
**Problem:** API routes expose internal error details to clients  
**Location:** Multiple API routes (`web/app/api/**/route.ts`)  
**Fix:**
```typescript
// Replace:
{ error: error.message }

// With:
{ error: process.env.NODE_ENV === 'production' 
  ? 'An error occurred' 
  : error.message 
}
```

---

## 🟡 Medium Priority Issues

### 4. Missing Gemini Response Caching
**Problem:** Every request hits Gemini API (costs + latency)  
**Location:** `web/lib/gemini.ts`  
**Fix:**
```typescript
// Cache common responses by content hash
const cacheKey = `gemini:${hash(lessonContent)}:${difficulty}`
const cached = await redis.get(cacheKey)
if (cached) return JSON.parse(cached)

// ... generate ...
await redis.set(cacheKey, JSON.stringify(result), { ex: 86400 }) // 24h
```

### 5. No Error Logging Service
**Problem:** `console.error` in production makes debugging hard  
**Location:** Throughout codebase  
**Fix:**
```bash
npm install @sentry/nextjs
# Configure Sentry for error tracking
```

### 6. Bundle Size Optimization Needed
**Problem:** Heavy dependencies (Remotion, Radix components)  
**Location:** `web/package.json`, component imports  
**Fix:**
```typescript
// Use dynamic imports for heavy components
const RemotionPlayer = dynamic(() => import('@remotion/player'))

// Add to next.config.ts:
webpack: (config) => {
  config.optimization.splitChunks = {
    chunks: 'all',
    cacheGroups: {
      remotion: { test: /[\\/]node_modules[\\/]remotion/ }
    }
  }
}
```

### 7. Database N+1 Query Risk
**Problem:** Potential N+1 queries when fetching lessons/modules  
**Location:** `web/lib/content/utils.ts`  
**Fix:**
- Use Supabase `.select()` with nested relations
- Batch queries where possible
- Add database query monitoring

---

## 🟢 Low Priority Issues

### 8. Magic Numbers Hardcoded
**Problem:** Thresholds scattered throughout code  
**Location:** `web/lib/gemini.ts`, `web/lib/utils/flashcardDeduplication.ts`  
**Fix:**
```typescript
// Create web/lib/config/constants.ts
export const AI_CONFIG = {
  QUIZ_PASSING_SCORE: 0.85,
  FLASHCARD_SIMILARITY_THRESHOLD: 0.9,
  MAX_CONTENT_LENGTH: 6000,
  MAX_RETRIES: 2,
  QUALITY_THRESHOLDS: {
    PERFECT: 0.95,
    GOOD: 0.85,
    PARTIAL: 0.70,
    LIMITED: 0.50,
  }
} as const
```

### 9. TypeScript `any` Usage
**Problem:** Type safety compromised in flashcard mapping  
**Location:** `web/app/api/flashcards/generate/route.ts`  
**Fix:**
```typescript
interface FlashcardInsert {
  flashcard_id: string
  module_id: string
  lesson_ids: string[]
  front: string
  back: string
  hint: string | null
  difficulty: 'easy' | 'medium' | 'hard'
  created_by_user_id: string
  usage_count: number
}

const uniqueCards: FlashcardInsert[] = []
```

### 10. Missing API Response Caching Headers
**Problem:** No cache-control headers on API routes  
**Location:** All API routes  
**Fix:**
```typescript
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
  }
})
```

---

## 🔧 Additional Recommendations

### Testing
- [ ] Add integration tests for API routes
- [ ] Test Gemini fallback behavior
- [ ] Test rate limiting with concurrent requests
- [ ] Add E2E tests for critical flows

### Monitoring
- [ ] Add performance monitoring (Vercel Analytics)
- [ ] Track Gemini API usage/costs
- [ ] Monitor database query performance
- [ ] Set up uptime monitoring

### Documentation
- [ ] Document environment variables
- [ ] Add API route documentation
- [ ] Create deployment guide
- [ ] Document Gemini prompt engineering decisions

---

## ✅ What's Already Good

1. **Security headers** properly configured
2. **Authentication** checked on all protected routes
3. **Rate limiting** present (needs scaling fix)
4. **Input validation** on API endpoints
5. **Supabase SSR** properly implemented
6. **Environment variables** not hardcoded
7. **Proper .gitignore** configuration

---

## Implementation Priority

**Week 1:**
- Fix rate limiting with Redis/Supabase
- Add error logging (Sentry)
- Implement Gemini response caching

**Week 2:**
- Fix error message leakage
- Add TypeScript types
- Extract magic numbers

**Week 3:**
- Bundle size optimization
- Add cache headers
- Database query optimization

**Ongoing:**
- Add monitoring
- Improve test coverage
- Update documentation
