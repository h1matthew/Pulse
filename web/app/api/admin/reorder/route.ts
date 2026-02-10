import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type EntityType = 'modules' | 'lessons' | 'content_blocks' | 'quiz_questions'

interface ReorderItem {
  id: string
  order_index: number
}

interface ReorderRequest {
  entityType: EntityType
  items: ReorderItem[]
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const supabase = await createClient()
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { entityType, items }: ReorderRequest = await request.json()

    // Validate entity type
    const validEntityTypes: EntityType[] = ['modules', 'lessons', 'content_blocks', 'quiz_questions']
    if (!validEntityTypes.includes(entityType)) {
      return NextResponse.json(
        { error: 'Invalid entity type. Must be one of: modules, lessons, content_blocks, quiz_questions' },
        { status: 400 }
      )
    }

    // Validate items
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items array is required' }, { status: 400 })
    }

    // Maximum number of items to reorder in one request (prevent abuse)
    const MAX_ITEMS = 100
    if (items.length > MAX_ITEMS) {
      return NextResponse.json(
        { error: `Too many items. Maximum ${MAX_ITEMS} items per request.` },
        { status: 400 }
      )
    }

    for (const item of items) {
      if (!item.id || typeof item.order_index !== 'number') {
        return NextResponse.json(
          { error: 'Each item must have an id and order_index' },
          { status: 400 }
        )
      }

      // Validate order_index bounds (LOW SEVERITY FIX: Issue #16)
      // Prevents unreasonable values that could cause issues
      if (item.order_index < 0 || item.order_index > 9999) {
        return NextResponse.json(
          { error: 'order_index must be between 0 and 9999' },
          { status: 400 }
        )
      }

      // Validate order_index is an integer
      if (!Number.isInteger(item.order_index)) {
        return NextResponse.json(
          { error: 'order_index must be an integer' },
          { status: 400 }
        )
      }

      // Basic UUID format validation for id
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(item.id)) {
        return NextResponse.json(
          { error: 'Invalid item id format. Expected UUID.' },
          { status: 400 }
        )
      }
    }

    // Update order_index for each item
    const updates = items.map(item =>
      supabase.from(entityType).update({ order_index: item.order_index }).eq('id', item.id)
    )

    const results = await Promise.all(updates)
    const error = results.find(r => r.error)?.error

    if (error) {
      console.error('Error reordering:', error)
      return NextResponse.json({ error: 'Failed to reorder items' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in reorder endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
