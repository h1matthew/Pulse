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
        <span className="font-mono text-meta uppercase tracking-[0.02em] text-text-tertiary">Sort by</span>
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-md border border-border bg-surface-1 px-3 py-2 text-small text-foreground transition-colors hover:bg-surface-2"
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
              <div className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-md border border-border-strong bg-surface-2">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSortBy(option.value)
                      setDropdownOpen(false)
                    }}
                    className={`w-full px-3 py-2 text-left text-small transition-colors ${
                      sortBy === option.value
                        ? 'bg-surface-3 text-primary'
                        : 'text-foreground hover:bg-surface-3'
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
