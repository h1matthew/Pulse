#!/usr/bin/env tsx
/**
 * Database Seed Script
 * Seeds the database with sample questions and test data
 *
 * Usage: npm run db:seed
 */

import 'dotenv/config'
import postgres from 'postgres'
import { readFileSync, readdirSync } from 'fs'
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
    await sql.unsafe(content)
    console.log(`   ✅ ${description} complete`)
  } catch (error: any) {
    console.error(`   ❌ Error in ${description}:`, error.message)
    throw error
  }
}

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n')

  try {
    const seedsDir = join(__dirname, '../seeds')
    const seedFiles = readdirSync(seedsDir)
      .filter(file => file.endsWith('.sql'))
      .sort() // This ensures files run in order (01_, 02_, etc.)

    if (seedFiles.length === 0) {
      console.log('⚠️  No seed files found in supabase/seeds/')
      return
    }

    console.log(`Found ${seedFiles.length} seed file(s):\n`)

    for (const file of seedFiles) {
      await runSqlFile(
        join(seedsDir, file),
        `Seeding: ${file}`
      )
    }

    console.log('\n✅ Database seeding complete!')
    console.log('\n📝 Next steps:')
    console.log('   Run `npm run db:validate` to verify schema')
    console.log('   Run `npm run db:types` to generate TypeScript types')

  } catch (error) {
    console.error('\n❌ Database seeding failed:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

async function main() {
  await seedDatabase()
}

main()
