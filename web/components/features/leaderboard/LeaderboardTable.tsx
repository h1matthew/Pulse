'use client'

import { cn } from '@/lib/utils'
import type { LeaderboardEntry } from '@/types/leaderboard'

interface LeaderboardTableProps {
  entries: LeaderboardEntry[]
}

export function LeaderboardTable({ entries }: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No learners on the leaderboard yet.</p>
        <p className="text-small mt-1">Be the first to complete lessons and earn points!</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full">
        <thead>
          <tr className="bg-surface-2 text-left font-mono text-meta font-normal uppercase tracking-[0.02em] text-text-tertiary">
            <th className="px-4 py-3 w-16">Rank</th>
            <th className="px-4 py-3">Learner</th>
            <th className="px-4 py-3 text-right">Score</th>
            <th className="px-4 py-3 text-right hidden sm:table-cell">Lessons</th>
            <th className="px-4 py-3 text-right hidden sm:table-cell">Achievements</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {entries.map((entry, index) => (
            <tr
              key={entry.user_id}
              className="card-lift"
            >
              <td className="px-4 py-3">
                <RankBadge rank={index + 1} />
              </td>
              <td className="px-4 py-3">
                <span className="font-medium text-foreground">{entry.display_name}</span>
              </td>
              <td className="px-4 py-3 text-right">
                <span className="font-mono text-body tabular-nums text-foreground">{entry.total_score.toLocaleString()}</span>
              </td>
              <td className="hidden px-4 py-3 text-right font-mono text-meta tabular-nums text-text-tertiary sm:table-cell">
                {entry.lessons_completed}
              </td>
              <td className="hidden px-4 py-3 text-right font-mono text-meta tabular-nums text-text-tertiary sm:table-cell">
                {entry.achievements_count}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className={cn(
        'font-mono text-body tabular-nums',
        rank <= 3 ? 'text-foreground' : 'text-text-tertiary'
      )}
    >
      {rank}
    </span>
  )
}
