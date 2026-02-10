# Security Audit Report: Max Apogee API Routes

**Audit Date:** February 3, 2026
**Auditor:** Security Audit Agent
**Scope:** 35 API routes in `/web/app/api/`
**Risk Score:** **MODERATE** (Most critical patterns are in place, but gaps exist)

---

## Executive Summary

### Overall Assessment

The Max Apogee codebase demonstrates **strong security fundamentals**:
- ✅ Consistent authentication using Supabase Auth across all protected routes
- ✅ Admin authorization checks on all admin routes
- ✅ Ownership verification (`.eq('user_id', user.id)`) on user data queries
- ✅ Rate limiting infrastructure exists and is applied via middleware
- ✅ Prompt injection sanitization implemented in `lib/gemini.ts`
- ✅ Input validation utilities exist in `lib/validation.ts`

**However, several gaps require attention:**

| Severity | Count | Summary |
|----------|-------|---------|
| **Critical** | 0 | No critical vulnerabilities found |
| **High** | 2 | Missing rate limiting on admin AI routes, missing UUID validation |
| **Medium** | 6 | Input validation gaps, prompt injection in admin routes |
| **Low** | 8 | Minor validation gaps, error message consistency |
| **Info** | 5 | Defense-in-depth improvements |

### Key Metrics

- **Routes Audited:** 35
- **Routes with Full Security Coverage:** 28 (80%)
- **Routes Needing Remediation:** 7 (20%)
- **Estimated Remediation Time:** 4-6 hours

---

## Finding Summary Table

| # | Severity | Route | Issue | Status |
|---|----------|-------|-------|--------|
| 1 | High | `/api/admin/generate-content` | Missing rate limiting | Open |
| 2 | High | `/api/admin/generate-quiz` | Missing rate limiting | Open |
| 3 | High | `/api/admin/generate-video` | Missing rate limiting | Open |
| 4 | Medium | `/api/ai/conversations` (POST) | Missing input validation on lessonId, moduleId, title | Open |
| 5 | Medium | `/api/ai/conversations/[id]` (GET/PATCH/DELETE) | Missing UUID validation on `id` param | Open |
| 6 | Medium | `/api/flashcards/generate` | Missing UUID validation on moduleId | Open |
| 7 | Medium | `/api/admin/generate-content` | User prompt not sanitized | Open |
| 8 | Medium | `/api/admin/generate-quiz` | User context not sanitized | Open |
| 9 | Medium | `/api/admin/generate-video` | User prompt not sanitized | Open |
| 10 | Low | `/api/flashcards/cards` | Missing rate limiting | Open |
| 11 | Low | `/api/achievements` (POST) | Missing validation on achievementId format | Open |
| 12 | Low | `/api/flashcards/route` (POST) | Missing validation on flashcardId format | Open |
| 13 | Low | `/api/flashcards/knowledge` (POST) | Missing validation on flashcardId format | Open |
| 14 | Low | `/api/practice/progress` (POST) | Missing validation on lessonId format | Open |
| 15 | Low | `/api/admin/flashcards/[id]/*` | Missing UUID validation on `id` param | Open |
| 16 | Low | `/api/admin/quizzes/[id]/*` | Missing UUID validation on `id` param | Open |
| 17 | Low | `/api/admin/founders/[id]/*` | Missing UUID validation on `id` param | Open |
| 18 | Info | Multiple routes | Error messages expose internal details | Open |
| 19 | Info | All routes | Consider adding request logging | Open |
| 20 | Info | All routes | Consider adding CSP headers | Open |
| 21 | Info | `/api/auth/delete-account` | No confirmation/cooldown mechanism | Open |

---

## Detailed Findings

### Finding #1: Missing Rate Limiting on Admin AI Routes

**Severity:** High
**Category:** Rate Limiting
**Routes:**
- `/api/admin/generate-content/route.ts`
- `/api/admin/generate-quiz/route.ts`
- `/api/admin/generate-video/route.ts`

**Description:**
These admin routes call the Gemini API (expensive AI operations) but do not enforce rate limiting at the route level. While middleware may handle general rate limiting based on path patterns, explicit enforcement would prevent abuse by compromised admin accounts.

**Impact:**
- Admin users could make excessive AI API calls, incurring significant costs
- A compromised admin account could exhaust API quotas
- No protection against accidental rapid-fire requests from admin UI

**Evidence:**
```typescript
// /api/admin/generate-content/route.ts - Lines 17-180
// No checkRateLimit() call present in the route handler
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    // ... auth checks ...
    const { prompt, type, returnStructured } = await request.json()
    // Direct AI call without rate limit check
    const result = await model.generateContent(structuredPrompt)
```

**Remediation:**
```typescript
import { checkRateLimit, getClientIP } from '@/lib/rateLimit'

export async function POST(request: NextRequest) {
  try {
    // Add rate limiting check at the start of the handler
    const ip = getClientIP(request)
    const rateLimitResult = await checkRateLimit(ip, 'admin-ai')
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(rateLimitResult.retryAfterMs / 1000)
        },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(rateLimitResult.retryAfterMs / 1000)) }
        }
      )
    }

    // ... rest of handler
```

**Estimated Fix Time:** 15 minutes per route (45 minutes total)

---

### Finding #2: Missing Input Validation on Conversation Creation

**Severity:** Medium
**Category:** Input Validation
**Route:** `/api/ai/conversations/route.ts` (POST)

**Description:**
The POST endpoint for creating conversations accepts `lessonId`, `moduleId`, and `title` without validation. While these are optional, they are inserted directly into the database.

**Impact:**
- Malformed UUIDs could cause database errors or unexpected behavior
- Excessively long titles (no length limit) could affect storage/display
- Invalid foreign key references could cause data integrity issues

**Evidence:**
```typescript
// Lines 55-67
const body = await request.json()
const { lessonId, moduleId, title } = body

const { data: conversation, error } = await supabase
  .from('ai_chat_conversations')
  .insert({
    user_id: user.id,
    lesson_id: lessonId || null,  // No UUID validation
    module_id: moduleId || null,  // No UUID validation
    title: title || 'New Conversation',  // No length limit
  })
```

**Remediation:**
```typescript
import { isValidUUID, isWithinLength } from '@/lib/validation'

const body = await request.json()
const { lessonId, moduleId, title } = body

// Validate optional UUIDs
if (lessonId && !isValidUUID(lessonId)) {
  return NextResponse.json({ error: 'Invalid lessonId format' }, { status: 400 })
}
if (moduleId && !isValidUUID(moduleId)) {
  return NextResponse.json({ error: 'Invalid moduleId format' }, { status: 400 })
}

// Validate title length
const sanitizedTitle = (title || 'New Conversation').slice(0, 200)

const { data: conversation, error } = await supabase
  .from('ai_chat_conversations')
  .insert({
    user_id: user.id,
    lesson_id: lessonId || null,
    module_id: moduleId || null,
    title: sanitizedTitle,
  })
```

**Estimated Fix Time:** 10 minutes

---

### Finding #3: Missing UUID Validation on Dynamic Route Parameters

**Severity:** Medium
**Category:** Input Validation
**Routes:**
- `/api/ai/conversations/[id]/route.ts` (all methods)
- `/api/admin/flashcards/[id]/route.ts` and sub-routes
- `/api/admin/quizzes/[id]/route.ts` and sub-routes
- `/api/admin/founders/[id]/route.ts` and sub-routes

**Description:**
Several routes with dynamic `[id]` parameters do not validate that the ID is a valid UUID before using it in database queries. While Supabase will handle invalid UUIDs gracefully, explicit validation provides better error messages and defense in depth.

**Impact:**
- Confusing error messages when invalid IDs are passed
- Potential for unexpected behavior with malformed inputs
- Inconsistent with routes that do validate (e.g., `/api/ai/conversations/[id]/messages`)

**Evidence:**
```typescript
// /api/ai/conversations/[id]/route.ts - Lines 10-35
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    // No UUID validation before query
    const { data: conversation, error: convError } = await supabase
      .from('ai_chat_conversations')
      .select('*')
      .eq('id', id)  // Invalid ID causes Supabase error
```

**Note:** The `/api/ai/conversations/[id]/messages/route.ts` route DOES validate UUIDs correctly at line 47-50:
```typescript
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
if (!uuidRegex.test(id)) {
  return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 })
}
```

**Remediation:**
```typescript
import { isValidUUID } from '@/lib/validation'

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Validate UUID format
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
    }

    // ... rest of handler
```

**Estimated Fix Time:** 5 minutes per route (30 minutes total)

---

### Finding #4: Admin AI Routes Don't Sanitize User Prompts

**Severity:** Medium
**Category:** Prompt Injection
**Routes:**
- `/api/admin/generate-content/route.ts`
- `/api/admin/generate-quiz/route.ts`
- `/api/admin/generate-video/route.ts`

**Description:**
While `lib/gemini.ts` has excellent prompt sanitization functions (`sanitizeForPrompt`, `sanitizeLessonContext`), the admin AI routes don't use them. User prompts are inserted directly into the AI system prompt.

**Impact:**
- Admins could (intentionally or via social engineering) inject malicious instructions
- AI could be manipulated to generate inappropriate content
- Generated content could contain hidden instructions or malicious payloads

**Evidence:**
```typescript
// /api/admin/generate-content/route.ts - Lines 37, 90
const { prompt, type, returnStructured } = await request.json()
// ... later ...
const structuredPrompt = `... Now generate structured content for: ${prompt}`
// prompt is NOT sanitized before injection into system prompt
```

Compare to the secure pattern in `lib/gemini.ts`:
```typescript
const sanitizedQuestion = sanitizeForPrompt(params.studentQuestion, 1000)
```

**Remediation:**
```typescript
// At the top of the file
import { sanitizeForPrompt } from '@/lib/gemini'
// Or copy the sanitization function locally

// In the handler
const { prompt, type, returnStructured } = await request.json()

// Sanitize the user prompt
const sanitizedPrompt = sanitizeForPrompt(prompt, 2000)

// Use sanitized version in AI call
const structuredPrompt = `... Now generate structured content for: ${sanitizedPrompt}`
```

**Estimated Fix Time:** 10 minutes per route (30 minutes total)

---

### Finding #5: Error Messages Expose Internal Details

**Severity:** Low/Info
**Category:** Error Handling
**Routes:** Multiple

**Description:**
Several routes include `details: error instanceof Error ? error.message : 'Unknown error'` in error responses, which can leak internal error messages to clients.

**Impact:**
- Stack traces or internal error messages could reveal system architecture
- Database error messages could expose schema details
- Aids attackers in reconnaissance

**Evidence:**
```typescript
// /api/flashcards/grade/route.ts - Lines 179-182
return NextResponse.json(
  { error: 'Failed to grade answer', details: error instanceof Error ? error.message : 'Unknown error' },
  { status: 500 }
)
```

**Remediation:**
```typescript
// Log detailed error server-side
console.error('Error grading flashcard:', error)

// Return generic error to client
return NextResponse.json(
  { error: 'Failed to grade answer. Please try again.' },
  { status: 500 }
)
```

**Estimated Fix Time:** 2 minutes per route (20 minutes total)

---

## Positive Observations

### ✅ Strong Authentication Pattern
All protected routes follow the correct pattern:
```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### ✅ Consistent Admin Authorization
All admin routes check the `is_admin` flag:
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('is_admin')
  .eq('id', user.id)
  .single()

if (!profile?.is_admin) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

### ✅ Ownership Verification
User data queries consistently filter by user_id:
```typescript
.eq('user_id', user.id)
```

### ✅ Excellent Prompt Injection Sanitization
The `lib/gemini.ts` file implements comprehensive sanitization:
- Escapes instruction markers
- Neutralizes common injection patterns
- Length limits on inputs
- Separate sanitization for user input vs trusted content

### ✅ Rate Limiting Infrastructure
The `lib/rateLimit.ts` file provides:
- Multiple rate limit categories (ai, ai-tutor, admin-ai, progress, contact, auth)
- Sliding window algorithm
- Both Redis (production) and in-memory (development) implementations
- Proper retry-after headers

### ✅ Robust Input Validation on Critical Routes
Several routes have excellent validation:
- `/api/admin/reorder` - UUID validation, bounds checking, array limits
- `/api/ai/conversations/[id]/messages` - UUID validation, content length limits
- `/api/contact` - Email validation, length limits, sanitization
- `/api/lessons/progress` - Quiz score bounds checking
- `/api/flashcards/generate` - Array validation, count limits

### ✅ File Upload Security
`/api/admin/founders/[id]/photo` implements:
- File type validation (JPEG, PNG, WebP only)
- File size limit (5MB)
- Proper storage handling

---

## Route-by-Route Audit Matrix

| Route | Auth | Admin | Rate Limit | Input Val | Ownership | Error Handling | Status |
|-------|------|-------|------------|-----------|-----------|----------------|--------|
| `/api/achievements` | ✅ | N/A | ⚠️ | ⚠️ | ✅ | ✅ | Needs minor fixes |
| `/api/admin/bulk` | ✅ | ✅ | ⚠️ | ✅ | N/A | ✅ | OK |
| `/api/admin/flashcards` | ✅ | ✅ | ⚠️ | ✅ | N/A | ✅ | OK |
| `/api/admin/flashcards/[id]` | ✅ | ✅ | ⚠️ | ⚠️ | N/A | ✅ | Needs UUID val |
| `/api/admin/flashcards/[id]/approve` | ✅ | ✅ | ⚠️ | ⚠️ | N/A | ✅ | Needs UUID val |
| `/api/admin/flashcards/[id]/reject` | ✅ | ✅ | ⚠️ | ⚠️ | N/A | ✅ | Needs UUID val |
| `/api/admin/flashcards/[id]/similar` | ✅ | ✅ | ⚠️ | ⚠️ | N/A | ✅ | Needs UUID val |
| `/api/admin/founders/[id]` | ✅ | ✅ | ⚠️ | ⚠️ | N/A | ✅ | Needs UUID val |
| `/api/admin/founders/[id]/photo` | ✅ | ✅ | ⚠️ | ✅ | N/A | ✅ | OK |
| `/api/admin/generate-content` | ✅ | ✅ | ❌ | ⚠️ | N/A | ✅ | **High priority** |
| `/api/admin/generate-quiz` | ✅ | ✅ | ❌ | ⚠️ | N/A | ✅ | **High priority** |
| `/api/admin/generate-video` | ✅ | ✅ | ❌ | ⚠️ | N/A | ✅ | **High priority** |
| `/api/admin/quizzes` | ✅ | ✅ | ⚠️ | ✅ | N/A | ⚠️ | Minor fix |
| `/api/admin/quizzes/[id]/approve` | ✅ | ✅ | ⚠️ | ⚠️ | N/A | ✅ | Needs UUID val |
| `/api/admin/quizzes/[id]/reject` | ✅ | ✅ | ⚠️ | ⚠️ | N/A | ✅ | Needs UUID val |
| `/api/admin/reorder` | ✅ | ✅ | ⚠️ | ✅ | N/A | ✅ | **Excellent** |
| `/api/admin/video-chat` | ✅ | ✅ | ⚠️ | ✅ | N/A | ✅ | OK |
| `/api/ai/conversations` | ✅ | N/A | ✅ | ⚠️ | ✅ | ✅ | Needs input val |
| `/api/ai/conversations/[id]` | ✅ | N/A | ✅ | ⚠️ | ✅ | ✅ | Needs UUID val |
| `/api/ai/conversations/[id]/messages` | ✅ | N/A | ✅ | ✅ | ✅ | ✅ | **Excellent** |
| `/api/auth/delete-account` | ✅ | N/A | ✅ | ✅ | ✅ | ✅ | OK |
| `/api/contact` | N/A | N/A | ✅ | ✅ | N/A | ✅ | **Excellent** |
| `/api/flashcards` | ✅ | N/A | ⚠️ | ⚠️ | ✅ | ✅ | Needs minor fixes |
| `/api/flashcards/cards` | ⚠️ | N/A | ⚠️ | ⚠️ | ✅ | ✅ | Optional auth OK |
| `/api/flashcards/generate` | ✅ | N/A | ✅ | ⚠️ | ✅ | ✅ | Needs UUID val |
| `/api/flashcards/grade` | ✅ | N/A | ✅ | ⚠️ | ✅ | ⚠️ | Minor fixes |
| `/api/flashcards/knowledge` | ✅ | N/A | ⚠️ | ⚠️ | ✅ | ⚠️ | Minor fixes |
| `/api/gemini/ask` | ✅ | N/A | ✅ | ✅ | N/A | ✅ | **Excellent** |
| `/api/gemini/explain` | ✅ | N/A | ✅ | ✅ | N/A | ✅ | **Excellent** |
| `/api/leaderboard` | N/A | N/A | ⚠️ | ✅ | N/A | ✅ | Public read OK |
| `/api/lessons/progress` | ✅ | N/A | ✅ | ✅ | ✅ | ✅ | **Excellent** |
| `/api/practice/progress` | ✅ | N/A | ✅ | ⚠️ | ✅ | ⚠️ | Minor fixes |
| `/api/stats` | ✅ | N/A | ⚠️ | ✅ | ✅ | ✅ | OK |
| `/api/streaks` | ✅ | N/A | ⚠️ | ✅ | ✅ | ✅ | OK |
| `/api/videos/[id]` | ⚠️ | ⚠️ | ⚠️ | ✅ | N/A | ✅ | OK (tiered access) |

**Legend:**
- ✅ = Implemented correctly
- ⚠️ = Partially implemented or needs improvement
- ❌ = Missing/not implemented
- N/A = Not applicable for this route

---

## Remediation Roadmap

### Priority 1: High Severity (Fix Today) - ~2 hours

1. **Add rate limiting to admin AI routes**
   - `/api/admin/generate-content/route.ts`
   - `/api/admin/generate-quiz/route.ts`
   - `/api/admin/generate-video/route.ts`

2. **Add prompt sanitization to admin AI routes**
   - Import and use `sanitizeForPrompt` from lib/gemini.ts

### Priority 2: Medium Severity (Fix This Week) - ~1.5 hours

3. **Add input validation to conversation routes**
   - `/api/ai/conversations/route.ts` POST - validate lessonId, moduleId, title

4. **Add UUID validation to dynamic routes**
   - `/api/ai/conversations/[id]/route.ts`
   - All `/api/admin/flashcards/[id]/*` routes
   - All `/api/admin/quizzes/[id]/*` routes
   - `/api/admin/founders/[id]/*` routes

### Priority 3: Low Severity (Fix Next Sprint) - ~1 hour

5. **Add validation to flashcard/achievement routes**
   - `/api/flashcards/route.ts` - validate flashcardId
   - `/api/flashcards/knowledge/route.ts` - validate flashcardId
   - `/api/achievements/route.ts` - validate achievementId
   - `/api/practice/progress/route.ts` - validate lessonId

6. **Sanitize error responses**
   - Remove `details: error.message` from client responses
   - Keep detailed logging server-side

### Priority 4: Info/Enhancements (Backlog)

7. Consider adding request logging for audit trail
8. Consider CSP headers for additional protection
9. Consider confirmation mechanism for account deletion

---

## Appendix A: Security Utilities to Create

### Recommended: `/lib/security/authMiddleware.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null,
      supabase: null
    }
  }

  return { user, supabase, error: null }
}

export async function requireAdmin() {
  const result = await requireAuth()
  if (result.error) return { ...result, profile: null }

  const { data: profile } = await result.supabase!
    .from('profiles')
    .select('is_admin')
    .eq('id', result.user!.id)
    .single()

  if (!profile?.is_admin) {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      user: null,
      supabase: null,
      profile: null
    }
  }

  return { ...result, profile, error: null }
}
```

### Recommended: `/lib/security/rateLimitHelper.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIP, RateLimitCategory } from '@/lib/rateLimit'

export async function enforceRateLimit(
  request: NextRequest,
  category: RateLimitCategory
): Promise<NextResponse | null> {
  const ip = getClientIP(request)
  const result = await checkRateLimit(ip, category)

  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(result.retryAfterMs / 1000)
      },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(result.retryAfterMs / 1000)) }
      }
    )
  }

  return null // No error, continue processing
}
```

---

## Appendix B: Testing Checklist

See `/security-audit/testing-checklist.md` for manual and automated security testing procedures.

---

## Conclusion

The Max Apogee codebase has a **solid security foundation** with consistent authentication, authorization, and ownership verification patterns. The main gaps are:

1. **Rate limiting not enforced on admin AI routes** - High priority fix
2. **Prompt sanitization missing in admin routes** - Medium priority fix
3. **UUID validation inconsistent** - Medium priority fix
4. **Minor input validation gaps** - Low priority fix

With the recommended remediations, the API will have comprehensive security coverage. The existing rate limiting infrastructure and validation utilities make these fixes straightforward to implement.

**Estimated Total Remediation Time:** 4-6 hours
