#!/usr/bin/env tsx
/**
 * Database Type Generation Script
 * Generates TypeScript types from the Supabase database schema
 *
 * Usage: npm run db:types
 */

import 'dotenv/config'
import { execSync } from 'child_process'
import { writeFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAccessToken = process.env.SUPABASE_ACCESS_TOKEN

if (!supabaseUrl) {
  console.error('❌ Missing environment variable: NEXT_PUBLIC_SUPABASE_URL')
  process.exit(1)
}

if (!supabaseAccessToken) {
  console.error('❌ Missing environment variable: SUPABASE_ACCESS_TOKEN')
  console.error('\n📝 To generate types, you need a Supabase Access Token:')
  console.error('   1. Go to: https://supabase.com/dashboard/account/tokens')
  console.error('   2. Click "Generate New Token"')
  console.error('   3. Add it to your .env file as: SUPABASE_ACCESS_TOKEN=sbp_...')
  console.error('\n💡 This is different from SUPABASE_SECRET_KEY (API key)')
  process.exit(1)
}

async function generateTypes() {
  console.log('🔨 Generating TypeScript types from database...\n')

  try {
    // Check if we can run supabase CLI (via npx)
    try {
      execSync('npx supabase --version', { stdio: 'ignore' })
    } catch {
      console.error('❌ Could not run Supabase CLI!')
      console.error('\n📦 Make sure you have npm/npx installed')
      console.error('   The Supabase CLI will be downloaded automatically via npx')
      process.exit(1)
    }

    // Extract project ref from URL
    const projectRef = supabaseUrl!.match(/https:\/\/([^.]+)/)?.[1]

    if (!projectRef) {
      console.error('❌ Could not extract project ref from SUPABASE_URL')
      process.exit(1)
    }

    console.log(`📡 Connecting to project: ${projectRef}`)

    // Generate types using Supabase CLI
    const command = `npx supabase gen types typescript --project-id ${projectRef} > ${join(__dirname, '../../types/database.types.ts')}`

    console.log('⚙️  Running: supabase gen types typescript...\n')

    execSync(command, {
      env: {
        ...process.env,
        SUPABASE_ACCESS_TOKEN: supabaseAccessToken
      },
      stdio: 'inherit'
    })

    console.log('\n✅ TypeScript types generated successfully!')
    console.log(`   Location: web/types/database.types.ts`)

    // Create a helper file with typed Supabase client
    const helperContent = `// Auto-generated Supabase client with types
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from './database.types'

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Typed Supabase client
export const createTypedClient = (url: string, key: string) => {
  return createSupabaseClient<Database>(url, key)
}

// Export common types
export type Question = Tables<'questions'>
export type UserProfile = Tables<'profiles'>
export type UserProgress = Tables<'user_progress'>
export type Bookmark = Tables<'bookmarks'>
export type StudySession = Tables<'study_sessions'>
`

    writeFileSync(
      join(__dirname, '../../types/supabase.ts'),
      helperContent,
      'utf-8'
    )

    console.log('   Helper types: web/types/supabase.ts')

    console.log('\n📚 Usage example:')
    console.log('   import { createTypedClient, Question } from "@/types/supabase"')

  } catch (error: any) {
    console.error('\n❌ Type generation failed:', error.message)
    process.exit(1)
  }
}

generateTypes()
