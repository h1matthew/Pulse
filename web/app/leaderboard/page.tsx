"use client";

import { Header } from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedSection } from "@/components/features/home/AnimatedSection";
import { useLeaderboard } from "@/hooks/useImpact";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";
import { IMPACT_TIERS } from "@/types/impact";

/** Tier name for a dollar total, shown as the row's classification cell. */
function getTierName(dollars: number): string {
  const tier = IMPACT_TIERS.slice().reverse().find(t => dollars >= t.minDollars);
  return tier?.name ?? "Pulse Newcomer";
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const { data: leaderboardData, isLoading } = useLeaderboard('global', 'all_time');

  const entries = leaderboardData?.entries ?? [];
  const userRank = leaderboardData?.userRank;

  // Find current user's entry
  const currentUserEntry = user
    ? entries.find(e => e.user_id === user.id)
    : null;

  return (
    <div className="relative min-h-screen">
      <Header />

      <div className="pt-28 pb-12">
        <div className="mx-auto max-w-4xl px-6">
          {/* Header */}
          <AnimatedSection animation="fade-up">
            <div className="mb-5 border-b border-border pb-5" data-tour="leaderboard">
              <h1 className="text-h2 font-medium">Impact Leaderboard</h1>
              <p className="mt-1.5 text-small text-muted-foreground">
                Ranked by points earned from verified check-ins, reviews, and completed missions.
              </p>
              {/* Skeleton renders a <div>, so this summary is a div, never a <p> */}
              <div
                className="mt-3 flex flex-wrap items-baseline gap-x-1.5 font-mono text-meta tabular-nums text-text-tertiary"
                suppressHydrationWarning
              >
                {isLoading ? (
                  <Skeleton className="h-3 w-56" />
                ) : (
                  <>
                    <span>
                      ${entries.reduce((sum, e) => sum + e.dollars_kept_local, 0).toLocaleString()} kept local
                    </span>
                    <span aria-hidden="true">&middot;</span>
                    <span>{entries.length} contributors</span>
                    <span aria-hidden="true">&middot;</span>
                    <span>
                      {entries.length > 0 ? entries[0].impact_score.toLocaleString() : '0'} top score
                    </span>
                    {user && (userRank || currentUserEntry) && (
                      <>
                        <span aria-hidden="true">&middot;</span>
                        <span className="text-foreground">
                          you: {userRank ? `#${userRank}` : 'unranked'}
                          {currentUserEntry ? ` / ${currentUserEntry.impact_score.toLocaleString()} pts` : ''}
                        </span>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </AnimatedSection>

          {/* Leaderboard rows */}
          <AnimatedSection animation="fade-up" delay={0.2}>
            <div className="divide-y divide-border border-t border-border">
              {isLoading ? (
                [...Array(10)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 py-3">
                    <Skeleton className="h-4 w-8 shrink-0" />
                    <Skeleton className="h-4 w-40 flex-1" />
                    <Skeleton className="h-4 w-16 shrink-0" />
                  </div>
                ))
              ) : entries.length > 0 ? (
                entries.map((entry) => {
                  const isCurrentUser = !!user && entry.user_id === user.id;

                  return (
                    <div
                      key={entry.user_id}
                      className={cn(
                        "card-lift flex items-baseline gap-4 px-2 py-3",
                        isCurrentUser && "bg-surface-2"
                      )}
                    >
                      <span className="w-8 shrink-0 font-mono text-body tabular-nums text-text-tertiary">
                        {entry.rank}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body font-medium">
                          {entry.display_name}
                          {isCurrentUser && (
                            <span className="ml-2 font-mono text-meta text-primary">(You)</span>
                          )}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 font-mono text-meta uppercase tracking-[0.02em] text-text-tertiary">
                          <span>{getTierName(entry.dollars_kept_local)}</span>
                          <span aria-hidden="true">&middot;</span>
                          <span className="tabular-nums">
                            ${entry.dollars_kept_local.toLocaleString()} kept local
                          </span>
                        </p>
                      </div>

                      <span className="shrink-0 font-mono text-body tabular-nums">
                        {entry.impact_score.toLocaleString()}
                        <span className="ml-1 text-meta text-text-tertiary">pts</span>
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="py-10">
                  <p className="text-body font-medium">No leaderboard data yet</p>
                  <p className="mt-1 text-small text-muted-foreground">
                    Check in with a receipt and your first points land here.
                  </p>
                </div>
              )}
            </div>
          </AnimatedSection>

          {/* Scoring reference */}
          <AnimatedSection animation="fade-up" delay={0.25}>
            <section aria-labelledby="scoring-heading" className="pt-[--spacing-section-sm]">
              <h2 id="scoring-heading" className="mb-3 text-h3 font-medium">How scoring works</h2>
              <dl className="divide-y divide-border border-y border-border">
                {[
                  { label: '$1 kept local', value: '0.1 pts' },
                  { label: 'Business supported', value: '50 pts' },
                  { label: 'Review left', value: '25 pts' },
                  { label: 'Mission completed', value: '100 pts' },
                  { label: 'Check-in', value: '5 pts' },
                ].map((rule) => (
                  <div key={rule.label} className="flex justify-between gap-3 py-2 text-small">
                    <dt className="text-muted-foreground">{rule.label}</dt>
                    <dd className="font-mono tabular-nums">{rule.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </AnimatedSection>
        </div>
      </div>
    </div>
  );
}
