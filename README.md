# Pulse - Local Business Discovery Platform

Pulse is a local business discovery platform that reports how a user's spending and engagement affect their local economy. Reviews, bookmarks, and claimed deals feed a live impact dashboard that totals dollars kept local and businesses supported.

**Built for FBLA Coding & Programming 2025-2026** — Topic: "Byte-Sized Business Boost"

## Features

### Core Features (FBLA Required)
- **Sort by Category**: Satisfies the prompt requirement to let users sort businesses by category through category pages, category chips, and category filters.
- **Reviews & Ratings**: Satisfies the prompt requirement to let users leave ratings and written reviews with inline validation.
- **Sort by Reviews/Ratings**: Satisfies the prompt requirement to sort by reviews and ratings through highest-rated, most-reviewed, distance, and alphabetical sort modes.
- **Bookmark Favorites**: Satisfies the prompt requirement to let users save businesses to a personal bookmarks page.
- **Deals & Coupons**: Satisfies the prompt requirement to support deals/coupons with claim flow, redemption codes, and Available/Claimed tabs.
- **Bot Verification**: Satisfies the prompt requirement to prevent automated abuse with Cloudflare Turnstile CAPTCHA on review submission plus server-side verification.

### Advanced Features (Beyond the Prompt)
- **AI Assistant (RAG)**: Gemini-powered Q&A that retrieves real businesses from our database — keyword extraction, category and amenity detection — before generating recommendations
- **Smart Ranking**: Default "Top rated" sort weights rating by review volume (`rating × log10(reviews)`) so credible businesses outrank single-review outliers
- **Economic Impact Dashboard**: Track dollars kept local, businesses supported, jobs impacted, and carbon saved
- **Impact Report Export**: Customizable reports with category filtering, sortable tables, CSV download, and print layout
- **Community Pulse**: Aggregate impact across all users with real-time metrics
- **Impact Leaderboard**: Tiered ranking system (Pulse Newcomer through Economic Hero)
- **Boost Missions**: Challenge-based gamification (e.g., "Try 3 new coffee shops this month")
- **Help System**: Interactive help menu with keyboard shortcuts and onboarding tour

### Accessibility
- Skip-to-content link for keyboard users
- ARIA live regions (polite and assertive) via AccessibilityProvider
- Focus trap management for modals (useFocusTrap hook)
- Enhanced focus-visible outlines on all interactive elements
- Semantic landmarks with aria-labels (nav, main, footer, sections)
- Screen-reader-only content via sr-only / VisuallyHidden
- Respects `prefers-reduced-motion` OS setting (WCAG 2.3.3)
- Dedicated accessibility test suite

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | [Next.js](https://nextjs.org/) 16 | React framework with App Router, SSR, API routes |
| Language | [TypeScript](https://www.typescriptlang.org/) 5 | Type-safe JavaScript for reliability and maintainability |
| Runtime | [React](https://react.dev/) 19 | UI component library |
| Styling | [Tailwind CSS](https://tailwindcss.com/) v4 | Utility-first CSS framework |
| UI Components | [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/) | Accessible, unstyled component primitives |
| Database | [Supabase](https://supabase.com/) (PostgreSQL + PostGIS) | Auth, database, real-time, and storage |
| AI | [Google Gemini API](https://ai.google.dev/) | Business descriptions and AI assistant responses |
| Business Data | [Google Places API](https://developers.google.com/maps/documentation/places/web-service) | Real local business listings and reviews |
| State Management | [TanStack React Query](https://tanstack.com/query) v5 | Server-state caching, deduplication, and sync |
| Charts | [Recharts](https://recharts.org/) 3 | Data visualization for impact reports and dashboards |
| Validation | [Zod](https://zod.dev/) 4 | Schema-based input validation (syntactical and semantic) |
| Bot Prevention | [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) | Invisible CAPTCHA challenge on sensitive actions |
| Rate Limiting | [Upstash Redis](https://upstash.com/) + [@upstash/ratelimit](https://github.com/upstash/ratelimit) | API rate limiting to prevent abuse |
| Icons | [Lucide React](https://lucide.dev/) | Open-source SVG icon set |
| Dates | [date-fns](https://date-fns.org/) | Lightweight date formatting and manipulation |
| Animations | [Framer Motion](https://www.framer.com/motion/) | Declarative React animations |
| Toasts | [Sonner](https://sonner.emilkowal.dev/) | Toast notification system |
| CSS Utilities | [clsx](https://github.com/lukeed/clsx), [tailwind-merge](https://github.com/dcastil/tailwind-merge), [class-variance-authority](https://cva.style/) | Conditional class merging |
| Testing | [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) | Unit and component testing |
| Theming | [next-themes](https://github.com/pacocoursey/next-themes) | Dark/light mode switching |
| Markdown | [react-markdown](https://github.com/remarkjs/react-markdown) + [remark-gfm](https://github.com/remarkjs/remark-gfm) | Render markdown in AI assistant responses |
| Rich Text | [Tiptap](https://tiptap.dev/) | Rich text editor for review content |
| Drag & Drop | [dnd-kit](https://dndkit.com/) | Accessible drag-and-drop interactions |
| Analytics | [Vercel Analytics](https://vercel.com/analytics) | Privacy-friendly usage analytics |

### Why TypeScript + Next.js?

TypeScript was selected for its **static type system**, which catches bugs at compile time rather than runtime — critical for a data-driven application where business records, reviews, and impact metrics flow between client and server. Next.js provides **server-side rendering** for SEO and fast initial loads, **API routes** that eliminate the need for a separate backend server, and the **App Router** for nested layouts and streaming. Together, they represent an industry-standard production stack used by companies like Vercel, Netflix, and TikTok.

## Getting Started

### Prerequisites
- Node.js 18+
- npm
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/pulse.git
cd pulse/web
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Required variables:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
SUPABASE_SECRET_KEY=your_supabase_secret
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_key
TURNSTILE_SECRET_KEY=your_turnstile_secret
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

4. Set up the database:
```bash
npm run db:setup
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server (webpack) |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run db:setup` | Reset, seed, type-gen, and validate database |

## Database Schema

PostgreSQL via Supabase with PostGIS extension for geolocation queries.

| Table | Purpose |
|-------|---------|
| `businesses` | Local business listings with location, contact, hours, ratings |
| `categories` | Business categories (Food & Drink, Retail, Services, etc.) |
| `reviews` | User reviews with ratings, content, and verification status |
| `business_bookmarks` | User-saved/bookmarked businesses |
| `deals` | Special offers and promotions |
| `deal_claims` | User deal redemptions with codes |
| `boost_missions` | Gamification challenges |
| `mission_completions` | User mission progress tracking |
| `business_check_ins` | User visit tracking with spend amounts |
| `user_impact` | Economic impact metrics per user |
| `user_preferences` | AI matching preferences |
| `profiles` | User profile data (name, avatar, admin flag) |

See `web/supabase/pulse_schema.sql` for the complete schema with indexes, RLS policies, and PostGIS functions.

## Project Structure

```
pulse/
├── web/                        # Next.js application
│   ├── app/                    # App Router (pages, layouts, API routes)
│   │   ├── api/                # REST API endpoints
│   │   ├── dashboard/          # Impact dashboard
│   │   ├── discover/           # Business discovery feed
│   │   ├── business/[id]/      # Business detail pages
│   │   ├── deals/              # Deals and coupons
│   │   ├── missions/           # Boost missions
│   │   ├── bookmarks/          # Saved businesses
│   │   ├── leaderboard/        # Community rankings
│   │   ├── assistant/          # AI assistant
│   │   └── theme.css           # Design tokens (single source of truth)
│   ├── components/
│   │   ├── ui/                 # shadcn/Radix primitives
│   │   ├── features/           # Feature-specific components
│   │   ├── layout/             # Header, Footer, Sidebar
│   │   └── providers/          # Auth, Query, Accessibility providers
│   ├── hooks/                  # React Query hooks (useBusinesses, useImpact, etc.)
│   ├── lib/                    # Utilities (validation, Supabase clients, Gemini)
│   ├── types/                  # TypeScript type definitions
│   ├── __tests__/              # Shared test mocks and utilities
│   └── supabase/               # Database schema, migrations, scripts
├── 25-26 Coding and Programming.pdf  # FBLA competition guidelines
└── README.md                   # This file
```

## Key Implementation Details

### Economic Impact Calculation
The platform estimates local economic impact using established economic research:
- **68% multiplier**: For every dollar spent at a local business, approximately 68 cents recirculates locally (vs. 43 cents for non-local chains). The estimate is based on the Local Multiplier research summarized by the American Independent Business Alliance and Civic Economics: <https://amiba.net/local-multiplier/>
- **Jobs estimate**: Roughly 1 job per $15,000 in local spending
- **Carbon savings**: 0.5 lbs CO2 saved per local purchase (reduced shipping/logistics)

### Data Storage & Scope
- **Arrays and lists**: Business listings, reviews, deals, and timeline entries are stored as typed arrays via React Query and rendered from Supabase table queries
- **Variable scope**: React Query hooks encapsulate fetch logic with proper cache keys; component-level state uses `useState` for UI-only concerns (filters, sort order); module-level constants for static data (categories, tiers)
- **Type safety**: All data flows through TypeScript interfaces defined in `web/types/` — no `any` types in production code

### Input Validation Strategy
- **Syntactical**: Zod schemas validate format (email regex, rating 1-5 range, content length 10-2000 chars, UUID format)
- **Semantic**: Server-side checks for duplicates (409), ownership verification, CAPTCHA token validation
- **Sanitization**: HTML stripping on search inputs, prompt injection filtering on AI inputs

## Credits / Third-Party & Open-Source Material

| Service | Usage | License/Terms |
|---------|-------|---------------|
| [Supabase](https://supabase.com/) | Authentication, PostgreSQL database, PostGIS | Apache 2.0 (open-source) |
| [Google Gemini API](https://ai.google.dev/) | AI-generated business descriptions and assistant Q&A | Google AI Terms of Service |
| [Google Places API](https://developers.google.com/maps/documentation/places/web-service) | Real business data (names, addresses, ratings, reviews, photos) | Google Maps Platform Terms |
| [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) | Bot prevention CAPTCHA widget | Cloudflare Terms of Service |
| [Upstash Redis](https://upstash.com/) | Rate limiting on API routes | Upstash Terms of Service |
| [Vercel](https://vercel.com/) | Hosting and deployment | Vercel Terms of Service |
| [American Independent Business Alliance](https://amiba.net/local-multiplier/) + Civic Economics | Local Multiplier source for the 68 cents vs. 43 cents local-spend comparison | Public research summary, cited for educational use |

## Open-Source Libraries

All dependencies are listed in `web/package.json`. Key open-source licenses:

| Library | License |
|---------|---------|
| Next.js, React | MIT |
| Tailwind CSS | MIT |
| Radix UI (all packages) | MIT |
| shadcn/ui | MIT |
| TanStack React Query | MIT |
| Recharts | MIT |
| Zod | MIT |
| Lucide React | ISC |
| date-fns | MIT |
| Framer Motion | MIT |
| Sonner | MIT |
| Vitest | MIT |
| React Testing Library | MIT |

### Copyrighted and Original Material

- **Pulse logo and branding**: Original project artwork.
- **Application screenshots and code screenshots**: Original captures from this repository and local demo app.
- **Canva presentation layout**: Built in Canva from original Pulse text, screenshots, and logo. No Canva stock photos are required for the final deck.
- **Canva presentation font**: Inter, available through Canva's font library.
- **Website fonts**: Local system font stack defined in `web/app/layout.tsx`; no external font fetch is required during the demo.
- **Google Places content**: Business names, addresses, ratings, reviews, and photos come from Google Places or related data providers and remain subject to their original owners and Google Maps Platform Terms.
- **Gemini output**: AI responses are generated from user prompts plus retrieved Pulse business context. Gemini is credited as the AI provider.

## Demo & Presentation Assets

| Item | Location |
|---|---|
| Demo judge account seeder | `web/scripts/seed-demo-user.mjs` (creates `judge@pulse.demo` with bookmarks, reviews, check-ins, deal claims) |
| Screenshot capture script | `web/scripts/capture.js` (Playwright, 1920×1080, walks every required feature) |
| User guide | `USER_GUIDE.md` (feature walkthrough, advanced tools, and demo path) |
| Presentation screenshots | `assets/` (10 code images via charmbracelet freeze + 11 app captures) |
| Speaker script (7 min, 3 presenters) | `SPEAKER_SCRIPT.md` |
| Live demo path + offline fallback | `DEMO_SCRIPT.md` |
| Judge Q&A preparation | `QA_PREP.md` |
| Canva animation guide | `CANVA_ANIMATION_GUIDE.md` |
| Rubric gap audit | `GAPS.md` |

## License

This project was created for the FBLA Coding & Programming 2025-2026 competition.

---

**Pulse** - Strengthening local economies, one discovery at a time.
