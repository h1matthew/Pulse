import { SupabaseClient } from '@supabase/supabase-js'

interface StreakData {
  currentStreak: number
  longestStreak: number
  lastActivityDate: string | null
  isActiveToday: boolean
}

export async function getStreak(
  userId: string,
  supabase: SupabaseClient
): Promise<StreakData> {
  const { data } = await supabase
    .from('user_streaks')
    .select('current_streak, longest_streak, last_activity_date')
    .eq('user_id', userId)
    .single()

  const today = new Date().toISOString().split('T')[0]
  const isActiveToday = data?.last_activity_date === today

  return {
    currentStreak: data?.current_streak || 0,
    longestStreak: data?.longest_streak || 0,
    lastActivityDate: data?.last_activity_date || null,
    isActiveToday,
  }
}

export async function updateStreak(
  userId: string,
  supabase: SupabaseClient
): Promise<{ currentStreak: number; longestStreak: number; isNewStreak: boolean }> {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  // Get current streak data
  const { data: existing } = await supabase
    .from('user_streaks')
    .select('current_streak, longest_streak, last_activity_date')
    .eq('user_id', userId)
    .single()

  let currentStreak = 1
  let longestStreak = existing?.longest_streak || 0
  let isNewStreak = false

  if (existing?.last_activity_date === today) {
    // Already active today, no change
    return {
      currentStreak: existing.current_streak,
      longestStreak: existing.longest_streak,
      isNewStreak: false,
    }
  } else if (existing?.last_activity_date === yesterday) {
    // Consecutive day, increment streak
    currentStreak = (existing.current_streak || 0) + 1
    isNewStreak = true
  } else if (existing?.last_activity_date) {
    // Streak broken, reset to 1
    currentStreak = 1
    isNewStreak = true
  } else {
    // First activity ever
    currentStreak = 1
    isNewStreak = true
  }

  // Update longest streak if needed
  if (currentStreak > longestStreak) {
    longestStreak = currentStreak
  }

  // Upsert streak data
  await supabase
    .from('user_streaks')
    .upsert({
      user_id: userId,
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_activity_date: today,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    })

  return { currentStreak, longestStreak, isNewStreak }
}
