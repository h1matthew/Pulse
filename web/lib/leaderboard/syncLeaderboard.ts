import { SupabaseClient } from '@supabase/supabase-js'

const SCORE_CONFIG = {
  lessonCompleted: 10,
  quizPerfect: 25,
  achievementUnlocked: 50,
  flashcardMastered: 5,
}

export async function syncLeaderboardEntry(
  userId: string,
  supabase: SupabaseClient
): Promise<void> {
  // Run all queries in parallel for better performance
  const [profileResult, lessonsResult, quizResult, achievementsResult, flashcardsResult] = await Promise.all([
    // Get user profile for display name
    supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single(),
    // Count completed lessons
    supabase
      .from('user_lesson_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('completed', true),
    // Count perfect quizzes
    supabase
      .from('user_lesson_progress')
      .select('quiz_score, quiz_total')
      .eq('user_id', userId)
      .not('quiz_score', 'is', null),
    // Count achievements
    supabase
      .from('user_achievements')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
    // Count mastered flashcards (repetitions >= 3)
    supabase
      .from('user_flashcard_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('repetitions', 3),
  ])

  const profile = profileResult.data
  const displayName = profile?.full_name || profile?.email?.split('@')[0] || 'Anonymous'

  const lessonsCompleted = lessonsResult.count || 0

  const quizzesPerfect = (quizResult.data || []).filter(
    p => p.quiz_score === p.quiz_total
  ).length

  const achievements = achievementsResult.count || 0

  const masteredFlashcards = flashcardsResult.count || 0

  // Calculate total score
  const totalScore =
    lessonsCompleted * SCORE_CONFIG.lessonCompleted +
    quizzesPerfect * SCORE_CONFIG.quizPerfect +
    achievements * SCORE_CONFIG.achievementUnlocked +
    masteredFlashcards * SCORE_CONFIG.flashcardMastered

  // Upsert leaderboard entry
  await supabase
    .from('leaderboard_entries')
    .upsert({
      user_id: userId,
      display_name: displayName,
      total_score: totalScore,
      lessons_completed: lessonsCompleted,
      quizzes_perfect: quizzesPerfect,
      achievements_count: achievements,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    })
}
