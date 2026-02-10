import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Reject an AI-generated quiz (admin only)
 * POST /api/admin/quizzes/[id]/reject
 * Body: { reason?: string }
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

    // Get optional rejection reason from body
    let reason: string | undefined
    try {
      const body = await request.json()
      reason = body.reason
    } catch {
      // No body provided, that's fine
    }

    // Update quiz status to rejected
    const { data: rejectedQuiz, error } = await supabase
      .from('ai_generated_quizzes')
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
      console.error('Error rejecting quiz:', error)
      return NextResponse.json({ error: 'Failed to reject quiz' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Quiz rejected successfully',
      quiz: rejectedQuiz,
    })
  } catch (error) {
    console.error('Error in reject quiz endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
