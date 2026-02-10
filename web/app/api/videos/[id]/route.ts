import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/videos/[id]
// Returns video composition by ID
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Invalid video ID format' }, { status: 400 })
    }

    // Check if user is authenticated and admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Build query - for non-admins, only return published videos
    let query = supabase
      .from('video_compositions')
      .select('*')
      .eq('id', id)

    // Check if user is admin
    let isAdmin = false
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      isAdmin = profile?.is_admin ?? false
    }

    // Non-admins can only see published videos
    if (!isAdmin) {
      query = query.eq('status', 'published')
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Row not found
        return NextResponse.json({ error: 'Video not found' }, { status: 404 })
      }
      throw error
    }

    if (!data) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching video:', error)
    return NextResponse.json({ error: 'Failed to fetch video' }, { status: 500 })
  }
}
