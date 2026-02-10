#!/usr/bin/env tsx
/**
 * Database Reset Script
 * Resets the Supabase database to a clean state and recreates schema
 *
 * Usage: npm run db:reset
 */

import 'dotenv/config'
import postgres from 'postgres'
import { readFileSync } from 'fs'
import { join } from 'path'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('❌ Missing environment variable: DATABASE_URL')
  console.error('\nGet your connection string from: Supabase Dashboard > Settings > Database > Connection string (URI)')
  console.error('Add it to .env as: DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[ref].supabase.co:5432/postgres')
  process.exit(1)
}

const sql = postgres(databaseUrl)

async function runSqlFile(filePath: string, description: string) {
  console.log(`\n📝 ${description}...`)

  try {
    const content = readFileSync(filePath, 'utf-8')

    // Remove VACUUM FULL as it can't run in a transaction and isn't needed here
    const cleanedContent = content
      .replace(/VACUUM\s+FULL\s*;/gi, '-- VACUUM FULL (skipped in script)')

    await sql.unsafe(cleanedContent)
    console.log(`   ✅ ${description} complete`)
  } catch (error: any) {
    console.error(`   ❌ Error in ${description}:`, error.message)
    throw error
  }
}

async function resetDatabase() {
  console.log('🔄 Starting database reset...\n')
  console.log('⚠️  WARNING: This will delete ALL data in your database!')
  console.log('   This operation cannot be undone.\n')

  try {
    // Step 1: Reset (drop all tables)
    await runSqlFile(
      join(__dirname, '../reset.sql'),
      'Dropping all tables and data'
    )

    // Step 2: Create schema
    await runSqlFile(
      join(__dirname, '../schema.sql'),
      'Creating database schema'
    )

    console.log('\n✅ Database reset complete!')
    console.log('\n📊 Next steps:')
    console.log('   1. Run `npm run db:seed` to add sample data')
    console.log('   2. Run `npm run db:types` to generate TypeScript types')

  } catch (error) {
    console.error('\n❌ Database reset failed:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

async function checkConnection() {
  try {
    await sql`SELECT 1`
    return true
  } catch (error: any) {
    console.error('\n❌ Could not connect to database')
    console.error(`   Error: ${error.message}`)
    console.error('\n💡 Check your DATABASE_URL in .env')
    console.error('   Get it from: Supabase Dashboard > Settings > Database > Connection string')
    return false
  }
}

async function main() {
  const canConnect = await checkConnection()
  if (!canConnect) {
    await sql.end()
    process.exit(1)
  }

  await resetDatabase()
}

main()
