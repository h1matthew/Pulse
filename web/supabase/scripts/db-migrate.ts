#!/usr/bin/env tsx
/**
 * Database Migration Script
 * Runs pending migration files from supabase/migrations/ without resetting data.
 * Tracks applied migrations in a _migrations table.
 *
 * Usage: npm run db:migrate
 */

import 'dotenv/config'
import postgres from 'postgres'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('Missing environment variable: DATABASE_URL')
  console.error('\nGet your connection string from: Supabase Dashboard > Settings > Database > Connection string (URI)')
  process.exit(1)
}

const sql = postgres(databaseUrl)

const migrationsDir = join(__dirname, '../migrations')

async function ensureMigrationsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `
}

async function getAppliedMigrations(): Promise<string[]> {
  const rows = await sql<{ name: string }[]>`SELECT name FROM _migrations ORDER BY id`
  return rows.map((r) => r.name)
}

async function getMigrationFiles(): Promise<string[]> {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql') && !f.startsWith('TEMPLATE'))
    .sort()
  return files
}

async function applyMigration(filename: string) {
  const filePath = join(migrationsDir, filename)
  const content = readFileSync(filePath, 'utf-8')

  const cleanedContent = content
    .replace(/VACUUM\s+FULL\s*;/gi, '-- VACUUM FULL (skipped)')

  await sql.unsafe(cleanedContent)
  await sql`INSERT INTO _migrations (name) VALUES (${filename})`
}

async function main() {
  // Check connection
  try {
    await sql`SELECT 1`
  } catch (error: any) {
    console.error('Could not connect to database:', error.message)
    await sql.end()
    process.exit(1)
  }

  try {
    await ensureMigrationsTable()

    const applied = await getAppliedMigrations()
    const files = await getMigrationFiles()
    const pending = files.filter((f) => !applied.includes(f))

    if (pending.length === 0) {
      console.log('No pending migrations.')
      return
    }

    console.log(`Found ${pending.length} pending migration(s):\n`)

    for (const file of pending) {
      process.stdout.write(`  Applying ${file}...`)
      try {
        await applyMigration(file)
        console.log(' done')
      } catch (error: any) {
        console.log(' FAILED')
        console.error(`\n  Error: ${error.message}`)
        process.exit(1)
      }
    }

    console.log(`\nAll migrations applied.`)
  } finally {
    await sql.end()
  }
}

main()
