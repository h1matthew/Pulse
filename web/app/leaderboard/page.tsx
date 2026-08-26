"use client";

import { Trophy, Medal, Award, Loader2, TrendingUp, Users, DollarSign } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedSection } from "@/components/features/home/AnimatedSection";
import { useLeaderboard } from "@/hooks/useImpact";
import { useAuth } from "@/components/providers/AuthProvider";
import { IMPACT_TIERS } from "@/types/impact";

import type { LeaderboardEntry } from '@/types/impact';

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Trophy className="h-6 w-6 text-yellow-500" />;
    case 2:
      return <Medal className="h-6 w-6 text-gray-400" />;
    case 3:
      return <Award className="h-6 w-6 text-amber-600" />;
    default:
      return <span className="text-lg font-bold text-muted-foreground w-6 text-center">{rank}</span>;
  }
}

function getTierColor(dollars: number): string {
  const tier = IMPACT_TIERS.slice().reverse().find(t => dollars >= t.minDollars);
  return tier?.color || "bg-gray-500";
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
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
            <div className="mb-8 text-center" data-tour="leaderboard">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-sm mb-4">
                <Trophy className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Community Leaders</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                Impact Leaderboard
              </h1>
              <p className="text-muted-foreground max-w-lg mx-auto">
                See who&apos;s making the biggest difference in our local economy
              </p>
            </div>
          </AnimatedSection>

          {/* User's Rank Card (if logged in and has rank) */}
          {user && (userRank || currentUserEntry) && (
            <AnimatedSection animation="fade-up" delay={0.1}>
              <Card className="mb-8">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Your Rank</p>
                        <p className="text-2xl font-bold">
                          {userRank ? `#${userRank}` : 'Not ranked yet'}
                        </p>
                      </div>
                    </div>
                    {currentUserEntry && (
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Your Score</p>
                        <p className="text-2xl font-bold">
                          {currentUserEntry.impact_score.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </AnimatedSection>
          )}

          {/* Stats Overview */}
          <AnimatedSection animation="fade-up" delay={0.15}>
            <div className="grid grid-cols-3 gap-4 mb-8">
              <Card>
                <CardContent className="p-4 text-center" suppressHydrationWarning>
                  <DollarSign className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                  <div className="text-2xl font-bold">
                    {isLoading ? (
                      <Skeleton className="h-8 w-16 mx-auto" />
                    ) : (
                      `$${(entries.reduce((sum, e) => sum + e.dollars_kept_local, 0) / 1000).toFixed(0)}K`
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Total Impact</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center" suppressHydrationWarning>
                  <Users className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                  <div className="text-2xl font-bold">
                    {isLoading ? (
                      <Skeleton className="h-8 w-16 mx-auto" />
                    ) : (
                      entries.length
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Contributors</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center" suppressHydrationWarning>
                  <Trophy className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                  <div className="text-2xl font-bold">
                    {isLoading ? (
                      <Skeleton className="h-8 w-16 mx-auto" />
                    ) : entries.length > 0 ? (
                      entries[0].impact_score.toLocaleString()
                    ) : (
                      '0'
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Top Score</p>
                </CardContent>
              </Card>
            </div>
          </AnimatedSection>

          {/* Leaderboard List */}
          <AnimatedSection animation="fade-up" delay={0.2}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-muted-foreground" />
                  Top Supporters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {isLoading ? (
                    <>
                      {[...Array(10)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4 p-3">
                          <Skeleton className="h-6 w-6" />
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="flex-1">
                            <Skeleton className="h-4 w-32" />
                          </div>
                          <Skeleton className="h-4 w-16" />
                        </div>
                      ))}
                    </>
                  ) : entries.length > 0 ? (
                    entries.map((entry, index) => {
                      const isCurrentUser = user && entry.user_id === user.id;
                      const tierColor = getTierColor(entry.dollars_kept_local);

                      return (
                        <div
                          key={entry.user_id}
                          className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                            isCurrentUser
                              ? 'bg-primary/10 border border-primary/20'
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          <div className="w-8 flex justify-center">
                            {getRankIcon(entry.rank)}
                          </div>

                          <Avatar className="h-10 w-10">
                            <AvatarFallback className={tierColor}>
                              {getInitials(entry.display_name)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {entry.display_name}
                              {isCurrentUser && (
                                <span className="ml-2 text-xs text-primary">(You)</span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              ${entry.dollars_kept_local.toLocaleString()} kept local
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="font-bold">{entry.impact_score.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">pts</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Trophy className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>No leaderboard data yet</p>
                      <p className="text-sm mt-1">Be the first to make an impact!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>

          {/* How Scoring Works */}
          <AnimatedSection animation="fade-up" delay={0.25}>
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="text-base">How Scoring Works</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-muted-foreground">$1 kept local = 0.1 points</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-chart-2" />
                    <span className="text-muted-foreground">Each business supported = 50 points</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-chart-3" />
                    <span className="text-muted-foreground">Each review = 25 points</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-chart-4" />
                    <span className="text-muted-foreground">Each mission = 100 points</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-chart-5" />
                    <span className="text-muted-foreground">Each check-in = 5 points</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>
        </div>
      </div>
    </div>
  );
}
