import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type SortOption = 'total_score' | 'achievements_count' | 'lessons_completed'

const VALID_SORT_OPTIONS: SortOption[] = ['total_score', 'achievements_count', 'lessons_completed']

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const sortBy = request.nextUrl.searchParams.get('sortBy') as SortOption | null
  const validSortBy = sortBy && VALID_SORT_OPTIONS.includes(sortBy) ? sortBy : 'total_score'

  const { data: entries, error } = await supabase
    .from('leaderboard_entries')
    .select('id, user_id, display_name, avatar_url, total_score, achievements_count, lessons_completed, quizzes_perfect, updated_at')
    .order(validSortBy, { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }

  return NextResponse.json(
    { entries: entries || [] },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    }
  )
}
