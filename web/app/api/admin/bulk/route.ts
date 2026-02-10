import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { BulkActionRequest, BulkActionResult } from '@/types/ai-quiz'

/**
 * Bulk approve/reject AI quizzes or flashcards (admin only)
 * POST /api/admin/bulk
 * Body: { ids: string[], action: 'approve' | 'reject', reason?: string, type: 'quizzes' | 'flashcards' }
 */
export async function POST(request: NextRequest) {
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

    const body: BulkActionRequest & { type: 'quizzes' | 'flashcards' } = await request.json()
    const { ids, action, reason, type = 'quizzes' } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 })
    }

    // Limit bulk operations to prevent memory exhaustion
    const MAX_BULK_ITEMS = 100
    if (ids.length > MAX_BULK_ITEMS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_BULK_ITEMS} items allowed per bulk operation` },
        { status: 400 }
      )
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const tableName = type === 'quizzes' ? 'ai_generated_quizzes' : 'community_flashcards'

    // Build update payload
    const updateData: Record<string, unknown> = {
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }

    if (action === 'reject' && reason) {
      updateData.rejection_reason = reason
    }

    // Single bulk update instead of N individual queries
    const { error } = await supabase
      .from(tableName)
      .update(updateData)
      .in('id', ids)

    if (error) {
      return NextResponse.json({
        message: `Bulk ${action} failed`,
        result: { success: [], failed: ids.map(id => ({ id, error: error.message })) },
        totalProcessed: ids.length,
        successCount: 0,
        failedCount: ids.length,
      }, { status: 500 })
    }

    return NextResponse.json({
      message: `Bulk ${action} completed`,
      result: { success: ids, failed: [] },
      totalProcessed: ids.length,
      successCount: ids.length,
      failedCount: 0,
    })
  } catch (error) {
    console.error('Error in bulk action endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
