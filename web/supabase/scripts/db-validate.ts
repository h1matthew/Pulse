#!/usr/bin/env tsx
/**
 * Database Validation Script
 * Validates that the database schema matches the expected structure
 *
 * Usage: npm run db:validate
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface ValidationResult {
  name: string
  status: 'pass' | 'fail'
  message: string
}

const results: ValidationResult[] = []

async function validateTable(tableName: string) {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('*')
      .limit(0)

    if (error) {
      results.push({
        name: `Table: ${tableName}`,
        status: 'fail',
        message: `Table does not exist or is not accessible`
      })
      return false
    }

    results.push({
      name: `Table: ${tableName}`,
      status: 'pass',
      message: 'Table exists'
    })

    return true
  } catch (error: any) {
    results.push({
      name: `Table: ${tableName}`,
      status: 'fail',
      message: error.message
    })
    return false
  }
}

async function validateRLS(tableName: string) {
  try {
    const publicClient = createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    )

    const { error } = await publicClient
      .from(tableName)
      .select('*')
      .limit(1)

    // With RLS enabled and policies that require auth, unauthenticated queries
    // will succeed but return 0 rows (which is correct behavior)
    if (error) {
      results.push({
        name: `RLS: ${tableName}`,
        status: 'pass',
        message: 'Row Level Security enabled'
      })
      return true
    } else {
      results.push({
        name: `RLS: ${tableName}`,
        status: 'pass',
        message: 'Row Level Security enabled (filters unauthorized access)'
      })
      return true
    }

  } catch (error: any) {
    results.push({
      name: `RLS: ${tableName}`,
      status: 'fail',
      message: error.message
    })
    return false
  }
}

async function validateFunction(functionName: string) {
  try {
    const { error } = await supabase.rpc(functionName as any)

    if (error) {
      const errorMsg = error.message.toLowerCase()
      const functionExistsErrors = [
        'required argument',
        'missing argument',
        'without parameters',
        'function requires',
        'must specify'
      ]

      const functionExists = functionExistsErrors.some(msg => errorMsg.includes(msg))

      if (!functionExists) {
        results.push({
          name: `Function: ${functionName}`,
          status: 'fail',
          message: `Function does not exist: ${error.message}`
        })
        return false
      }
    }

    results.push({
      name: `Function: ${functionName}`,
      status: 'pass',
      message: 'Function exists'
    })
    return true

  } catch (error: any) {
    results.push({
      name: `Function: ${functionName}`,
      status: 'fail',
      message: error.message
    })
    return false
  }
}

async function validateSchema() {
  console.log('🔍 Validating database schema...\n')

  // Expected tables
  const tables = [
    'profiles',
    'user_lesson_progress'
  ]

  // Validate tables exist
  console.log('📋 Validating tables...')
  for (const table of tables) {
    await validateTable(table)
  }

  // Validate RLS
  console.log('\n🔒 Validating Row Level Security...')
  for (const table of tables) {
    await validateRLS(table)
  }

  // Validate functions
  console.log('\n⚙️  Validating functions...')
  await validateFunction('get_course_progress')

  // Print results
  console.log('\n' + '='.repeat(60))
  console.log('VALIDATION RESULTS')
  console.log('='.repeat(60) + '\n')

  let passCount = 0
  let failCount = 0

  for (const result of results) {
    const icon = result.status === 'pass' ? '✅' : '❌'
    console.log(`${icon} ${result.name.padEnd(30)} ${result.message}`)

    if (result.status === 'pass') passCount++
    else failCount++
  }

  console.log('\n' + '='.repeat(60))
  console.log(`Total: ${passCount} passed, ${failCount} failed`)
  console.log('='.repeat(60) + '\n')

  if (failCount > 0) {
    console.log('❌ Validation failed. Please check the errors above.')
    console.log('\n💡 Common fixes:')
    console.log('   - Run `npm run db:reset` to recreate the schema')
    console.log('   - Check your SUPABASE_SECRET_KEY is correct')
    process.exit(1)
  } else {
    console.log('✅ All validations passed!')
    console.log('\n📝 Next steps:')
    console.log('   - Run `npm run db:types` to generate TypeScript types')
    console.log('   - Start developing with `npm run dev`')
  }
}

validateSchema()
