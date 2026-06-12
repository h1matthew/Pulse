# GAPS.md — Rubric Risk Audit (2026-06-11)

Audit of the Pulse codebase against the FBLA Coding & Programming rating sheet.
Most rubric rows are **strongly covered** (see "What's solid" at the bottom).
The items below are the gaps/risks to fix or rehearse before competing, in priority order.

---

## 1. ❗ CRITICAL — App is not offline-capable, but venue has no reliable internet

The competition guidelines say equipment must run **standalone with no internet
dependence**. Pulse currently hard-depends on cloud services at runtime:

| Dependency | Used by | Failure mode offline |
|---|---|---|
| Supabase (cloud PostgreSQL) | every data fetch (`lib/supabase/*`) | empty pages, fetch errors |
| Google Gemini API | AI Assistant (`lib/assistant/index.ts:107`), descriptions (`lib/gemini-business.ts`) | assistant errors out |
| Google Places API | business sync (`app/api/businesses/nearby/route.ts`) | no new data (cached data OK) |
| Cloudflare Turnstile | CAPTCHA verify (`lib/captcha.ts:92`) | review submit fails in prod mode |

**Mitigations to implement/rehearse:**
- Run a **local Supabase stack** (`supabase start` via Docker) on the demo laptop and point `.env` at it; seed it fully beforehand. Verify `npm run db:setup` works against local.
- Set `NEXT_PUBLIC_CAPTCHA_PROVIDER=local` for the demo build — `lib/captcha.ts:46-52` already supports a local provider and dev bypass tokens, and `BaanihaliPuzzleCaptcha.tsx` provides a fully offline puzzle CAPTCHA the judges can watch being solved.
- The AI Assistant has **no offline fallback** — either pre-cache canned responses, demo it in the recorded video only, or accept it may fail and script around it.
- Record the **fallback screen recording** (see DEMO_SCRIPT.md) and store it locally on the laptop.
- Charge the laptop fully — **no electricity at venue**.

## 2. ⚠️ "AI-Matched For You feed" is overstated — preferences are stored but never used for matching

`user_preferences` (settings page, `app/api/user/preferences/route.ts`,
`userPreferencesSchema` in `lib/validation.ts:141`) collects preferred categories,
price range, and ambiance — but **no code consumes them to rank the Discover feed**.
The Discover sort is a non-personalized weighted-rating algorithm
(`app/discover/page.tsx:529-531`).

**Options (pick one before competing):**
- (a) Implement a simple weighted scoring pass in `useBusinesses`/discover that boosts businesses matching `preferred_categories`, bookmarked categories, and prior high ratings (~1 day of work; makes the claim true), or
- (b) Reframe the deck/script: the intelligent feature is the **Gemini AI Assistant with RAG** (`lib/assistant/rag.ts` — keyword extraction, category detection, amenity detection, context retrieval), which is genuinely implemented and demoable. The deck created today uses framing (b) with the weighted rating sort as a supporting "smart ranking" point. README's "AI-Matched For You Feed" bullet should be softened if (a) isn't built.

## 3. ⚠️ Gemini model name may be stale

`lib/assistant/index.ts:108` uses `gemini-1.5-flash`, which Google has been
deprecating. Test the assistant end-to-end before competition; bump the model
string if calls fail.

## 4. Minor — verify before the demo

- **Demo data fullness**: screenshots/demo need seeded businesses with real photos, reviews, active deals, claimed deals, and a populated impact dashboard. Run `npm run db:setup` and spot-check `/discover`, `/deals`, `/dashboard`.
- **Hidden judge-facing extras**: ensure no console errors in the demo path; the rubric penalizes visible crashes. Search inputs are sanitized (`app/discover/page.tsx:514`) and APIs return friendly errors, but rehearse error-free flows.
- **Report "customizable" emphasis**: the impact report (`lib/report-generator.ts`, `app/api/impact/report/route.ts`, dashboard export modal) supports date-range + category filtering, sortable tables, CSV download, and print layout. Make sure the demo actually shows changing a filter so "customizable" is unambiguous.
- **In-app instructions**: HelpMenu (`components/features/help/HelpMenu.tsx`) and OnboardingTour exist — confirm the tour triggers for a fresh profile on the demo machine (clear localStorage first).

---

## What's solid (no action needed — cite these in the deck)

- **Language choice**: TypeScript 5 strict mode + Next.js 16 App Router (`web/tsconfig.json` line 7), React 19, Tailwind v4, shadcn/Radix. Industry-standard SSR stack.
- **Modular design**: clear separation — `app/` routes, `components/features/*` by domain, `hooks/` (React Query), `lib/` utilities, `types/` interfaces; provider nesting in `app/layout.tsx:59-73`.
- **Comments/naming**: consistent 4-section file headers (USER JOURNEY / INPUT VALIDATION / ACCESSIBILITY / DESIGN RATIONALE) — e.g. `app/api/reviews/route.ts:1-30`, `lib/captcha.ts:1-28`, `lib/validation.ts:33-68`. PascalCase components, camelCase utilities, named exports.
- **Validation**: Zod syntactic schemas + semantic server checks (duplicate 409, CAPTCHA, derived `verified_purchase`) in `lib/validation.ts` + `app/api/reviews/route.ts`; sanitization layer in `lib/validation/sanitization.ts`; prompt-injection filtering in `lib/assistant/index.ts:35-50`.
- **Data structures/scope**: typed arrays via React Query hooks (`hooks/useBusinesses.ts`), `useMemo`-scoped derived lists, module-level constants, interfaces in `types/`.
- **All 6 topic features**: category sort + rating sort (`app/discover/page.tsx`), reviews (`app/api/reviews/route.ts`), bookmarks (`app/bookmarks`, `hooks/useBookmarks.ts`), deals with claim codes (`app/deals`, `app/api/deals/[id]/claim`), bot verification (`lib/captcha.ts`, `components/features/bot/`).
- **Output/analysis**: customizable impact report with CSV/print (`lib/report-generator.ts`), dashboard charts (Recharts), community pulse, leaderboard.
- **Accessibility**: skip link (`app/layout.tsx:53`), aria-live AccessibilityProvider, `useFocusTrap`, `useAnnouncer`, reduced-motion support, dedicated a11y tests.
