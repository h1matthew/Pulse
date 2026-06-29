# Pulse Supabase Database

This directory contains the database schema, migrations, seed data, and scripts for Pulse, the FBLA Coding & Programming local business discovery app.

## What Supabase Stores

Pulse uses Supabase PostgreSQL with PostGIS for local business data and location-aware queries.

| Table | Purpose |
|---|---|
| `profiles` | User profile data, avatar, admin flag, and account metadata |
| `categories` | Business categories such as Food & Drink, Retail, Services, and Entertainment |
| `businesses` | Local business listings, contact details, ratings, hours, and latitude/longitude |
| `reviews` | User reviews with ratings, text, verification status, and helpful counts |
| `business_bookmarks` | Saved businesses for signed-in users |
| `deals` | Coupons, flash deals, and Boost Mission rewards |
| `deal_claims` | User deal claims and redemption codes |
| `boost_missions` | Challenge definitions, targets, rewards, and deadlines |
| `mission_completions` | User progress and completion records for missions |
| `business_check_ins` | Visit tracking and spend amounts for impact calculations |
| `user_impact` | Dollars kept local, businesses supported, jobs impacted, and carbon savings |
| `user_preferences` | Preferences used by recommendations and the AI assistant |

## Schema Files

| File | Use |
|---|---|
| `schema.sql` | Current schema used by the local reset script |
| `pulse_schema.sql` | Pulse-specific schema reference |
| `pulse_complete_schema.sql` | Self-contained Pulse schema reference |
| `migrations/` | Timestamped incremental schema changes |
| `seeds/` | Seed data for categories, businesses, deals, missions, and demo content |
| `scripts/` | Database reset, seed, migration, validation, type generation, and import tools |

## Environment

Run database commands from `web/`.

Required variables in `web/.env`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[ref].supabase.co:5432/postgres
SUPABASE_ACCESS_TOKEN=your_access_token # only needed for type generation
```

## Commands

```bash
cd /Users/brady/Code/Pulse/web

npm run db:reset           # Drop and recreate the local schema
npm run db:seed            # Load seed data
npm run db:seed-businesses # Import seeded real-world business coverage
npm run db:migrate         # Apply pending migrations
npm run db:types           # Generate TypeScript database types
npm run db:validate        # Validate expected tables/functions
npm run db:setup           # Reset, seed, type-gen, and validate
```

## Feature Data Flow

- Discover and Categories read from `businesses` and `categories`, with PostGIS coordinates used for distance-aware queries.
- Reviews write to `reviews` after rating/content validation and bot checks.
- Bookmarks write to `business_bookmarks` for signed-in users and fall back to local storage for signed-out users.
- Deals and coupons read from `deals`; claims write to `deal_claims`.
- Boost Missions read from `boost_missions`; progress writes to `mission_completions` and check-in activity.
- Dashboard and reports aggregate `business_check_ins`, `deal_claims`, reviews, bookmarks, and `user_impact`.
- The Gemini assistant retrieves business and impact context from Supabase before generating an answer.

## Security and Reliability

- Row Level Security policies restrict user-owned rows such as bookmarks, claims, preferences, reviews, and impact data.
- Server routes use the Supabase secret key only on the server.
- User-facing writes are validated by route handlers before database inserts or updates.
- Review submission uses bot prevention and rate-limiting safeguards.
- Migrations are kept in `migrations/` so production changes can be reviewed before deployment.

## Validation Checklist

Before presenting or submitting the project:

1. Run `npm run db:validate` from `web/`.
2. Confirm the app can load businesses, categories, deals, missions, and dashboard impact data.
3. Confirm review, bookmark, deal claim, and check-in flows fail gracefully when signed out.
4. Regenerate database types with `npm run db:types` after schema changes.
5. Keep this README aligned with the actual Pulse schema so program documentation remains error-free.
