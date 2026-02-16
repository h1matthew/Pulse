import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { data: progress, error } = await supabase
      .from('user_mission_progress')
      .select(`
        *,
        mission:boost_missions(
          *,
          category:categories(id, name, slug, icon)
        )
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch mission progress' },
        { status: 500 }
      )
    }

    return NextResponse.json(progress || [])
  } catch (error) {
    console.error('Error fetching mission progress:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
