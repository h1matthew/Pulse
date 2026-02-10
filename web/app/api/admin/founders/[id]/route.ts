import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Update a founder's bio or image position (admin only)
 * PATCH /api/admin/founders/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { bio, image_offset_x, image_offset_y, image_zoom } = body

    const updates: Record<string, unknown> = {}
    if (bio !== undefined) updates.bio = bio
    if (image_offset_x !== undefined) updates.image_offset_x = Math.max(-50, Math.min(150, Number(image_offset_x)))
    if (image_offset_y !== undefined) updates.image_offset_y = Math.max(-50, Math.min(150, Number(image_offset_y)))
    if (image_zoom !== undefined) updates.image_zoom = Math.max(1, Math.min(3, Number(image_zoom)))

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: updatedFounder, error } = await supabase
      .from('founders')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating founder:', error)
      return NextResponse.json({ error: 'Failed to update founder' }, { status: 500 })
    }

    return NextResponse.json({ founder: updatedFounder })
  } catch (error) {
    console.error('Error in update founder endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
