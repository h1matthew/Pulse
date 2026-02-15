import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const preferencesSchema = z.object({
  preferred_categories: z.array(z.string()).max(10).optional(),
  price_range: z.array(z.number().int().min(1).max(4)).max(4).optional(),
  max_distance_miles: z.number().int().min(1).max(100).optional(),
  notification_enabled: z.boolean().optional(),
  email_notifications: z.boolean().optional(),
})

export async function GET() {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: preferences, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 }
      )
    }

    // Return defaults if no preferences found
    return NextResponse.json(preferences || {
      preferred_categories: [],
      price_range: [1, 2, 3, 4],
      max_distance_miles: 25,
      notification_enabled: true,
      email_notifications: true,
    })
  } catch (error) {
    console.error('Error fetching preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validation = preferencesSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') },
        { status: 400 }
      )
    }

    const preferences = validation.data

    // Upsert preferences
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        ...preferences,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
