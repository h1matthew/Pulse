# Pulse — 7-Minute Presentation Script
**FBLA Coding & Programming 2025–2026 · "Byte-Sized Business Boost"**
Team: **Felix Yin (A) · Oscar Gao (B) · Matthew Heng (C)** — Diamond Bar FBLA

Total ≈ 1,010 words ≈ 7:00 at a measured 145 wpm. Timing marks assume the demo
runs exactly 2:00 (rehearse with a stopwatch — the demo is the variable).

Word counts per presenter: Felix ≈ 340 · Oscar ≈ 330 · Matthew ≈ 340.

---

## Slide 1 — Title (0:00–0:30) — FELIX

Good morning, judges. I'm Felix Yin, and with me are Oscar Gao and Matthew Heng from Diamond Bar FBLA. For the "Byte-Sized Business Boost" topic we built **Pulse** — a web platform that helps people discover small local businesses, and then shows them exactly how their spending strengthens their own community. Discovery gets a customer in the door once; visible impact brings them back. That second half is what makes Pulse different.

> **Handoff:** "Oscar will show you the problem we started from."

## Slide 2 — Problem & Solution (0:30–1:10) — OSCAR

Research shows 68 cents of every dollar spent locally recirculates in the community — versus just 43 cents at a national chain. Yet small businesses keep losing customers to chains, because they have no shared platform for discovery. Pulse answers every requirement of the prompt: users browse businesses **sorted by category**, leave **reviews and ratings**, **sort by those ratings**, **bookmark favorites**, claim **deals and coupons**, and every submission passes **bot verification**. On top of that foundation we added an AI assistant and a live economic-impact dashboard — you'll see all of it today.

> **Handoff:** "Felix will explain the technology choices behind it."

## Slide 3 — Language Selection (1:10–1:45) — FELIX

We chose **TypeScript with Next.js**. TypeScript's static type system catches entire classes of bugs at compile time — null references, wrong argument types — before they ever reach a judge's screen, and strict mode is enabled in our compiler config. Next.js gives us server-side rendering for fast first paint, file-based API routes so we don't maintain a separate backend, and React's component model for the UI. We weighed Python with Flask — simpler, but no end-to-end type safety across client and server — and chose the industry-standard production stack used by companies like Netflix and Vercel.

> **Handoff:** "Matthew will walk through how the code is organized."

## Slide 4 — Architecture & Modular Design (1:45–2:20) — MATTHEW

The codebase is organized by responsibility, which you can see in this structure. Pages and API routes live in `app`, reusable components are grouped by feature, all data fetching is isolated in React Query hooks, shared utilities in `lib`, and every data shape is a TypeScript interface in `types`. At the root, four nested providers — theme, server-state, authentication, and accessibility — each do exactly one job. Behind it all sits Supabase PostgreSQL with row-level security, so authorization is enforced in the database itself, not just in our code.

> **Handoff:** "Felix will zoom into the code itself."

## Slide 5 — Code Quality (2:20–2:50) — FELIX

Every significant file opens with the same four-section comment header: User Journey, Input Validation, Accessibility, and Design Rationale — here it is on our reviews API. Naming follows one convention everywhere: PascalCase components, camelCase utilities, typed named exports. The point isn't decoration — a teammate can open any file cold and know what it does, what it checks, and why it's built that way.

> **Handoff:** "Oscar will cover the user experience."

## Slide 6 — UX Design (2:50–3:25) — OSCAR

We designed for everyone. The user journey is three steps — discover, engage, see your impact — and the persistent header reaches every feature in one click. Accessibility is engineered, not assumed: a skip-to-content link for keyboard users, focus trapping inside dialogs, screen-reader announcements through live regions, WCAG-compliant contrast in light and dark mode, and the app honors your system's reduced-motion setting. A built-in onboarding tour and help menu mean nobody needs a manual.

> **Handoff:** "Now the part we're most excited about — Matthew, take it away."

## Slide 7 — Live Demo (3:25–5:25) — MATTHEW (leave this slide up)

*(Demo narration — follow DEMO_SCRIPT.md click-by-click, ≈280 words ≈ 2:00.)*

Here's Pulse running live. On Discover, these category pills filter instantly — Food & Drink, Retail, Services — that's **sort by category**. The sort menu ranks by **highest rated**, weighted by review volume, so one five-star review can't beat a hundred. On a business page I'll **leave a review** — four stars, my feedback — and before submitting I complete this puzzle: **bot verification**, validated again on the server. Tapping the heart **bookmarks** a favorite; here's my saved list. The Deals page shows live **coupons** — I claim one and get a redemption code under my Claimed tab. Finally, my dashboard: dollars kept local, businesses supported — and this **customizable impact report** filters by date and category, downloads as CSV, and prints clean. Every required feature, live, with zero errors.

> **Handoff:** "Felix will show you the intelligence underneath."

## Slide 8 — Intelligent Feature (5:25–5:55) — FELIX

Our assistant uses **retrieval-augmented generation**. When you ask for "a cozy coffee shop with wifi," we extract keywords, detect the category and amenities, pull matching businesses from our own database, and only then hand that context to Google's Gemini model — so answers cite real local businesses, never hallucinated ones. Prompt-injection filters sanitize every query before it reaches the model.

> **Handoff:** "Oscar — how we keep bad data out."

## Slide 9 — Input Validation (5:55–6:15) — OSCAR

Validation happens twice. **Syntactic** — Zod schemas verify format: ratings must be integers one through five, reviews ten to two thousand characters, IDs valid UUIDs. **Semantic** — the server checks meaning: duplicate reviews are rejected with a clear message, CAPTCHA tokens re-verified. Friendly errors, never crashes.

> **Handoff:** "Matthew — where the data lives."

## Slide 10 — Data Storage & Structures (6:15–6:35) — MATTHEW

Data flows as typed arrays of interface objects — every business, review, and deal matches a TypeScript contract. Scope is deliberate: module constants for static data, component state for UI, React Query cache for server data, PostgreSQL for persistence.

## Slide 11 — Output & Data Analysis (6:35–6:50) — OSCAR

The impact report turns raw check-ins into insight: category breakdowns, a sortable business table, CSV export for spreadsheets, and an economic multiplier showing your dollars kept local — data analysis users actually act on.

## Slide 12 — Closing (6:50–7:00) — FELIX

Six required features, an intelligent assistant, and measurable community impact — that's Pulse: a byte-sized business boost. Thank you, judges — we welcome your questions.

---

### Rehearsal notes
- The **demo is the timing risk** — rehearse to 2:00 flat; if it runs long, Slides 9–11 each have one cuttable sentence (the last one).
- Transitions are one line each; the next presenter should already be stepping forward.
- All three speak within the first 2:20 — judges check early participation.
