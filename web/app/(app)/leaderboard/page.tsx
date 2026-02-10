import { Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { LeaderboardClient } from '@/components/features/leaderboard/LeaderboardClient'
import { AnimatedSection } from '@/components/features/home/AnimatedSection'
import type { LeaderboardEntry } from '@/types/leaderboard'

export default async function LeaderboardPage() {
  const supabase = await createClient()

  const { data: entries } = await supabase
    .from('leaderboard_entries')
    .select('*')
    .order('total_score', { ascending: false })
    .limit(100)

  const leaderboardEntries: LeaderboardEntry[] = entries || []

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <AnimatedSection animation="fade-up">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Leaderboard</h1>
            <p className="text-sm text-muted-foreground">
              Top learners ranked by progress and achievements
            </p>
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection animation="fade-up" delay={0.1}>
        <LeaderboardClient initialEntries={leaderboardEntries} />
      </AnimatedSection>
    </main>
  )
}
