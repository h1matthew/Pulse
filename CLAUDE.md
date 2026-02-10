# CLAUDE.md

This is **Max Apogee** — an interactive rocket science and aerospace education platform. The app teaches users about rocketry through structured lessons, interactive Remotion visualizations, quizzes, and an AI tutor powered by Google Gemini.

**Access Model:**
- **Open Access**: All lessons and content are freely viewable without an account
- **Progress Tracking**: Sign in to save lesson progress and quiz scores

**Target Platform:**
- **Primary**: Web application (Next.js)

**Tech Stack:**
- **Website**: Next.js, TypeScript, Tailwind CSS, shadcn/ui
- **Backend/Database**: Supabase (Auth, Database)
- **AI**: Google Gemini API (AI tutor for rocket science concepts)
- **Visualizations**: Remotion + @remotion/player (inline animated compositions)
- **Math Rendering**: KaTeX (LaTeX equation typesetting in lessons)

## Commands

**IMPORTANT:** All npm commands must be run from the `web/` directory:

```bash
cd /Users/himatthew/Coding/Rocket-Space/web    # Navigate to web directory first
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
cd /Users/himatthew/Coding/Rocket-Space/web && npm run build
```
The Bash tool does not persist working directory between calls, so you must either:
1. Use `cd /path/to/web && npm ...` for each command
2. Or use absolute paths like `/Users/himatthew/Coding/Rocket-Space/web/node_modules/.bin/vitest`

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
- `providers.mock.tsx` — Test wrapper with QueryClient, Auth, and Achievement providers
- `next.mock.ts` — Next.js Request/Response and headers mocks
- `gemini.mock.ts` — Gemini AI mock with streaming support

### What to Test
- **Utilities/constants**: Validate data structure, uniqueness, required fields
- **Components**: Render output, user interactions, state changes, error states
- **API routes**: Auth checks, input validation, success/error responses, rate limiting
- **Hooks**: State transitions, side effects, cleanup, error handling
- **Providers**: Context values, state management, child rendering
- **Pages**: Rendering, auth redirects, data fetching, user flows
- **Content**: Ensure all lesson IDs have content, quiz questions are valid

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
- **Import aliases**: `@/components`, `@/lib`, `@/types`, `@/remotion`

### File Naming

- Components: `PascalCase.tsx` (e.g., `LessonViewer.tsx`)
- Utilities: `camelCase.ts` (e.g., `formatDate.ts`)
- Pages: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
- API routes: `route.ts`

## Architecture

```
web/
├── app/                    # Next.js App Router
│   ├── theme.css          # SINGLE SOURCE for colors/animations
│   ├── globals.css        # Only imports, no theme values
│   ├── (app)/             # Authenticated app routes (with sidebar)
│   │   ├── admin/         # Admin CMS routes (requires is_admin)
│   │   │   ├── page.tsx           # Dashboard
│   │   │   ├── modules/           # Module management
│   │   │   ├── videos/            # Video composition management
│   │   │   ├── generate/          # AI content generation
│   │   │   ├── versions/          # Version history
│   │   │   └── settings/          # Admin settings
│   │   ├── dashboard/     # User dashboard (progress tracking)
│   │   └── layout.tsx     # App shell with sidebar
│   ├── (public)/          # Public routes (no sidebar)
│   │   └── learn/         # Course browsing routes
│   ├── login/             # Auth pages
│   ├── auth/              # Callback + signout routes
│   └── api/
│       ├── admin/         # Admin API endpoints
│       │   ├── reorder/   # Reorder entities
│       │   ├── generate-content/  # AI content generation
│       │   ├── generate-quiz/     # AI quiz generation
│       │   └── generate-video/    # AI video code generation
│       ├── lessons/progress/  # Mark lessons complete, quiz scores
│       └── gemini/ask/        # AI tutor endpoint
├── components/
│   ├── ui/                # shadcn components
│   ├── features/
│   │   ├── admin/         # Admin CMS components
│   │   │   ├── AdminLayout.tsx    # Admin sidebar
│   │   │   ├── LessonEditor.tsx   # Full lesson editor
│   │   │   ├── ModulesList.tsx    # Sortable modules
│   │   │   ├── LessonsList.tsx    # Sortable lessons
│   │   │   └── ...
│   │   ├── home/          # Homepage interactive components
│   │   └── lesson/        # LessonViewer, ContentBlock, etc.
│   ├── layout/            # Header, Footer, Sidebar, AppShell
│   └── providers/         # QueryProvider, ThemeProvider, etc.
├── hooks/
│   ├── useAdminData.ts    # React Query hooks for admin data
│   └── useDebounce.ts     # Debounce utilities
├── lib/
│   ├── utils.ts           # cn() utility
│   ├── gemini.ts          # Gemini AI functions
│   ├── admin/             # Admin data fetching utilities
│   │   └── index.ts       # getModules, getLessons, etc.
│   ├── constants/
│   │   └── modules.ts     # Course structure
│   ├── content/           # Lesson content files
│   └── supabase/          # client.ts, server.ts, middleware.ts
├── remotion/
│   ├── compositions/      # Remotion compositions
│   ├── components/        # Reusable Remotion components
│   └── registry.ts        # Maps compositionId to components
├── types/
│   ├── course.ts          # Module, Lesson, QuizQuestion, Progress
│   ├── admin.ts           # Admin CMS types
│   ├── database.types.ts  # Supabase generated types
│   └── supabase.ts        # Type helpers
└── supabase/
    ├── schema.sql         # Full database schema
    ├── migrations/        # Database migrations
    └── scripts/           # DB management scripts
```

## Course Structure

6 modules, each with 3-5 lessons + a quiz:

1. **How Rockets Fly** — Thrust, Newton's 3rd law, propulsion basics
2. **Rocket Aerodynamics** — Drag, stability, fin design
3. **Propellants & Engines** — Solid vs liquid fuel, combustion chambers
4. **Orbital Mechanics** — Orbits, gravity turns, delta-v
5. **Building a Simple Model Rocket** — Materials, safety, assembly
6. **Advanced Model Rockets** — Multi-stage, recovery systems, electronics

## Remotion Compositions

Available compositions registered in `web/remotion/registry.ts`:

| ID | Description | Frames/FPS |
|----|-------------|------------|
| `thrust-animation` | Rocket on pad → ignition → liftoff with force arrows | 300/30 |
| `newtons-third-viz` | Action/reaction force arrows | 240/30 |
| `drag-forces-viz` | Rocket with increasing drag arrows | 300/30 |
| `combustion-viz` | Combustion chamber cross-section | 240/30 |
| `orbital-trajectory-viz` | Gravity turn to orbit | 450/30 |
| `rocket-assembly` | Parts fly in and assemble | 360/30 |

All compositions use 1280x720 resolution. Played inline via `@remotion/player`.

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

### Remotion in Next.js
- `VideoBlock` is a client component (`'use client'`) that wraps `@remotion/player`
- Compositions are looked up from the registry by `compositionId` string
- If a composition isn't found, a placeholder with "Animation coming soon" is shown
- All composition components use Remotion's `useCurrentFrame`, `interpolate`, and SVG
- **Equations in compositions** use `SvgEquation` component (KaTeX via `foreignObject` in SVG)

### Lesson Content Model
- Content is defined in `web/lib/content/module-*.ts` files
- Each lesson has `LessonContent[]` blocks: `text`, `heading`, `equation`, `video`, `callout`, `list`
- **Equation blocks use LaTeX notation**, rendered by KaTeX via `EquationBlock` component
  - Example: `{ type: 'equation', content: 'F_{thrust} = \\dot{m} \\times v_{exhaust}' }`
  - Use standard LaTeX: `\\frac{}{}`, `\\sqrt{}`, `\\cdot`, `\\times`, subscripts `_{}`, superscripts `^{}`
- Video blocks reference a `compositionId` that maps to a Remotion composition
- Quiz questions are defined per-lesson with options, correct answer, and explanation

### Database
- Schema in `web/supabase/schema.sql`
- Key tables: `profiles`, `user_lesson_progress`
- Progress tracking: `user_lesson_progress` stores completed status and quiz scores per lesson
- RPC function: `get_course_progress` returns aggregate stats

### Homepage Interactive Components

Located in `web/components/features/home/`:

| Component | Description | Location |
|-----------|-------------|----------|
| `OrbitPlayground.tsx` | Satellite orbit simulation with Earth, zoom/pan controls, trajectory preview, and v/a vectors on hover | Left side of hero |
| `RocketThrust.tsx` | Newton's 3rd law demo - cursor position creates action force, rocket reacts in opposite direction | Right side of hero |
| `GravityDrop.tsx` | Variable gravity demo - drop feather, ball, and rocket on different celestial bodies | Interactive demos section |

#### OrbitPlayground Features
- Dark space background with stars
- Zoom in/out with mouse wheel or buttons (0.3x - 5x)
- Pan view with middle-click or shift+drag
- Earth-like planet with continents and atmosphere
- Click and drag to launch satellites
- Velocity vector preview while dragging
- Predicted trajectory path (dashed line)
- **Hover over satellite**: Shows green velocity vector (v) and red acceleration vector (a) toward Earth

#### RocketThrust Features
- Newton's 3rd law action-reaction demonstration
- **Diagonal vectors**: Cursor position relative to rocket creates diagonal action/reaction vectors
  - Cursor left of rocket → action points diagonally toward cursor, reaction points opposite
  - Cursor right of rocket → action points diagonally toward cursor, reaction points opposite
- Green "Action" vector arrow pointing toward cursor (diagonal)
- Red "Reaction" vector arrow pointing opposite direction (diagonal)
- Arrow lengths scale with cursor distance from rocket
- **Smooth physics**: SPRING_STRENGTH=0.02, DAMPING=0.92 for slower, more visible motion
- Rocket moves in 2D (X and Y) based on reaction force
- Exhaust particle effects when rocket moves

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
```

## Environment Variables

Required in `web/.env`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
GEMINI_API_KEY=
```

## Adding New Content

### Adding a New Lesson
1. Add lesson metadata to the appropriate module in `web/lib/constants/modules.ts`
2. Create lesson content in `web/lib/content/module-*.ts`
3. If the lesson has a video, create a Remotion composition and register it

### Adding a New Remotion Composition
1. Create component in `web/remotion/compositions/`
2. Register in `web/remotion/registry.ts` with dimensions and fps
3. Reference the composition ID in lesson content video blocks

### Adding a New Module
1. Add module definition to `COURSE_MODULES` in `web/lib/constants/modules.ts`
2. Create `web/lib/content/module-N.ts` with lesson content
3. Register lessons in `web/lib/content/index.ts`

## Admin CMS

The admin section (`/admin`) provides a full-featured CMS for managing course content. Access requires `is_admin: true` in the user's profile.

### Admin Routes

| Route | Description |
|-------|-------------|
| `/admin` | Dashboard with stats and quick actions |
| `/admin/modules` | List and drag-to-reorder modules |
| `/admin/modules/new` | Create new module |
| `/admin/modules/[id]` | Edit module, drag-to-reorder lessons |
| `/admin/modules/[id]/lessons/new` | Create new lesson |
| `/admin/modules/[id]/lessons/[lessonId]` | Edit lesson content, quiz questions |
| `/admin/videos` | Manage video compositions |
| `/admin/generate` | AI content generation (Gemini) |
| `/admin/versions` | Content version history |
| `/admin/settings` | AI settings, content defaults, admin user management |

### Admin Components

Located in `web/components/features/admin/`:

| Component | Description |
|-----------|-------------|
| `AdminLayout.tsx` | Sidebar navigation wrapper |
| `LessonEditor.tsx` | Full lesson editor with tabs for content/quiz/settings |
| `ContentBlockEditor.tsx` | Individual content block editor |
| `QuizQuestionEditor.tsx` | Quiz question editor with options |
| `ModuleSettingsForm.tsx` | Module metadata form |
| `ModulesList.tsx` | Drag-and-drop sortable modules list |
| `LessonsList.tsx` | Drag-and-drop sortable lessons list |
| `SortableList.tsx` | Generic sortable list component |
| `SortableItem.tsx` | Drag handle wrapper component |

### Admin Data Layer

`web/lib/admin/index.ts` exports:
- `getModules()`, `getModule()`, `getModuleWithLessons()` - Module queries
- `getLessons()`, `getLesson()`, `getLessonWithContent()` - Lesson queries
- `getContentBlocks()`, `getQuizQuestions()` - Content queries
- `getAdminStats()` - Dashboard statistics
- `isAdmin()`, `getAdminUser()` - Auth checks

### Admin API Routes

Located in `web/app/api/admin/`:

| Endpoint | Description |
|----------|-------------|
| `POST /api/admin/reorder` | Reorder modules, lessons, blocks, or questions |
| `POST /api/admin/generate-content` | AI-generate lesson content |
| `POST /api/admin/generate-quiz` | AI-generate quiz questions |
| `POST /api/admin/generate-video` | AI-generate Remotion code |

### Admin Database Tables

Key tables for CMS (in `web/supabase/schema.sql`):

| Table | Purpose |
|-------|---------|
| `modules` | Course modules with `order_index` |
| `lessons` | Lessons within modules with `order_index` |
| `content_blocks` | Lesson content (text, equations, etc.) with `order_index` |
| `quiz_questions` | Quiz questions with options, `order_index` |
| `video_compositions` | Remotion video metadata |
| `content_versions` | Version history for content changes |

### Drag-and-Drop Reordering

Uses `@dnd-kit` library for drag-and-drop:
- Modules can be reordered on `/admin/modules`
- Lessons can be reordered within a module on `/admin/modules/[id]`
- Content blocks and quiz questions can be reordered in the lesson editor

All reorder operations call `POST /api/admin/reorder` with:
```json
{
  "entityType": "modules" | "lessons" | "content_blocks" | "quiz_questions",
  "items": [{ "id": "uuid", "order_index": 0 }, ...]
}
```

### Caching with React Query

Uses `@tanstack/react-query` for client-side caching:
- `QueryProvider` wraps the app in `web/app/layout.tsx`
- Admin hooks in `web/hooks/useAdminData.ts` for optimistic updates
- Debounced updates in `LessonEditor` to reduce API calls

### Admin Workflows

**Creating a Module:**
1. Go to `/admin/modules` → Click "New Module"
2. Fill in title, slug, description, icon
3. Save → Redirects to module detail page
4. Add lessons from the module detail page

**Creating a Lesson:**
1. Go to `/admin/modules/[id]` → Click "Add Lesson"
2. Fill in lesson metadata
3. Save → Redirects to lesson editor
4. Add content blocks (text, equations, images, videos)
5. Add quiz questions in the Quiz tab
6. Configure settings in the Settings tab

**Using AI Generation:**
1. Go to `/admin/generate`
2. Choose tab: Lesson Content, Quiz Questions, or Video Code
3. Enter prompt describing what you need
4. Review and copy generated content to the appropriate editor

## Notes for AI Assistants

- **App Purpose**: Rocket science education platform with structured courses and visual animations
- **App Name**: Max Apogee
- **Web App Location**: `web/` subdirectory (run all npm commands from there)
- **Access Model**: Open access (no paywall), login only for progress tracking
- **Key Technologies**: Gemini AI, Remotion, Supabase, Next.js, React Query, dnd-kit
- **No Stripe/Payment**: All payment logic has been removed
- **Branding**: Rocket icon (lucide-react), blue primary color, "Max Apogee" text
- **Admin Access**: Users with `profiles.is_admin = true` can access `/admin/*` routes

## Troubleshooting

### Turbopack Cache Issues
If the dev server is slow and you see:
> "Turbopack's filesystem cache has been deleted because we previously detected an internal error in Turbopack"

**Fix:** Clear the Next.js cache:
```bash
rm -rf .next && npm run dev
```

This forces Next.js to rebuild the cache fresh.
