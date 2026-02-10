# Max Apogee - Project Context

## Project Overview
**Max Apogee** is an interactive rocket science and aerospace education platform. It teaches users about rocketry through structured lessons, interactive [Remotion](https://www.remotion.dev/) visualizations, quizzes, and an AI tutor powered by Google Gemini.

### Key Features
- **Structured Learning**: 6 modules covering everything from basic thrust to advanced orbital mechanics.
- **Interactive Visualizations**: High-quality animations created with Remotion (React-based video) to explain complex physics concepts (e.g., Newton's laws, orbits).
- **AI Tutor**: Integrated Gemini AI for personalized assistance and explanation.
- **Progress Tracking**: Users can sign in to save lesson progress and quiz scores.
- **Admin CMS**: A full-featured admin interface for managing modules, lessons, and content.

## Technical Stack
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript.
- **Styling**: Tailwind CSS v4, shadcn/ui, `oklch` color spaces.
- **Backend & Database**: Supabase (Auth, PostgreSQL Database).
- **State Management**: TanStack Query (React Query) for server state.
- **Animation/Video**: Remotion (for programmatic video generation).
- **Math Rendering**: KaTeX.
- **Testing**: Vitest + React Testing Library.

## Directory Structure
The main application code resides in the `web/` directory.

```
web/
├── app/                    # Next.js App Router (Pages & API)
│   ├── (app)/             # Authenticated routes (Dashboard, Admin)
│   ├── (public)/          # Public routes (Landing, Course Browser)
│   ├── api/               # API Routes (Admin actions, Gemini proxy)
│   └── theme.css          # Central theme definition (colors, animations)
├── components/
│   ├── features/          # Domain-specific components (Admin, Lessons, Home)
│   ├── ui/                # Reusable UI components (shadcn/ui)
│   └── layout/            # Layout components (Header, Sidebar)
├── lib/
│   ├── content/           # Static content definitions (Modules, Lessons)
│   ├── supabase/          # Supabase client/server utilities
│   └── remotion/          # Remotion-specific helpers
├── remotion/               # Remotion Video Project
│   ├── compositions/      # Video composition definitions
│   └── registry.ts        # Composition registry
├── supabase/               # Database management
│   ├── schema.sql         # Database schema
│   └── scripts/           # Maintenance scripts
└── types/                  # TypeScript definitions
```

## Development Workflow

### ⚠️ Critical Working Directory
**All development commands must be run from the `web/` directory.**
The root directory mainly contains project meta-files.

### Key Commands
Run these inside `web/`:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start the development server at `http://localhost:3000`. |
| `npm run build` | Build the application for production. |
| `npm run lint` | Run ESLint. |
| `npm test` | Run tests in watch mode. |
| `npm run test:run` | Run tests once (CI mode). |
| `npm run db:types` | Generate TypeScript types from Supabase schema. |

### Database Management
Database scripts are located in `web/supabase/scripts/` and run via `npm run db:*`.
- **Schema**: Defined in `web/supabase/schema.sql`.
- **Migrations**: Managed via Supabase CLI (local) or direct schema application.

## Development Conventions

### Code Style
- **TypeScript**: Strict mode enabled. No `.js` files.
- **Components**: Functional components only. Use named exports (e.g., `export function MyComponent`).
- **Imports**: Use absolute imports with `@/` alias (e.g., `import { Button } from "@/components/ui/button"`).
- **Styling**: Use Tailwind CSS utility classes. Use `cn()` for conditional class merging.
- **Theme**: Do not hardcode colors. Use semantic CSS variables defined in `theme.css` (e.g., `bg-primary`, `text-muted-foreground`).

### Testing Strategy
- **Framework**: Vitest.
- **Location**: Test files are co-located with source files in `__tests__` directories.
- **Requirement**: Write tests for new features/components. Run `npm run test:run` to verify.

### Content Management
- **Lesson Content**: Currently defined in TypeScript files under `web/lib/content/`.
- **Equations**: Use LaTeX format wrapped in equation blocks. Rendered via KaTeX.
- **Videos**: Defined as Remotion compositions in `web/remotion/compositions/`. Referenced by ID in lesson content.

## Environment Variables
Create a `.env` file in `web/` with the following:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...
GEMINI_API_KEY=...
```
