# Pulse Supabase Quickstart

Use this guide to prepare the Pulse database for local development or a demo run.

## 1. Create A Supabase Project

Create a project at Supabase and copy these values into `web/.env`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[ref].supabase.co:5432/postgres
```

`SUPABASE_ACCESS_TOKEN` is only required when generating fresh TypeScript types from a hosted project.

## 2. Install Dependencies

From the web app folder:

```bash
cd /Users/brady/Code/Pulse/web
npm install
```

## 3. Build The Database

```bash
npm run db:setup
```

That command resets the schema, loads seed data, regenerates types when configured, and validates the expected tables.

If you want each step separately:

```bash
npm run db:reset
npm run db:seed
npm run db:types
npm run db:validate
```

## 4. Optional Seed Tools

```bash
npm run db:seed-businesses
npx tsx supabase/scripts/seed-deals.ts
npx tsx supabase/scripts/import-sba-csv.ts path/to/sba-results.csv
npx tsx supabase/scripts/import-scraper-csv.ts path/to/results.csv
```

These scripts help populate real local businesses, deals, and imported business datasets.

## 5. Start The App

```bash
npm run dev
```

Open `http://localhost:3000`.

## Demo Data To Check

After setup, verify that these Pulse surfaces load:

- Discover and Categories show businesses from `businesses`.
- Business detail pages show reviews, deals, and check-in actions.
- Deals shows available offers and claimed status.
- Missions shows active Boost Missions and progress.
- Dashboard shows impact totals and report data.
- Assistant can retrieve business or impact context before answering.

## Troubleshooting

| Issue | Check |
|---|---|
| Missing env vars | Confirm `web/.env` contains Supabase URL, publishable key, secret key, and database URL |
| Tables missing | Run `npm run db:reset` |
| Empty app screens | Run `npm run db:seed` and check Supabase credentials |
| Type errors after schema edits | Run `npm run db:types` |
| Validation failures | Run `npm run db:validate` and compare against `supabase/schema.sql` |

Keep this quickstart Pulse-specific. Do not add unrelated sample app tables or setup steps.
