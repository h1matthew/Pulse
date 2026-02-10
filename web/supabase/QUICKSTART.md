# Supabase Database Quick Start Guide

Get your database up and running in 5 minutes!

## Prerequisites

1. **Supabase Project**: Create a free project at [supabase.com](https://supabase.com)
2. **Node.js**: Version 18 or higher
3. **Environment Variables**: Get your Supabase credentials

## Step 1: Get Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to **Settings** > **API Keys**
3. Copy the following values:
   - **Project URL** (from Settings > General)
   - **Publishable** key (starts with `sb_publishable_...`)
   - **Secret** key (starts with `sb_secret_...`) - Keep this secret!

## Step 2: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cd web
   cp .env.example .env.local
   ```

2. Edit `.env` and add your Supabase credentials:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...your-publishable-key
   SUPABASE_SECRET_KEY=sb_secret_...your-secret-key
   ```

## Step 3: Install Dependencies

```bash
cd web
npm install
```

This will install:
- `@supabase/supabase-js` - Supabase client
- `@supabase/ssr` - Server-side rendering support
- `tsx` - TypeScript executor for scripts

## Step 4: Initialize the Database

Run the complete setup (this will create all tables and add sample data):

```bash
npm run db:setup
```

This single command will:
1. ✅ Create all database tables
2. ✅ Set up Row Level Security policies
3. ✅ Create database functions and triggers
4. ✅ Add 17 sample AP Physics questions
5. ✅ Generate TypeScript types
6. ✅ Validate the database structure

Expected output:
```
🔄 Starting database reset...
   ✅ Dropping all tables and data complete
   ✅ Creating database schema complete

🌱 Starting database seeding...
   ✅ Seeding: 01_sample_questions.sql complete
   ✅ Questions: 17

🔨 Generating TypeScript types...
   ✅ TypeScript types generated successfully!

🔍 Validating database schema...
   ✅ All validations passed!
```

## Step 5: Verify Everything Works

You should now have:

### Tables Created:
- ✅ `profiles` - User profiles with payment status
- ✅ `questions` - 17 sample AP Physics questions
- ✅ `user_progress` - Empty (will track user answers)
- ✅ `bookmarks` - Empty (will store saved questions)
- ✅ `study_sessions` - Empty (will track practice sessions)

### Files Generated:
- ✅ `web/types/database.types.ts` - Database types
- ✅ `web/types/supabase.ts` - Helper types

### Verify in Supabase Dashboard:

1. Go to **Table Editor** in your Supabase dashboard
2. You should see all 5 tables
3. Click on **questions** table - you should see 17 rows

## Step 6: Test the Database Connection

Create a test file to verify everything works:

```typescript
// web/test-db.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

async function test() {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .limit(5)

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('✅ Database connection successful!')
    console.log(`Found ${data.length} questions:`)
    data.forEach(q => console.log(`  - ${q.topic}: ${q.question_text.substring(0, 50)}...`))
  }
}

test()
```

Run it:
```bash
npx tsx test-db.ts
```

## Common Commands

### Daily Development

```bash
# Start development server
npm run dev

# Watch for database changes and auto-validate
npm run db:watch
```

### Database Management

```bash
# Reset database (drops all tables and recreates)
npm run db:reset

# Add sample data
npm run db:seed

# Generate TypeScript types
npm run db:types

# Validate database structure
npm run db:validate

# Complete setup (all of the above)
npm run db:setup
```

## What's Next?

Now that your database is set up, you can:

1. **Start Building Features**:
   - Create authentication pages
   - Build question display components
   - Implement AI explanations with Gemini
   - Add Stripe payment integration

2. **Explore the Data**:
   - Check out the sample questions in `web/supabase/seeds/01_sample_questions.sql`
   - Browse the database schema in `web/supabase/schema.sql`

3. **Use Type-Safe Queries**:
   ```typescript
   import { createTypedClient, Question } from '@/types/supabase'

   const supabase = createTypedClient(url, key)
   const { data } = await supabase.from('questions').select('*')
   // data is typed as Question[]
   ```

## Troubleshooting

### "Missing environment variables"
- Make sure you have `.env.local` in the `web/` directory
- Check that all variables are set (no empty values)

### "Permission denied" or "Invalid API key"
- Verify your `SUPABASE_SECRET_KEY` is correct
- Make sure you're using the **secret** key, not the **publishable** key

### "Table already exists"
- Run `npm run db:reset` to drop all tables and start fresh

### "No sample data"
- Run `npm run db:seed` to add sample questions

### Type generation fails
- Install Supabase CLI: `npm install -g supabase`
- Or use: `brew install supabase/tap/supabase`

## Getting Help

- **Documentation**: See `web/supabase/README.md` for detailed info
- **Database Schema**: Check `web/supabase/schema.sql`
- **Type Usage**: See `web/types/README.md`
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)

## Security Notes

⚠️ **Important**: Never commit `.env.local` to git!

The `.gitignore` file already excludes:
- `.env.local` - Your credentials
- `database.types.ts` - Auto-generated (will be different for each project)
- `supabase.ts` - Auto-generated helper types

Your Supabase credentials should remain private and never be shared or committed to version control.

---

**Ready to build?** Start the dev server with `npm run dev` and begin creating your AP Physics 1 study app! 🚀
