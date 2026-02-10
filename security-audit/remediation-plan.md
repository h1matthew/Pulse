# Remediation Plan: Max Apogee API Security

**Created:** February 3, 2026
**Based on:** Security Audit Findings Report

---

## Priority 1: High Severity Fixes (Do Today)

**Estimated Time:** 2 hours

### Task 1.1: Add Rate Limiting to Admin AI Routes

**Files to modify:**
1. `/web/app/api/admin/generate-content/route.ts`
2. `/web/app/api/admin/generate-quiz/route.ts`
3. `/web/app/api/admin/generate-video/route.ts`

**Implementation:**

Add this import at the top of each file:
```typescript
import { checkRateLimit, getClientIP } from '@/lib/rateLimit'
```

Add this block immediately after the admin authorization check:
```typescript
// Rate limiting for AI operations
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
```

**Time:** 15 minutes per file (45 minutes total)

---

### Task 1.2: Add Prompt Sanitization to Admin AI Routes

**Files to modify:**
1. `/web/app/api/admin/generate-content/route.ts`
2. `/web/app/api/admin/generate-quiz/route.ts`
3. `/web/app/api/admin/generate-video/route.ts`

**Option A: Import from lib/gemini.ts**

Export the sanitization function in `/web/lib/gemini.ts`:
```typescript
// Add 'export' keyword to line 13
export function sanitizeForPrompt(input: string, maxLength = 2000): string {
```

Then import in admin routes:
```typescript
import { sanitizeForPrompt } from '@/lib/gemini'
```

**Option B: Create shared utility**

Create `/web/lib/security/sanitize.ts`:
```typescript
/**
 * Sanitize user input for safe inclusion in AI prompts.
 */
export function sanitizeForPrompt(input: string, maxLength = 2000): string {
  if (!input || typeof input !== 'string') return ''

  return input
    .slice(0, maxLength)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/^#{1,6}\s/gm, '\\# ')
    .replace(/^##\s*(System|Instructions|Rules|Context|IMPORTANT)/gim, '[Section: $1]')
    .replace(/ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|rules?|context)/gi, '[filtered]')
    .replace(/disregard\s+(all\s+)?(previous|above|prior)/gi, '[filtered]')
    .replace(/new\s+instructions?:/gi, '[filtered]:')
    .replace(/you\s+are\s+now/gi, '[filtered]')
    .replace(/from\s+now\s+on/gi, '[filtered]')
    .replace(/forget\s+(everything|all)/gi, '[filtered]')
    .replace(/<\/?system[^>]*>/gi, '[tag]')
    .replace(/<\/?instructions?[^>]*>/gi, '[tag]')
    .replace(/<\/?context[^>]*>/gi, '[tag]')
    .trim()
}
```

**Usage in routes:**

```typescript
// generate-content/route.ts
const { prompt, type, returnStructured } = await request.json()
const sanitizedPrompt = sanitizeForPrompt(prompt, 5000)
// Use sanitizedPrompt instead of prompt in the system prompt

// generate-quiz/route.ts
const { context, count, difficulty, includeEquations } = await request.json()
const sanitizedContext = sanitizeForPrompt(context, 8000)
// Use sanitizedContext instead of context

// generate-video/route.ts
const { prompt } = await request.json()
const sanitizedPrompt = sanitizeForPrompt(prompt, 2000)
// Use sanitizedPrompt instead of prompt
```

**Time:** 30 minutes

---

## Priority 2: Medium Severity Fixes (This Week)

**Estimated Time:** 1.5 hours

### Task 2.1: Add Input Validation to Conversation Creation

**File:** `/web/app/api/ai/conversations/route.ts`

**Import validation utilities:**
```typescript
import { isValidUUID, isWithinLength } from '@/lib/validation'
```

**Update POST handler (after auth check):**
```typescript
const body = await request.json()
const { lessonId, moduleId, title } = body

// Validate optional UUIDs
if (lessonId !== undefined && lessonId !== null && !isValidUUID(lessonId)) {
  return NextResponse.json({ error: 'Invalid lessonId format. Must be a valid UUID.' }, { status: 400 })
}
if (moduleId !== undefined && moduleId !== null && !isValidUUID(moduleId)) {
  return NextResponse.json({ error: 'Invalid moduleId format. Must be a valid UUID.' }, { status: 400 })
}

// Sanitize and limit title length
const sanitizedTitle = (typeof title === 'string' ? title : 'New Conversation').slice(0, 200)

const { data: conversation, error } = await supabase
  .from('ai_chat_conversations')
  .insert({
    user_id: user.id,
    lesson_id: lessonId || null,
    module_id: moduleId || null,
    title: sanitizedTitle,
  })
```

**Time:** 15 minutes

---

### Task 2.2: Add UUID Validation to Dynamic Route Parameters

**Files to modify:**
1. `/web/app/api/ai/conversations/[id]/route.ts`
2. `/web/app/api/admin/flashcards/[id]/route.ts`
3. `/web/app/api/admin/flashcards/[id]/approve/route.ts`
4. `/web/app/api/admin/flashcards/[id]/reject/route.ts`
5. `/web/app/api/admin/flashcards/[id]/similar/route.ts`
6. `/web/app/api/admin/quizzes/[id]/approve/route.ts`
7. `/web/app/api/admin/quizzes/[id]/reject/route.ts`
8. `/web/app/api/admin/founders/[id]/route.ts`
9. `/web/app/api/admin/founders/[id]/photo/route.ts`

**Pattern for each handler:**

```typescript
import { isValidUUID } from '@/lib/validation'

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Validate UUID format
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid ID format. Must be a valid UUID.' }, { status: 400 })
    }

    // ... rest of handler
```

**Note:** The messages route already has this pattern implemented correctly - use it as reference:
```typescript
// From /api/ai/conversations/[id]/messages/route.ts lines 47-50
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
if (!uuidRegex.test(id)) {
  return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 })
}
```

**Time:** 5 minutes per file (45 minutes total)

---

### Task 2.3: Add UUID Validation to Flashcard Generate Route

**File:** `/web/app/api/flashcards/generate/route.ts`

**Add validation after parsing body:**
```typescript
import { isValidUUID } from '@/lib/validation'

// After: const { moduleId, lessonIds, count, difficulty } = body

// Validate moduleId
if (!isValidUUID(moduleId)) {
  return NextResponse.json({ error: 'Invalid moduleId format. Must be a valid UUID.' }, { status: 400 })
}

// Validate lessonIds array
if (!lessonIds.every((id: unknown) => typeof id === 'string' && isValidUUID(id))) {
  return NextResponse.json({ error: 'Invalid lessonIds. All must be valid UUIDs.' }, { status: 400 })
}
```

**Time:** 10 minutes

---

## Priority 3: Low Severity Fixes (Next Sprint)

**Estimated Time:** 1 hour

### Task 3.1: Add Validation to Flashcard/Achievement Routes

**Files:**
1. `/web/app/api/flashcards/route.ts`
2. `/web/app/api/flashcards/knowledge/route.ts`
3. `/web/app/api/achievements/route.ts`
4. `/web/app/api/practice/progress/route.ts`

**Pattern:**
```typescript
import { isValidUUID } from '@/lib/validation'

// In POST handler, after parsing body
if (!isValidUUID(flashcardId)) {  // or achievementId, lessonId
  return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
}
```

**Time:** 5 minutes per file (20 minutes total)

---

### Task 3.2: Sanitize Error Responses

**Pattern to find and replace:**

Find:
```typescript
return NextResponse.json(
  { error: 'Error message', details: error instanceof Error ? error.message : 'Unknown error' },
  { status: 500 }
)
```

Replace with:
```typescript
// Log detailed error server-side
console.error('Descriptive context:', error)

return NextResponse.json(
  { error: 'Error message. Please try again.' },
  { status: 500 }
)
```

**Files with this pattern:**
- `/web/app/api/flashcards/grade/route.ts`
- `/web/app/api/flashcards/knowledge/route.ts`
- `/web/app/api/admin/quizzes/route.ts`
- `/web/app/api/practice/progress/route.ts`
- Several admin flashcard routes

**Time:** 20 minutes

---

## Priority 4: Defense-in-Depth Enhancements (Backlog)

### Task 4.1: Create Reusable Security Utilities

**New file:** `/web/lib/security/index.ts`

```typescript
export * from './authMiddleware'
export * from './rateLimitHelper'
export * from './inputValidation'
```

**New file:** `/web/lib/security/authMiddleware.ts`

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface AuthResult {
  user: { id: string } | null
  supabase: ReturnType<typeof createClient> | null
  error: NextResponse | null
}

interface AdminResult extends AuthResult {
  profile: { is_admin: boolean } | null
}

export async function requireAuth(): Promise<AuthResult> {
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

export async function requireAdmin(): Promise<AdminResult> {
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

**Time:** 30 minutes

---

### Task 4.2: Add Request Logging

Consider adding a logging utility that tracks:
- Request timestamp
- Route path
- User ID (if authenticated)
- IP address
- Response status
- Response time

This can be implemented in middleware or as a utility function.

**Time:** 1-2 hours (separate ticket)

---

## Summary

| Priority | Tasks | Estimated Time |
|----------|-------|----------------|
| 1 (High) | Rate limiting + Prompt sanitization | 2 hours |
| 2 (Medium) | Input validation + UUID validation | 1.5 hours |
| 3 (Low) | Additional validation + Error sanitization | 1 hour |
| 4 (Backlog) | Security utilities + Logging | 2-3 hours |
| **Total** | | **6.5-7.5 hours** |

---

## Verification Steps

After implementing fixes:

1. **Run existing tests:**
   ```bash
   cd web && npm run test:run
   ```

2. **Manual testing checklist:**
   - [ ] Admin AI routes return 429 after 10 rapid requests
   - [ ] Invalid UUIDs return 400 with helpful message
   - [ ] Excessively long inputs are truncated/rejected
   - [ ] Error responses don't include stack traces

3. **Security regression tests (consider adding):**
   - Test rate limiting enforcement
   - Test UUID validation on all dynamic routes
   - Test prompt injection patterns are filtered
