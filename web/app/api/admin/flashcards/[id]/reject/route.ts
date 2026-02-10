import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Reject a community flashcard (admin only)
 * POST /api/admin/flashcards/[id]/reject
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

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

    // Parse request body
    const body = await request.json()
    const { reason } = body

    // Update flashcard status to rejected
    const { data: rejectedCard, error } = await supabase
      .from('community_flashcards')
      .update({
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason || null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error rejecting flashcard:', error)
      return NextResponse.json({ error: 'Failed to reject flashcard' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Flashcard rejected successfully',
      card: rejectedCard,
    })
  } catch (error) {
    console.error('Error in reject flashcard endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
