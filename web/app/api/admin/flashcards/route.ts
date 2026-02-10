import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * List pending community flashcards for admin review
 * GET /api/admin/flashcards?status=pending&offset=0&limit=20
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const offset = parseInt(searchParams.get('offset') || '0')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const moduleId = searchParams.get('moduleId')

    // Build query
    let query = supabase
      .from('community_flashcards')
      .select('*, submitted_by:profiles!submitted_by(email)', { count: 'exact' })
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (moduleId) {
      query = query.eq('module_id', moduleId)
    }

    const { data: cards, count, error } = await query

    if (error) {
      console.error('Error fetching pending flashcards:', error)
      return NextResponse.json({ error: 'Failed to fetch flashcards' }, { status: 500 })
    }

    return NextResponse.json({
      cards: cards || [],
      total: count || 0,
      offset,
      limit,
    })
  } catch (error) {
    console.error('Error in admin flashcards endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
