# Pulse PRD & Implementation Plan

## Context

**Competition:** FBLA Coding & Programming 2025-2026
**Topic:** "Byte-Sized Business Boost" — Build a tool that helps users discover and support small, local businesses
**Deadline:** Pre-judged video due **February 20, 2026** (4 days from now)
**Total Score:** 110 points across Code Quality, User Experience, Functionality, Presentation Delivery, and Protocols

**What is Pulse?**
Pulse is a local business discovery platform that shows users how their engagement strengthens their local economy. Users can discover businesses via GPS/zip code search powered by Google Places, leave reviews, bookmark favorites, claim deals, complete "Boost Missions," and track their economic impact through a personal dashboard. The app uses AI (Google Gemini) for business descriptions and recommendations, Cloudflare Turnstile for bot prevention, and Supabase for authentication and data persistence.

**Tech Stack:**
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui
- **Backend:** Supabase (Auth, PostgreSQL + PostGIS, Storage), Next.js API Routes
- **AI:** Google Gemini API (business descriptions, assistant Q&A)
- **Data:** Google Places API (real business data), React Query (caching)
- **Security:** Cloudflare Turnstile (CAPTCHA), Zod (validation), Upstash Redis (rate limiting)
- **Visualization:** Recharts (impact charts)

---

## Critical Rubric Analysis (110 points)

| Category | Item | Max Pts | Current Est. | Gap |
|----------|------|---------|-------------|-----|
| **Code Quality** | Language selection explanation | 5 | 5 | None — TypeScript/Next.js is strong |
| **Code Quality** | Comments, naming, formatting | 5 | 2 | Sparse comments throughout codebase |
| **Code Quality** | Modular, logical, readable | 10 | 8 | Good architecture, needs minor cleanup |
| **User Experience** | UX Design, user journey, accessibility | 10 | 5 | **No accessibility features at all** |
| **User Experience** | Intuitive UI / clear instructions | 5 | 3 | No onboarding, no help system |
| **User Experience** | Navigation + intelligent feature (Q&A) | 5 | 3 | AI Assistant exists but unpolished |
| **User Experience** | Input validation | 5 | 4 | Zod schemas exist, need UI error display |
| **Functionality** | Addresses all parts of prompt | 10 | 8 | All 6 required features present |
| **Functionality** | Presentable/customizable report | 10 | 2 | **Dashboard exists but NO export/customization** |
| **Functionality** | Data storage (arrays, lists, scope) | 5 | 5 | Strong — Supabase, React Query, typed |
| **Presentation** | Well-organized delivery | 10 | — | Up to presenters |
| **Presentation** | Confidence, body language | 10 | — | Up to presenters |
| **Presentation** | Answer questions effectively | 10 | — | Up to presenters |
| **Protocols** | Adherence to guidelines | 10 | 10 | Follow rules |
| | **TOTAL** | **110** | **~55/80 code** | |

### Biggest Point Gaps (where we gain the most points fastest):

1. **Customizable Reports/Export** — Currently ~2/10, could be 9/10 = **+7 points**
2. **Accessibility** — Currently ~5/10, could be 9/10 = **+4 points**
3. **Code Comments** — Currently ~2/5, could be 5/5 = **+3 points**
4. **Intelligent Feature (AI Q&A)** — Currently ~3/5, could be 5/5 = **+2 points**
5. **Instructions/Help** — Currently ~3/5, could be 5/5 = **+2 points**

---

## Honest Assessment of Current State

### What's Working Well
- Business discovery with real Google Places data (not mock)
- Review system with Google review sync
- Bookmarking fully functional
- Deals with claim/redeem codes
- Impact dashboard with real user metrics
- Leaderboard with tier system
- Auth flow (Supabase)
- Cloudflare Turnstile CAPTCHA built and ready
- Zod validation schemas comprehensive
- Clean component architecture

### What's Broken or Fake
1. **Missions page** (`web/app/missions/page.tsx`) — Entirely hardcoded mock data (ACTIVE_MISSIONS array). Not pulling from database at all.
2. **Homepage stats** (`web/app/page.tsx`) — Hardcoded "$2.4M", "847", "12.5K", "3.2K". Not connected to any real data source.
3. **Homepage community pulse card** — Hardcoded "8,742" pulse score, static bar widths.
4. **AI Assistant** (`web/app/assistant/page.tsx`) — Exists but untested, response quality unknown.
5. **3D models** (Rocket, Asteroid, SpaceScene) — Partially implemented, potential loading issues, not relevant to the business discovery topic.

### What's Missing Entirely
1. **Report export** — No way to download/export impact data or business lists
2. **Accessibility** — Only 5 ARIA attributes across entire app directory. No skip links, no keyboard navigation testing, no screen reader support, no focus management.
3. **Help system / onboarding** — No first-time user flow, no help menu, no tooltips
4. **Code comments** — Most files lack JSDoc or inline explanation
5. **Error boundaries** — No graceful error handling on pages

### What Should Be Removed/Hidden
- 3D model components (Rocket, Asteroid, SpaceScene) — loading risk during demo, irrelevant to topic
- Educational/course types that bleed through from another project (flashcards, AI quiz, etc.)

---

## Required Features Checklist (from FBLA prompt)

| Required Feature | Status | Where |
|-----------------|--------|-------|
| Sort businesses by category | **Done** | Discover page filter bar |
| Allow users to leave reviews/ratings | **Done** | Business detail page Reviews tab |
| Sort businesses by reviews/ratings | **Done** | Discover page sort options |
| Save/bookmark favorite businesses | **Done** | Bookmark button + Bookmarks page |
| Display special deals/coupons | **Done** | Deals page + Business detail Deals tab |
| Verification step to prevent bots | **Built** | CaptchaWidget + captcha.ts (verify wired to review form) |

---

## Implementation Plan

### Phase 1: Report System & Data Fixes (HIGH RUBRIC VALUE — +7 pts)
**Priority: CRITICAL — This is the single biggest scoring gap**
**Status:** Not started

#### 1A. Impact Report Export Feature
**Files to create/modify:**
- `web/app/dashboard/page.tsx` — Add "Generate Report" button and report modal
- `web/components/features/dashboard/ImpactReport.tsx` — New report component
- `web/lib/report-generator.ts` — New utility for generating report data

**What to build:**
- "Download My Impact Report" button on dashboard
- Report shows: personal impact metrics, businesses supported list, review history, deals claimed, timeline of activity
- Export as printable HTML / downloadable CSV
- Date range filter (this week, this month, all time)
- Category breakdown chart
- This directly hits "Output reports allow user to customize and analyze information" for 9-10 pts

#### 1B. Fix Homepage Community Stats
**File:** `web/app/page.tsx`
- Replace hardcoded stats with server-fetched data from `/api/community-pulse`
- Replace hardcoded community pulse card with real data
- Use `useCommunityPulse()` hook that already exists in `web/hooks/useImpact.ts`

#### 1C. Fix Missions Page
**File:** `web/app/missions/page.tsx`
- Remove hardcoded `ACTIVE_MISSIONS` and `COMPLETED_MISSIONS` arrays
- Use existing `useMissionProgressDetails` hook from `web/hooks/useMissions.ts`
- Fall back gracefully if no missions exist in DB

---

### Phase 2: Accessibility & UX Polish (+4-6 pts)
**Priority: HIGH — Directly impacts UX Design score (10 pts)**
**Status:** Not started

#### 2A. Core Accessibility
**Files to modify:** All page files and key components
- Add skip-to-content link in root layout (`web/app/layout.tsx`)
- Add `aria-label` to all interactive elements (buttons, links, inputs)
- Add `role` attributes to landmark regions (nav, main, footer)
- Ensure all images have `alt` text
- Add focus-visible outlines (check theme.css)
- Add `aria-live="polite"` regions for dynamic content (search results, notifications)
- Keyboard navigation: ensure Tab order is logical, Escape closes modals

#### 2B. Help System & Onboarding
**Files to create/modify:**
- `web/components/features/help/HelpMenu.tsx` — New help overlay/tooltip system
- Modify Header to include Help button
- Add contextual tooltips on key actions (first bookmark, first review, first check-in)
- Add a "How It Works" section on the Discover page for first-time visitors

#### 2C. Error States & Loading
- Add error boundaries to key pages
- Ensure all pages handle empty states gracefully (no businesses found, no reviews yet, etc.)
- Verify skeleton loaders are working on all data-dependent pages

---

### Phase 3: Intelligent Feature & Validation Polish (+2-4 pts)
**Status:** Not started

#### 3A. AI Assistant Polish
**Files:** `web/app/assistant/page.tsx`, `web/app/api/assistant/route.ts`
- Test and verify assistant responses
- Ensure it can answer: business recommendations, impact questions, feature explanations
- Add loading states and error handling
- Make it accessible from every page (already in layout as ChatWidget)
- This is the "interactive Q&A" that gets 5/5 on navigation rubric item

#### 3B. Input Validation UI
**Files:** Review form in business page, login/register forms
- Wire Zod schema errors to display inline error messages on forms
- Ensure review form validates: minimum length, star rating required, max length
- Ensure search validates: sanitized input, helpful empty state
- Confirm CaptchaWidget is integrated into the review submission flow
- Test edge cases: empty submission, XSS attempts, extremely long input

#### 3C. CAPTCHA Integration Verification
- Verify `CaptchaWidget` is rendered on the review form
- Verify `verifyCaptcha()` is called in the review API route
- Verify the check-in endpoint has rate limiting
- This is required by the FBLA prompt and will be asked about

---

### Phase 4: Code Quality & Comments (+3 pts)
**Status:** Not started

#### 4A. JSDoc Comments on Key Files
Add thorough JSDoc comments to these critical files (judges will see code):
- `web/hooks/useBusinesses.ts` — Document each hook, params, return types
- `web/hooks/useImpact.ts` — Document impact calculation logic
- `web/hooks/useDeals.ts` — Document deal claim flow
- `web/app/api/businesses/nearby/route.ts` — Document the Google Places sync logic
- `web/app/api/businesses/[id]/route.ts` — Document business detail API
- `web/lib/gemini-business.ts` — Document AI description generation
- `web/components/features/bot/CaptchaWidget.tsx` — Document Turnstile integration

#### 4B. Code Cleanup
- Remove unused imports
- Remove 3D model components or hide them (they add no value to the topic and risk demo issues)
- Ensure consistent naming conventions
- Clean up any `console.log` statements

---

### Phase 5: Demo Prep & Final Polish
**Status:** Not started

#### 5A. Demo Flow Script
Prepare a reliable demo path that hits every rubric item:
1. Homepage → show community stats (real data)
2. Discover → filter by category, sort by rating, search
3. Business detail → show hours, photos, map, reviews
4. Leave a review → show CAPTCHA, validation, submission
5. Bookmark a business → show saved notification
6. Deals page → claim a deal, show redemption code
7. Dashboard → show personal impact metrics
8. Generate report → show export/customization
9. AI Assistant → ask a question, get recommendation
10. Leaderboard → show community engagement

#### 5B. Offline Fallback Consideration
- Pre-load business data so the demo works even with slow internet
- Cache key API responses
- Have a backup plan if Google Places API is slow

#### 5C. Build Verification
- Run `npm run build` — must complete with zero errors
- Run `npm run test:run` — all tests must pass
- Run `npm run lint` — no lint errors
- Test on a clean browser (incognito) to catch auth/cookie issues

---

## Key Files Reference

| Purpose | File Path |
|---------|-----------|
| Homepage | `web/app/page.tsx` |
| Discover | `web/app/discover/page.tsx` |
| Business Detail | `web/app/business/[id]/page.tsx` |
| Dashboard | `web/app/dashboard/page.tsx` |
| Missions | `web/app/missions/page.tsx` |
| Deals | `web/app/deals/page.tsx` |
| Bookmarks | `web/app/bookmarks/page.tsx` |
| Leaderboard | `web/app/leaderboard/page.tsx` |
| AI Assistant | `web/app/assistant/page.tsx` |
| Nearby API | `web/app/api/businesses/nearby/route.ts` |
| Business API | `web/app/api/businesses/[id]/route.ts` |
| Review Hooks | `web/hooks/useReviews.ts` |
| Business Hooks | `web/hooks/useBusinesses.ts` |
| Impact Hooks | `web/hooks/useImpact.ts` |
| Deal Hooks | `web/hooks/useDeals.ts` |
| Mission Hooks | `web/hooks/useMissions.ts` |
| CAPTCHA | `web/lib/captcha.ts` + `web/components/features/bot/CaptchaWidget.tsx` |
| Validation | `web/lib/validation.ts` |
| Theme | `web/app/theme.css` |
| Root Layout | `web/app/layout.tsx` |
| Auth Provider | `web/components/providers/AuthProvider.tsx` |
| DB Schema | `web/supabase/pulse_schema.sql` |

---

## Verification Plan

After each phase, verify:
1. `cd web && npm run build` — zero errors
2. `cd web && npm run test:run` — all tests pass
3. Manual test the affected pages in browser
4. Check accessibility with keyboard-only navigation

Final verification before video recording:
- Full demo walkthrough in incognito browser
- All 6 required features demonstrated
- Report export works
- AI Assistant responds correctly
- No console errors
- App loads within 3 seconds
