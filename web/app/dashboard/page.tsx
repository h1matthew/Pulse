"use client";

import { useEffect } from "react";
import { TrendingUp, DollarSign, Store, Users, Star, Zap, Target, Award, Loader2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedSection } from "@/components/features/home/AnimatedSection";
import { NavLink } from "@/components/ui/nav-link";
import { useUserImpact, useImpactDisplay, useCommunityPulse } from "@/hooks/useImpact";
import { useMissionProgressDetails } from "@/hooks/useMissions";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

// Fetch recent activity
async function fetchRecentActivity() {
  const response = await fetch('/api/activity');
  if (!response.ok) throw new Error('Failed to fetch activity');
  return response.json();
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  const userId = user?.id || '';

  // Fetch real data
  const { data: impact, isLoading: impactLoading } = useUserImpact(userId);
  const impactDisplay = useImpactDisplay(userId);
  const { data: communityPulse, isLoading: pulseLoading } = useCommunityPulse();
  const { activeMissions, isLoading: missionsLoading } = useMissionProgressDetails(userId);
  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['activity'],
    queryFn: fetchRecentActivity,
    enabled: !!userId,
  });

  // Calculate impact score
  const impactScore = impact
    ? Math.floor(
        Number(impact.estimated_dollars_kept_local) / 10 +
        impact.total_check_ins * 5 +
        impact.reviews_left * 25 +
        impact.missions_completed * 100
      )
    : 0;

  // Calculate progress to next tier
  const nextTierProgress = impactDisplay?.nextTierProgress != null
    ? Math.round(impactDisplay.nextTierProgress * 100)
    : 0;

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="relative min-h-screen bg-background">
        <Header />
        <div className="pt-20 pb-12 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-background">
      <Header />

      <div className="pt-20 pb-12">
        <div className="mx-auto max-w-6xl px-6">
          {/* Header */}
          <AnimatedSection animation="fade-up">
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                Your Economic Impact
              </h1>
              <p className="text-muted-foreground">
                See how your support strengthens the local economy
              </p>
            </div>
          </AnimatedSection>

          {/* Impact Score Card */}
          <AnimatedSection animation="fade-up" delay={0.1}>
            <Card className="mb-8 bg-gradient-to-br from-primary/5 via-background to-chart-2/5">
              <CardContent className="p-8">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      Your Impact Score
                    </div>
                    {impactLoading ? (
                      <Skeleton className="h-12 w-32" />
                    ) : (
                      <div className="text-5xl font-bold gradient-text mb-2">
                        {impactScore.toLocaleString()}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Award className="h-4 w-4 text-chart-5" />
                      {impactLoading ? (
                        <Skeleton className="h-4 w-24" />
                      ) : impact?.community_rank ? (
                        <>Rank #{impact.community_rank} in your community</>
                      ) : (
                        <>Start engaging to earn your rank!</>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">
                          Progress to next rank
                        </span>
                        <span className="font-medium">{nextTierProgress}%</span>
                      </div>
                      <Progress value={nextTierProgress} className="h-2" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {impactDisplay?.nextTier ? (
                        <>Complete more missions to reach {impactDisplay.nextTier.name}!</>
                      ) : impactDisplay?.tier ? (
                        <>You&apos;re at the top tier! Keep supporting local businesses.</>
                      ) : (
                        <>Start engaging to reach your first tier!</>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>

          {/* Impact Metrics */}
          <AnimatedSection animation="fade-up" delay={0.15}>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      {impactLoading ? (
                        <Skeleton className="h-8 w-20" />
                      ) : (
                        <div className="text-2xl font-bold">
                          ${Math.round(Number(impact?.estimated_dollars_kept_local || 0)).toLocaleString()}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Dollars Kept Local
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-chart-2/10 flex items-center justify-center">
                      <Store className="h-6 w-6 text-chart-2" />
                    </div>
                    <div>
                      {impactLoading ? (
                        <Skeleton className="h-8 w-12" />
                      ) : (
                        <div className="text-2xl font-bold">
                          {impact?.businesses_supported || 0}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Businesses Supported
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-chart-3/10 flex items-center justify-center">
                      <Users className="h-6 w-6 text-chart-3" />
                    </div>
                    <div>
                      {impactLoading ? (
                        <Skeleton className="h-8 w-12" />
                      ) : (
                        <div className="text-2xl font-bold">
                          {impact?.jobs_impacted_estimate || 0}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Jobs Impacted
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-chart-4/10 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-chart-4" />
                    </div>
                    <div>
                      {impactLoading ? (
                        <Skeleton className="h-8 w-12" />
                      ) : (
                        <div className="text-2xl font-bold">
                          {impact?.total_check_ins || 0}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Total Check-ins
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </AnimatedSection>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Active Missions */}
            <div className="lg:col-span-2">
              <AnimatedSection animation="fade-up" delay={0.2}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-chart-3" />
                      Active Boost Missions
                    </CardTitle>
                    <NavLink href="/missions">
                      <Button variant="ghost" size="sm">
                        View All
                      </Button>
                    </NavLink>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {missionsLoading ? (
                      <>
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                      </>
                    ) : activeMissions.length > 0 ? (
                      activeMissions.slice(0, 3).map((mission) => (
                        <div
                          key={mission.progress.id}
                          className="flex items-center gap-4 p-4 rounded-lg border bg-card/50"
                        >
                          <div className="text-3xl">🎯</div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-semibold">{mission.progress.mission.title}</h4>
                              <span className="text-sm text-muted-foreground">
                                {mission.progress.current_count}/{mission.progress.mission.target_count}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {mission.progress.mission.description}
                            </p>
                            <Progress
                              value={mission.percentageComplete}
                              className="h-2"
                            />
                            <div className="mt-2 text-xs text-chart-3">
                              Reward: {mission.progress.mission.reward_description}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No active missions</p>
                        <NavLink href="/missions">
                          <Button variant="outline" size="sm" className="mt-4">
                            Browse Missions
                          </Button>
                        </NavLink>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </AnimatedSection>

              {/* Recent Activity */}
              <AnimatedSection animation="fade-up" delay={0.25}>
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {activityLoading ? (
                        <>
                          <Skeleton className="h-16 w-full" />
                          <Skeleton className="h-16 w-full" />
                          <Skeleton className="h-16 w-full" />
                        </>
                      ) : recentActivity && recentActivity.length > 0 ? (
                        recentActivity.map((activity: { id: string; type: string; business: string; time: string; impact: number }) => (
                          <div
                            key={activity.id}
                            className="flex items-center justify-between py-3 border-b last:border-0"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                  activity.type === "check_in"
                                    ? "bg-primary/10"
                                    : activity.type === "review"
                                    ? "bg-chart-4/10"
                                    : activity.type === "bookmark"
                                    ? "bg-chart-5/10"
                                    : "bg-chart-2/10"
                                }`}
                              >
                                {activity.type === "check_in" && (
                                  <TrendingUp className="h-4 w-4 text-primary" />
                                )}
                                {activity.type === "review" && (
                                  <Star className="h-4 w-4 text-chart-4" />
                                )}
                                {activity.type === "bookmark" && (
                                  <Store className="h-4 w-4 text-chart-5" />
                                )}
                                {activity.type === "deal_claimed" && (
                                  <DollarSign className="h-4 w-4 text-chart-2" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium">
                                  {activity.type === "check_in" && "Checked in at "}
                                  {activity.type === "review" && "Reviewed "}
                                  {activity.type === "bookmark" && "Bookmarked "}
                                  {activity.type === "deal_claimed" && "Claimed deal at "}
                                  <span className="text-primary">
                                    {activity.business}
                                  </span>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {activity.time}
                                </p>
                              </div>
                            </div>
                            <div className="text-sm font-medium text-chart-3">
                              +{activity.impact} pts
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>No recent activity</p>
                          <p className="text-sm mt-1">Start exploring local businesses!</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </AnimatedSection>
            </div>

            {/* Sidebar */}
            <div>
              <AnimatedSection animation="fade-up" delay={0.3}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Reviews Left</span>
                      {impactLoading ? (
                        <Skeleton className="h-4 w-8" />
                      ) : (
                        <span className="font-medium">{impact?.reviews_left || 0}</span>
                      )}
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Missions Completed
                      </span>
                      {impactLoading ? (
                        <Skeleton className="h-4 w-8" />
                      ) : (
                        <span className="font-medium">
                          {impact?.missions_completed || 0}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Deals Claimed</span>
                      {impactLoading ? (
                        <Skeleton className="h-4 w-8" />
                      ) : (
                        <span className="font-medium">
                          {impact?.deals_claimed || 0}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </AnimatedSection>

              <AnimatedSection animation="fade-up" delay={0.35}>
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-base">Community Impact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      {pulseLoading ? (
                        <Skeleton className="h-10 w-24 mx-auto mb-1" />
                      ) : (
                        <div className="text-3xl font-bold gradient-text mb-1">
                          {communityPulse?.pulse_score?.toLocaleString() || '0'}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Community Pulse Score
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          Total Dollars Kept Local
                        </span>
                        {pulseLoading ? (
                          <Skeleton className="h-4 w-16" />
                        ) : (
                          <span>${((communityPulse?.total_dollars_kept_local || 0) / 1000000).toFixed(1)}M</span>
                        )}
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          Businesses Supported
                        </span>
                        {pulseLoading ? (
                          <Skeleton className="h-4 w-12" />
                        ) : (
                          <span>{(communityPulse?.total_businesses_supported || 0).toLocaleString()}</span>
                        )}
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Active Members</span>
                        {pulseLoading ? (
                          <Skeleton className="h-4 w-12" />
                        ) : (
                          <span>{((communityPulse?.active_users || 0) / 1000).toFixed(1)}K</span>
                        )}
                      </div>
                    </div>
                    <NavLink href="/leaderboard">
                      <Button variant="outline" className="w-full" size="sm">
                        View Leaderboard
                      </Button>
                    </NavLink>
                  </CardContent>
                </Card>
              </AnimatedSection>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
