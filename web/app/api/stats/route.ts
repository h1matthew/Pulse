import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { COURSE_MODULES } from '@/lib/constants/modules'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Run all queries in parallel for better performance
  const [progressResult, profileResult, simStatsResult, streakResult] = await Promise.all([
    // Get lesson progress
    supabase
      .from('user_lesson_progress')
      .select('lesson_id, module_id, completed, quiz_score, quiz_total')
      .eq('user_id', user.id)
      .eq('completed', true),
    // Get profile for AI question count
    supabase
      .from('profiles')
      .select('ai_questions_asked')
      .eq('id', user.id)
      .single(),
    // Get simulator stats
    supabase
      .from('user_simulator_stats')
      .select('flight_launches, orbit_transfers, flight_max_altitude, flight_max_speed, orbit_max_distance')
      .eq('user_id', user.id)
      .single(),
    // Get streak data
    supabase
      .from('user_streaks')
      .select('current_streak')
      .eq('user_id', user.id)
      .single(),
  ])

  const lessonProgress = progressResult.data || []
  const profile = profileResult.data
  const simStats = simStatsResult.data
  const streakData = streakResult.data

  // Calculate stats
  const lessonsCompleted = lessonProgress.length

  // Count completed modules (all lessons in module completed)
  const completedByModule: Record<string, number> = {}
  for (const p of lessonProgress) {
    completedByModule[p.module_id] = (completedByModule[p.module_id] || 0) + 1
  }

  let modulesCompleted = 0
  for (const module of COURSE_MODULES) {
    const totalLessons = module.lessons.length
    const completedLessons = completedByModule[module.id] || 0
    if (completedLessons >= totalLessons) {
      modulesCompleted++
    }
  }

  // Count quizzes and perfect scores
  const quizzesWithScores = lessonProgress.filter(p => p.quiz_score !== null && p.quiz_total !== null)
  const quizCount = quizzesWithScores.length
  const quizPerfectCount = quizzesWithScores.filter(p => p.quiz_score === p.quiz_total).length

  // Get unique modules visited (any lesson viewed counts)
  const modulesVisited = [...new Set(lessonProgress.map(p => p.module_id))]

  const aiAskedCount = profile?.ai_questions_asked || 0

  return NextResponse.json(
    {
      stats: {
        lessonsCompleted,
        modulesCompleted,
        quizCount,
        quizPerfectCount,
        aiAskedCount,
        modulesVisited,
        flightLaunches: simStats?.flight_launches || 0,
        orbitTransfers: simStats?.orbit_transfers || 0,
        flightMaxAltitude: simStats?.flight_max_altitude || 0,
        flightMaxSpeed: simStats?.flight_max_speed || 0,
        orbitMaxDistance: simStats?.orbit_max_distance || 0,
        currentStreak: streakData?.current_streak || 0,
      }
    },
    {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      },
    }
  )
}
