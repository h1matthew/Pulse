'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { LeaderboardTable } from './LeaderboardTable'
import type { LeaderboardEntry } from '@/types/leaderboard'

type SortOption = 'total_score' | 'achievements_count' | 'lessons_completed'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'total_score', label: 'Total Points' },
  { value: 'achievements_count', label: 'Achievements' },
  { value: 'lessons_completed', label: 'Lessons Completed' },
]

interface LeaderboardClientProps {
  initialEntries: LeaderboardEntry[]
}

export function LeaderboardClient({ initialEntries }: LeaderboardClientProps) {
  const [sortBy, setSortBy] = useState<SortOption>('total_score')
  const [entries, setEntries] = useState<LeaderboardEntry[]>(initialEntries)
  const [loading, setLoading] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    if (sortBy === 'total_score') {
      // Use initial entries for default sort
      setEntries(initialEntries)
      return
    }

    async function fetchSorted() {
      setLoading(true)
      try {
        const res = await fetch(`/api/leaderboard?sortBy=${sortBy}`)
        if (res.ok) {
          const data = await res.json()
          setEntries(data.entries)
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false)
      }
    }

    fetchSorted()
  }, [sortBy, initialEntries])

  const selectedOption = SORT_OPTIONS.find(o => o.value === sortBy)

  return (
    <div className="space-y-4">
      {/* Sort dropdown */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Sort by</span>
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-lg border border-border/50 bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
          >
            {selectedOption?.label}
            <ChevronDown className={`h-4 w-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-lg border border-border/50 bg-card shadow-lg overflow-hidden">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSortBy(option.value)
                      setDropdownOpen(false)
                    }}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                      sortBy === option.value
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-foreground hover:bg-muted/50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <LeaderboardTable entries={entries} />
      )}
    </div>
  )
}
