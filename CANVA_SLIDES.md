# Canva Deck Blueprint — "Byte-Sized Business Boost — Pulse"

16:9 presentation, 12 slides. Theme: white/light background to match the app,
**primary blue** accents (app's oklch blue ≈ #3B6EF6), dark slate text,
clean sans-serif (Inter). Pulse logo (`web/public/logo.svg`) small in a corner
of every slide. Max ~30 words of body text per slide.

Notes layer on every slide cites: Lucide icons (ISC), Pulse logo (original),
all screenshots original from our app/code; business photos within app
screenshots are Google Places content displayed with attribution.

| # | Slide | On-slide copy (≤30 words) | Assets placed |
|---|---|---|---|
| 1 | Title | **Pulse** — Discover. Support. See your impact. / Felix Yin · Brady Chen · Matthew Heng / Diamond Bar FBLA / Coding & Programming 2025–26 | `slides/logo.svg`, `assets/app-home.png` (faded backdrop) |
| 2 | Problem & Solution | 68¢ of a local dollar stays local — 43¢ at a chain. Source: AMIBA/Civic Economics. Pulse: category sort · reviews & ratings · rating sort · bookmarks · deals & coupons · bot verification | `assets/app-home.png` |
| 3 | Language Selection | TypeScript + Next.js 16 — static types catch bugs at compile time; SSR, API routes, one production artifact. Considered: Python/Flask | `assets/code-language-tsconfig.png` |
| 4 | Architecture & Modular Design | Organized by responsibility — routes, feature components, data hooks, utilities, typed contracts. Four single-purpose providers | `assets/code-module-tree.png`, `assets/code-modular-providers.png` |
| 5 | Code Quality | Every file: User Journey · Input Validation · Accessibility · Design Rationale. One naming convention everywhere | `assets/code-comments.png` |
| 6 | UX Design | Discover → Engage → Impact. Skip links · focus traps · live regions · WCAG contrast · reduced motion · built-in tour | `assets/app-onboarding-tour.png` |
| 7 | Live Demo | Checklist: Category sort ✓ Reviews ✓ Rating sort ✓ Bookmarks ✓ Deals ✓ Bot verification ✓ Custom report ✓ | `assets/app-category-sort.png`, `assets/app-rating-sort.png`, `assets/app-bookmarks.png`, `assets/app-deals.png` (2×2 grid) |
| 8 | Intelligent Feature | RAG: extract keywords → detect category & amenities → retrieve real businesses → Gemini answers. Real data, never hallucinated | `assets/app-intelligent-feature.png`, `assets/code-intelligent-feature.png` |
| 9 | Input Validation | Syntactic: Zod — rating 1–5, content 10–2000 chars, UUIDs. Semantic: duplicates 409, CAPTCHA re-verified. Friendly errors, no crashes | `assets/code-validation-syntactic.png`, `assets/code-validation-semantic.png`, `assets/app-review-form.png` (small) |
| 10 | Data Storage & Structures | Typed arrays of interface objects · module constants · component state · React Query cache · PostgreSQL persistence | `assets/code-data-structures.png` |
| 11 | Output & Data Analysis | Customizable impact report — date & category filters, sortable tables, CSV export, print layout. $1,840 kept local | `assets/app-impact-report.png`, `assets/app-dashboard.png` (small) |
| 12 | Closing | Six features. One intelligent assistant. Measurable community impact. **Pulse — a byte-sized business boost. Questions?** | `slides/logo.svg`, `assets/app-bot-verification.png` omitted — keep clean |

Unplaced spare: `assets/code-bot-verification.png` (use on slide 9 if space
allows or hold for Q&A), `assets/code-smart-sort.png` (Q&A backup for the
weighted-sort question).

Speaker notes per slide: paste the matching section from `SPEAKER_SCRIPT.md`.
Animations: apply per `CANVA_ANIMATION_GUIDE.md`.
