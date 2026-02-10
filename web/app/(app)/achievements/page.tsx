import { redirect } from 'next/navigation'
import { Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { AchievementBadge } from '@/components/features/achievements/AchievementBadge'
import { AnimatedSection } from '@/components/features/home/AnimatedSection'
import { ACHIEVEMENTS } from '@/lib/constants/achievements'

export default async function AchievementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user's unlocked achievements
  const { data: unlockedData } = await supabase
    .from('user_achievements')
    .select('achievement_id, unlocked_at')
    .eq('user_id', user.id)

  const unlockedIds = new Set((unlockedData || []).map(a => a.achievement_id))
  const unlockedCount = unlockedIds.size
  const totalPoints = ACHIEVEMENTS
    .filter(a => unlockedIds.has(a.id))
    .reduce((sum, a) => sum + a.points, 0)

  // Group achievements by category
  const categories = [
    { id: 'learning', title: 'Learning', description: 'Progress through lessons and quizzes' },
    { id: 'mastery', title: 'Mastery', description: 'Master concepts and complete modules' },
    { id: 'explorer', title: 'Explorer', description: 'Explore different parts of the curriculum' },
    { id: 'simulator', title: 'Simulator', description: 'Use the flight and orbit simulators' },
    { id: 'streak', title: 'Streaks', description: 'Maintain daily learning streaks' },
  ] as const

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      {/* Header */}
      <AnimatedSection animation="fade-up">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Achievements</h1>
            <p className="text-sm text-muted-foreground">
              {unlockedCount} of {ACHIEVEMENTS.length} unlocked · {totalPoints.toLocaleString()} points earned
            </p>
          </div>
        </div>
      </AnimatedSection>

      {/* Achievement categories */}
      <div className="space-y-10">
        {categories.map((category, index) => {
          const categoryAchievements = ACHIEVEMENTS.filter(a => a.category === category.id)

          return (
            <AnimatedSection key={category.id} animation="fade-up" delay={0.1 + (index * 0.15)}>
              <section>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-foreground">{category.title}</h2>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                  {categoryAchievements.map((achievement, badgeIndex) => (
                    <AchievementBadge
                      key={achievement.id}
                      achievement={achievement}
                      isUnlocked={unlockedIds.has(achievement.id)}
                      size="md"
                      delay={0.2 + (index * 0.15) + (badgeIndex * 0.08)}
                    />
                  ))}
                </div>
              </section>
            </AnimatedSection>
          )
        })}
      </div>
    </main>
  )
}
