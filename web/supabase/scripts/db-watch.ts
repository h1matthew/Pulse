#!/usr/bin/env tsx
/**
 * Database Watch Script
 * Watches for changes to schema files and automatically validates/regenerates types
 *
 * Usage: npm run db:watch
 */

import { watch } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

const WATCH_PATHS = [
  join(__dirname, '../schema.sql'),
  join(__dirname, '../migrations'),
  join(__dirname, '../seeds')
]

console.log('👀 Watching database files for changes...\n')
console.log('Watching:')
WATCH_PATHS.forEach(path => console.log(`   - ${path}`))
console.log('\nPress Ctrl+C to stop\n')

let isProcessing = false
let shouldRerun = false

async function processChange(filename: string) {
  if (isProcessing) {
    shouldRerun = true
    return
  }

  isProcessing = true
  console.log(`\n📝 Detected change: ${filename}`)
  console.log('⚙️  Running validation and type generation...\n')

  try {
    // Validate schema
    console.log('1/2 Validating schema...')
    execSync('npm run db:validate', { stdio: 'inherit' })

    // Regenerate types
    console.log('\n2/2 Generating types...')
    execSync('npm run db:types', { stdio: 'inherit' })

    console.log('\n✅ Update complete!')
    console.log('👀 Watching for changes...\n')

  } catch (error) {
    console.error('\n❌ Error during update:', error)
  } finally {
    isProcessing = false

    if (shouldRerun) {
      shouldRerun = false
      console.log('🔄 Re-running due to additional changes...')
      processChange(filename)
    }
  }
}

// Watch schema.sql
watch(join(__dirname, '../schema.sql'), (eventType, filename) => {
  if (filename) {
    processChange(filename)
  }
})

// Watch migrations directory
watch(join(__dirname, '../migrations'), { recursive: true }, (eventType, filename) => {
  if (filename && filename.endsWith('.sql')) {
    processChange(filename)
  }
})

// Watch seeds directory
watch(join(__dirname, '../seeds'), { recursive: true }, (eventType, filename) => {
  if (filename && filename.endsWith('.sql')) {
    processChange(filename)
  }
})

// Keep the process running
process.on('SIGINT', () => {
  console.log('\n\n👋 Stopped watching')
  process.exit(0)
})
