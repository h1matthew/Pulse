import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID required' },
        { status: 400 }
      )
    }

    const { data: bookmark } = await supabase
      .from('business_bookmarks')
      .select('id')
      .eq('user_id', user.id)
      .eq('business_id', businessId)
      .single()

    return NextResponse.json({
      isBookmarked: !!bookmark,
      bookmarkId: bookmark?.id || null,
    })
  } catch (error) {
    console.error('Error checking bookmark:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
