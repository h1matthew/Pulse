# Supabase Database Management

This directory contains all database-related files for the AP Physics 1 Study App.

## Directory Structure

```
supabase/
├── schema.sql              # Complete database schema
├── reset.sql               # Script to drop all tables and data
├── seeds/                  # Seed data for testing
│   ├── 01_sample_questions.sql
│   └── 02_sample_users.sql
├── migrations/             # Database migrations (timestamped)
├── scripts/                # Management scripts
│   ├── db-reset.ts        # Reset database
│   ├── db-seed.ts         # Seed with sample data
│   ├── db-types.ts        # Generate TypeScript types
│   └── db-validate.ts     # Validate schema
└── README.md              # This file
```

## Quick Start

### Prerequisites

1. Set up environment variables in `web/.env`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...your-key
SUPABASE_SECRET_KEY=sb_secret_...your-key  # Required for db scripts
```

2. Install Supabase CLI (for type generation):
```bash
npm install -g supabase
# or
brew install supabase/tap/supabase
```

### Database Commands

From the `web/` directory:

```bash
# Reset database (drops all tables and recreates schema)
npm run db:reset

# Seed database with sample data
npm run db:seed

# Validate database structure
npm run db:validate

# Generate TypeScript types from database
npm run db:types

# Complete setup (reset + seed + types + validate)
npm run db:setup
```

## Database Schema Overview

### Tables

1. **profiles** - User profiles (extends auth.users)
   - Stores payment status, questions answered count
   - RLS: Users can only view/update their own profile

2. **questions** - AP Physics 1 exam questions
   - Multiple choice and free response questions
   - Organized by topic, difficulty, year
   - Supports images and videos
   - RLS: Public read access

3. **user_progress** - User answers and performance
   - Tracks all question attempts
   - Records answer correctness and time spent
   - RLS: Users can only view their own progress

4. **bookmarks** - Saved questions for review
   - Optional notes field
   - RLS: Users can only manage their own bookmarks

5. **study_sessions** - Practice session tracking
   - Supports different session types (practice, timed-test, review)
   - Tracks session statistics
   - RLS: Users can only view their own sessions

### Functions

- **get_user_stats(user_uuid)** - Returns comprehensive user statistics
- **handle_new_user()** - Auto-creates profile on signup (trigger)
- **update_updated_at_column()** - Auto-updates timestamps (trigger)

### Views

- **user_topic_performance** - Aggregated performance by topic

### Storage Buckets

- **question-images** - Question diagrams and images
- **physics-videos** - Remotion-generated simulation videos

## Workflow

### Initial Setup

1. **Create the database**:
   ```bash
   npm run db:reset
   ```

2. **Add sample data**:
   ```bash
   npm run db:seed
   ```

3. **Generate types**:
   ```bash
   npm run db:types
   ```

4. **Validate everything**:
   ```bash
   npm run db:validate
   ```

Or run all at once:
```bash
npm run db:setup
```

### During Development

When you modify the schema:

1. Update `schema.sql` with your changes
2. Run `npm run db:reset` to apply changes
3. Run `npm run db:types` to regenerate types
4. Run `npm run db:validate` to ensure everything works

### Creating Migrations

For production deployments, create migration files in `migrations/`:

```bash
# Create a new migration file
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_description.sql
```

Example migration naming:
- `20260122120000_add_video_url_to_questions.sql`
- `20260123150000_create_study_sessions_table.sql`

## Testing

The seed files create sample data for testing:
- 17 sample physics questions (various topics and difficulties)
- Example user progress data (requires test users)
- Sample bookmarks and study sessions

To create test users:
1. Go to Supabase Dashboard > Authentication > Users
2. Create test users manually
3. Get their UUIDs
4. Update `seeds/02_sample_users.sql` with actual UUIDs
5. Run `npm run db:seed` again

## Row Level Security (RLS)

All tables have RLS enabled:

- **profiles**: Users can only access their own profile
- **questions**: Public read access (all authenticated users)
- **user_progress**: Users can only see their own progress
- **bookmarks**: Users can only manage their own bookmarks
- **study_sessions**: Users can only view their own sessions

## TypeScript Types

After running `npm run db:types`, you'll have:

1. `types/database.types.ts` - Generated from Supabase
2. `types/supabase.ts` - Helper types and typed client

Usage:
```typescript
import { createTypedClient, Question, UserProfile } from '@/types/supabase'

const supabase = createTypedClient(url, key)

// Fully typed queries
const { data } = await supabase
  .from('questions')
  .select('*')
  .eq('topic', 'kinematics')
```

## Troubleshooting

### "Missing environment variables"
Make sure you have `SUPABASE_SECRET_KEY` in `.env`

### "Permission denied" errors
Check that your secret key is correct and has admin permissions

### "Table does not exist"
Run `npm run db:reset` to create the schema

### "No sample data"
Run `npm run db:seed` to add sample questions

### Type generation fails
Make sure Supabase CLI is installed: `npm install -g supabase`

## Best Practices

1. **Always validate after changes**: Run `npm run db:validate`
2. **Keep schema.sql updated**: This is the source of truth
3. **Use migrations in production**: Don't run reset.sql in production
4. **Test with seed data**: Ensure features work with sample data
5. **Regenerate types after schema changes**: Keep TypeScript types in sync

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
