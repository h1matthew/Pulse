import { createClient } from '@/lib/supabase/server'
import { calculateUserImpact } from '@/lib/impact-calculator'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Calculate impact using the existing calculator
    const result = await calculateUserImpact(user.id)

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to calculate impact' },
        { status: 500 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in impact calculate API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
