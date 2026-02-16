import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  try {
    const { data: missions, error } = await supabase
      .from('boost_missions')
      .select(`
        *,
        category:categories(id, name, slug, icon)
      `)
      .eq('is_active', true)
      .or('end_date.is.null,end_date.gte.now()')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch missions' },
        { status: 500 }
      )
    }

    return NextResponse.json(missions || [])
  } catch (error) {
    console.error('Error fetching missions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
