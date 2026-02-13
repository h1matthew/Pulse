# CLAUDE.md

This is **Pulse** — a local business discovery platform that shows users how their engagement strengthens their local economy. Every interaction feeds into a live economic impact dashboard visualizing personal and community-wide economic footprints.

**Core Concept:**
- **Discover** local businesses through AI-matched "For You" feed
- **Engage** via reviews, bookmarks, check-ins, and deal claims
- **Impact** tracking shows estimated dollars kept local, businesses supported, jobs impacted
- **Boost Missions** challenge users (e.g., "Try 3 new local coffee shops this month") with unlockable perks

**Access Model:**
- **Open Access**: Browse businesses, categories, and deals without an account
- **Full Experience**: Sign in to leave reviews, bookmark favorites, claim deals, track personal impact

**Target Platform:**
- **Primary**: Web application (Next.js)

**Tech Stack:**
- **Website**: Next.js, TypeScript, Tailwind CSS, shadcn/ui
- **Backend/Database**: Supabase (Auth, Database, PostGIS for location)
- **AI**: Google Gemini API (business recommendations, personalized matching)
- **Data Visualization**: Recharts (impact charts, community pulse meter)
- **Maps**: Mapbox or Google Maps (business location display)

## Commands

**IMPORTANT:** All npm commands must be run from the `web/` directory:

```bash
cd /Users/himatthew/Coding/Pulse/web    # Navigate to web directory first
npm run dev                                      # Dev server at localhost:3000
npm run build                                    # Production build
npm run lint                                     # ESLint
npm test                                         # Run tests (watch mode)
npm run test:run                                 # Run tests (single run)
npx shadcn@latest add <component>                # Add shadcn component
```

**Note:** The project root contains multiple subdirectories. The Next.js app is in `web/`, so all npm/package commands require being in that directory.

**CRITICAL:** When using the Bash tool, always use the full path form:
```bash
cd /Users/himatthew/Coding/Pulse/web && npm run build
```
The Bash tool does not persist working directory between calls, so you must either:
1. Use `cd /path/to/web && npm ...` for each command
2. Or use absolute paths like `/Users/himatthew/Coding/Pulse/web/node_modules/.bin/vitest`

## Testing

**Framework:** Vitest + React Testing Library

**Rule:** After adding or modifying any feature, write test cases for it and verify they pass with `npm run test:run`.

### Testing Requirements

**Every change MUST include tests:**
- New components → Component tests (render, interactions, states)
- New hooks → Hook tests (state changes, side effects)
- New API routes → Route tests (auth, validation, responses)
- New utilities → Unit tests (edge cases, error handling)
- Bug fixes → Regression tests (prevent recurrence)

Run `npm run test:run` before committing to ensure all tests pass.

### Test File Location
- Co-located `__tests__/` directories next to source files
- Naming: `ComponentName.test.tsx` or `utilName.test.ts`

### Shared Mock Infrastructure

Reusable mocks are in `web/__tests__/mocks/`:
- `supabase.mock.ts` — Chainable Supabase client mock with auth helpers
- `providers.mock.tsx` — Test wrapper with QueryClient and Auth providers
- `next.mock.ts` — Next.js Request/Response and headers mocks

### What to Test
- **Utilities/constants**: Validate data structure, uniqueness, required fields
- **Components**: Render output, user interactions, state changes, error states
- **API routes**: Auth checks, input validation, success/error responses, rate limiting
- **Hooks**: State transitions, side effects, cleanup, error handling
- **Providers**: Context values, state management, child rendering
- **Pages**: Rendering, auth redirects, data fetching, user flows

### Testing Patterns

**Server Component pages** (async functions returning JSX):
```typescript
const Page = (await import('../page')).default
const Component = await Page()
render(Component)
```

**API routes** with Next.js mocks:
```typescript
import { createMockRequest } from '@/__tests__/mocks/next.mock'
const req = createMockRequest({ method: 'POST', body: { ... } })
const res = await POST(req)
expect(res.status).toBe(200)
```

**Components with providers**:
```typescript
import { createTestWrapper } from '@/__tests__/mocks/providers.mock'
render(<MyComponent />, { wrapper: createTestWrapper() })
```

### Example
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

## Code Style

- **TypeScript only** — no `.js` files
- **Named exports** for components: `export function Button() {}` not `export default`
- **Interfaces over types** for props: `interface ButtonProps {}` not `type ButtonProps =`
- **Server Components by default** — only add `"use client"` when needed (hooks, events, browser APIs)
- **Functional components** with hooks, no class components
- **`cn()` for conditional classes**: `cn("base", condition && "active")`
- **Import aliases**: `@/components`, `@/lib`, `@/types`

### File Naming

- Components: `PascalCase.tsx` (e.g., `BusinessCard.tsx`)
- Utilities: `camelCase.ts` (e.g., `formatCurrency.ts`)
- Pages: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
- API routes: `route.ts`

## Architecture

```
web/
├── app/                    # Next.js App Router
│   ├── theme.css          # SINGLE SOURCE for colors/animations
│   ├── globals.css        # Only imports, no theme values
│   ├── page.tsx           # Homepage
│   ├── layout.tsx         # Root layout with providers
│   ├── dashboard/         # Economic impact dashboard
│   ├── discover/          # Business discovery feed
│   ├── categories/        # Browse by category
│   ├── business/          # Individual business pages
│   │   └── [id]/          # Business detail page
│   ├── deals/             # Deals and coupons
│   ├── missions/          # Boost missions
│   ├── bookmarks/         # User's saved businesses
│   ├── reviews/           # Review management
│   ├── login/             # Auth pages
│   ├── auth/              # Callback + signout routes
│   └── api/               # API routes
│       ├── businesses/    # Business CRUD
│       ├── reviews/       # Review endpoints
│       ├── bookmarks/     # Bookmark endpoints
│       ├── deals/         # Deal endpoints
│       ├── missions/      # Mission endpoints
│       └── impact/        # Impact calculation
├── components/
│   ├── ui/                # shadcn components
│   ├── features/
│   │   ├── dashboard/     # Impact dashboard components
│   │   │   ├── ImpactChart.tsx
│   │   │   ├── CommunityPulse.tsx
│   │   │   └── MissionCard.tsx
│   │   ├── discover/      # Discovery feed components
│   │   │   ├── BusinessCard.tsx
│   │   │   ├── BusinessGrid.tsx
│   │   │   └── FilterBar.tsx
│   │   ├── business/      # Business detail components
│   │   │   ├── BusinessHeader.tsx
│   │   │   ├── ReviewSection.tsx
│   │   │   └── DealList.tsx
│   │   └── missions/      # Mission components
│   ├── layout/            # Header, Footer, Navigation
│   └── providers/         # QueryProvider, AuthProvider, etc.
├── hooks/
│   ├── useBusinesses.ts   # React Query hooks for business data
│   ├── useImpact.ts       # Impact data hooks
│   └── useLocation.ts     # Geolocation hooks
├── lib/
│   ├── utils.ts           # cn() utility
│   ├── constants/
│   │   └── navigation.ts  # Navigation items
│   ├── supabase/          # client.ts, server.ts, middleware.ts
│   └── gemini.ts          # Gemini AI functions
├── types/
│   ├── business.ts        # Business, Category, Review types
│   ├── impact.ts          # Impact metrics types
│   ├── database.types.ts  # Supabase generated types
│   └── supabase.ts        # Type helpers
└── supabase/
    ├── pulse_schema.sql   # Full database schema
    ├── migrations/        # Database migrations
    └── scripts/           # DB management scripts
```

## Database Schema

Key tables in `web/supabase/pulse_schema.sql`:

| Table | Purpose |
|-------|---------|
| `categories` | Business categories (Food & Drink, Retail, Services, etc.) |
| `businesses` | Local business listings with location, contact, hours, ratings |
| `reviews` | User reviews with ratings and verification status |
| `business_bookmarks` | User saved/bookmarked businesses |
| `deals` | Special offers and promotions |
| `deal_claims` | User deal redemptions |
| `boost_missions` | Gamification challenges |
| `mission_completions` | User mission progress |
| `business_check_ins` | User visit tracking |
| `user_impact` | Economic impact metrics per user |
| `user_preferences` | AI matching preferences |

## Core Features

### 1. Business Discovery
- **For You Feed**: AI-matched recommendations based on preferences and history
- **Category Browse**: Filter by Food & Drink, Retail, Services, etc.
- **Sorting**: By rating, distance, review count, "hype" (recent activity)
- **Search**: Full-text search with location filtering

### 2. Reviews & Ratings
- Star ratings (1-5) with written reviews
- Photo uploads
- Verified purchase/check-in badge
- Sort by newest, highest rated, most helpful
- Bot prevention via CAPTCHA + rate limiting

### 3. Bookmarks
- Save favorite businesses
- Organize into lists
- Get notified of new deals from bookmarked businesses

### 4. Deals ("Boost Missions")
- **Standard Deals**: Traditional coupons/discounts
- **Mission Challenges**: "Try 3 new coffee shops this month"
- **Progress Tracking**: Visual progress bars for missions
- **Rewards**: Unlockable perks for completion

### 5. Economic Impact Dashboard
- **Personal Impact**:
  - Estimated dollars kept local
  - Businesses supported count
  - Jobs impacted estimate
  - Carbon footprint reduction
- **Community Pulse**: Aggregate impact across all users
- **Visualizations**: Charts, graphs, trend lines

### 6. AI Recommendation Engine
- Learns from ratings, bookmarks, and check-ins
- "This or That" preference prompts (cozy vs trendy, quick vs sit-down)
- Weighted scoring algorithm for recommendations

## Gotchas

### Supabase Auth
- Uses **new API keys** (`sb_publishable_...`, `sb_secret_...`), not legacy `anon`/`service_role`
- `proxy.ts` must be at `web/` root — Next.js 16 naming convention
- Use `createClient` from `@/lib/supabase/server` in Server Components
- Use `createClient` from `@/lib/supabase/client` in Client Components

### Theme System
- **Always read `web/app/theme.css` before UI work** — all colors, radii, animations defined there
- Use semantic tokens (`primary`, `muted-foreground`, `chart-2`) — never hardcode colors
- Colors use oklch format, primary is blue (hue 250)
- Available animations: `animate-fade-in`, `animate-fade-in-up`, `animate-scale-in`, `animate-float`, `animate-glow`

### Location/Maps
- Store coordinates as `latitude`/`longitude` in database
- Use PostGIS for geo-queries (nearby businesses)
- Handle geolocation permission gracefully
- Fallback to zip code/city search

### Image Handling
- Business photos stored in Supabase Storage
- Use Next.js Image component with proper sizing
- Fallback placeholder for missing images

### Common Patterns
```tsx
// Frosted glass header
<header className="bg-background/80 backdrop-blur-md border-b">

// Card with hover lift
<div className="hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/20">

// Gradient text
<span className="bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">

// Button with glow
<Button className="shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30">

// Impact metric display
<div className="flex items-center gap-2 text-success">
  <TrendingUp className="w-4 h-4" />
  <span className="font-semibold">$1,240 kept local</span>
</div>
```

## Environment Variables

Required in `web/.env`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
GEMINI_API_KEY=
NEXT_PUBLIC_MAPBOX_TOKEN=          # For maps (optional)
```

## Navigation Structure

Main navigation items (from `web/lib/constants/navigation.ts`):
- **Discover** — AI-matched business feed
- **Categories** — Browse by category
- **Deals** — Active deals and coupons
- **Missions** — Boost missions and challenges
- **Dashboard** — Personal impact tracking
- **Bookmarks** — Saved businesses (auth required)

## Pages/Routes

| Route | Description | Auth Required |
|-------|-------------|---------------|
| `/` | Homepage with featured businesses | No |
| `/discover` | AI-matched business feed | No |
| `/categories` | Browse by category | No |
| `/categories/[slug]` | Businesses in category | No |
| `/business/[id]` | Business detail page | No |
| `/deals` | Active deals | No |
| `/missions` | Boost missions | No |
| `/dashboard` | Personal impact dashboard | Yes |
| `/bookmarks` | Saved businesses | Yes |
| `/reviews` | Manage your reviews | Yes |

## Notes for AI Assistants

- **App Purpose**: Local business discovery with economic impact tracking
- **App Name**: Pulse
- **Web App Location**: `web/` subdirectory (run all npm commands from there)
- **Access Model**: Open access for browsing, auth required for engagement
- **Key Technologies**: Supabase, Next.js, Google Gemini, Recharts, Tailwind
- **No Stripe/Payment**: All deals are free claims, no payment processing
- **Branding**: Pulse/heartbeat icon (lucide-react), blue primary color
- **Bot Prevention**: CAPTCHA on reviews, rate limiting on check-ins

## Troubleshooting

### Turbopack Cache Issues
If the dev server is slow and you see:
> "Turbopack's filesystem cache has been deleted because we previously detected an internal error in Turbopack"

**Fix:** Clear the Next.js cache:
```bash
rm -rf .next && npm run dev
```

This forces Next.js to rebuild the cache fresh.

### Routing Conflicts
If you see "You cannot have two parallel pages that resolve to the same path":
- Check for duplicate page files in different route groups
- Ensure only one `page.tsx` exists per route segment
- Remove any leftover `(app)` or `(public)` route groups if they conflict
