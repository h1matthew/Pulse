'use client'

import { Trophy, Medal, Award } from 'lucide-react'
import type { LeaderboardEntry } from '@/types/leaderboard'

interface LeaderboardTableProps {
  entries: LeaderboardEntry[]
}

export function LeaderboardTable({ entries }: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No learners on the leaderboard yet.</p>
        <p className="text-sm mt-1">Be the first to complete lessons and earn points!</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-muted/50 text-left text-sm font-medium text-muted-foreground">
            <th className="px-4 py-3 w-16">Rank</th>
            <th className="px-4 py-3">Learner</th>
            <th className="px-4 py-3 text-right">Score</th>
            <th className="px-4 py-3 text-right hidden sm:table-cell">Lessons</th>
            <th className="px-4 py-3 text-right hidden sm:table-cell">Achievements</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {entries.map((entry, index) => (
            <tr
              key={entry.user_id}
              className="hover:bg-muted/30 transition-colors"
            >
              <td className="px-4 py-3">
                <RankBadge rank={index + 1} />
              </td>
              <td className="px-4 py-3">
                <span className="font-medium text-foreground">{entry.display_name}</span>
              </td>
              <td className="px-4 py-3 text-right">
                <span className="font-semibold text-foreground">{entry.total_score.toLocaleString()}</span>
              </td>
              <td className="px-4 py-3 text-right hidden sm:table-cell text-muted-foreground">
                {entry.lessons_completed}
              </td>
              <td className="px-4 py-3 text-right hidden sm:table-cell text-muted-foreground">
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
  if (rank === 1) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
        <Trophy className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      </div>
    )
  }
  if (rank === 2) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
        <Medal className="h-4 w-4 text-gray-500 dark:text-gray-400" />
      </div>
    )
  }
  if (rank === 3) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
        <Award className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      </div>
    )
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-medium">
      {rank}
    </div>
  )
}
