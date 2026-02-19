"use client";

import { useState, useEffect, useMemo } from "react";
import { TrendingUp, DollarSign, Store, Users, Star, Zap, Target, Award, Loader2, Heart, MapPin, ArrowRight, FileText } from "lucide-react";
import { ImpactReportDialog } from "@/components/features/dashboard/ImpactReport";
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
import { useBusinesses } from "@/hooks/useBusinesses";
import type { BusinessWithCategory } from "@/types/business";

const DASHBOARD_SPOTLIGHT_LOCATION = { lat: 34.0286, lng: -117.8208 };
const DASHBOARD_SPOTLIGHT_RADIUS_METERS = 10000;

// Fetch recent activity
async function fetchRecentActivity() {
  const response = await fetch('/api/activity');
  if (!response.ok) throw new Error('Failed to fetch activity');
  return response.json();
}

async function fetchSpotlightBusinesses(): Promise<BusinessWithCategory[]> {
  const params = new URLSearchParams({
    lat: DASHBOARD_SPOTLIGHT_LOCATION.lat.toString(),
    lng: DASHBOARD_SPOTLIGHT_LOCATION.lng.toString(),
    radius: DASHBOARD_SPOTLIGHT_RADIUS_METERS.toString(),
  });
  const response = await fetch(`/api/businesses/nearby?${params.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch spotlight businesses");
  return response.json();
}

function isCommunityPulseMeaningful(data: {
  pulse_score?: number | null;
  total_dollars_kept_local?: number | null;
  total_businesses_supported?: number | null;
  active_users?: number | null;
} | null | undefined): boolean {
  if (!data) return false;
  return (
    Number(data.pulse_score || 0) > 0 ||
    Number(data.total_dollars_kept_local || 0) > 0 ||
    Number(data.total_businesses_supported || 0) > 0 ||
    Number(data.active_users || 0) > 0
  );
}

function formatCompactCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

// Impact Story Card Component
function ImpactStoryCard({
  title,
  value,
  description,
  icon: Icon,
  color,
  delay = 0,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  delay?: number;
}) {
  return (
    <AnimatedSection animation="fade-up" delay={delay}>
      <Card className="h-full card-lift">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className={`h-12 w-12 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold mb-1">{value}</div>
              <div className="font-medium text-sm mb-1">{title}</div>
              <div className="text-xs text-muted-foreground">{description}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </AnimatedSection>
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reportOpen, setReportOpen] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  const userId = user?.id || '';
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Friend';

  // Fetch real data
  const { data: impact, isLoading: impactLoading } = useUserImpact(userId);
  const impactDisplay = useImpactDisplay(userId);
  const { data: communityPulse, isLoading: pulseLoading } = useCommunityPulse(userId);
  const { activeMissions, isLoading: missionsLoading } = useMissionProgressDetails(userId);
  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['activity'],
    queryFn: fetchRecentActivity,
    enabled: !!userId,
  });
  const { data: spotlightNearbyBusinesses } = useQuery({
    queryKey: ['dashboard', 'spotlight', 'nearby'],
    queryFn: fetchSpotlightBusinesses,
    staleTime: 5 * 60 * 1000,
  });

  // Fallback list data if nearby spotlight query fails or returns empty.
  const { data: featuredBusinessData } = useBusinesses({ sortBy: 'review_count' }, 1, 12);
  const featuredBusiness = useMemo(() => {
    const nearbyBusinesses = spotlightNearbyBusinesses || [];
    const listBusinesses = featuredBusinessData?.businesses || [];
    const businesses = nearbyBusinesses.length > 0 ? nearbyBusinesses : listBusinesses;

    const realGoogleBusiness = businesses.find(
      (business) => business.data_source === 'google' && !!business.place_id
    );
    if (realGoogleBusiness) return realGoogleBusiness;

    return businesses[0];
  }, [spotlightNearbyBusinesses, featuredBusinessData?.businesses]);

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

  const communityImpact = useMemo(() => {
    if (isCommunityPulseMeaningful(communityPulse)) {
      return {
        pulseScore: Number(communityPulse?.pulse_score || 0),
        totalDollarsKeptLocal: Number(communityPulse?.total_dollars_kept_local || 0),
        totalBusinessesSupported: Number(communityPulse?.total_businesses_supported || 0),
        activeUsers: Number(communityPulse?.active_users || 0),
      };
    }

    const userDollars = Number(impact?.estimated_dollars_kept_local || 0);
    const userBusinesses = Number(impact?.businesses_supported || 0);
    const userReviews = Number(impact?.reviews_left || 0);
    const userMissions = Number(impact?.missions_completed || 0);
    const userCheckIns = Number(impact?.total_check_ins || 0);
    const hasAnyImpact =
      userDollars > 0 ||
      userBusinesses > 0 ||
      userReviews > 0 ||
      userMissions > 0 ||
      userCheckIns > 0;

    if (!hasAnyImpact) return null;

    return {
      pulseScore: impactScore,
      totalDollarsKeptLocal: userDollars,
      totalBusinessesSupported: userBusinesses,
      activeUsers: 1,
    };
  }, [communityPulse, impact, impactScore]);

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
          {/* Hero Section with Pulse Mission */}
          <AnimatedSection animation="fade-up">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-4">
                <Heart className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-sm font-medium">Pulse — Powering the Heart of Local Business</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                Welcome back, {userName}! 💚
              </h1>
              <p className="text-muted-foreground max-w-2xl">
                {impact && Number(impact.estimated_dollars_kept_local) > 0 ? (
                  <>
                    You&apos;ve kept <span className="font-semibold text-primary">${Math.round(Number(impact.estimated_dollars_kept_local)).toLocaleString()}</span> in your community.
                    Every dollar you spend locally creates a ripple effect that supports families, creates jobs, and strengthens neighborhoods.
                  </>
                ) : (
                  <>
                    Start your journey to support local businesses! Every visit, review, and bookmark
                    helps strengthen your community&apos;s economic heartbeat.
                  </>
                )}
              </p>
            </div>
          </AnimatedSection>

          {/* Impact Score Card */}
          <AnimatedSection animation="fade-up" delay={0.1}>
            <Card className="mb-8 bg-gradient-to-br from-primary/5 via-background to-chart-2/5">
              <CardContent className="p-8">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div suppressHydrationWarning>
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
                    <div className="flex items-center gap-2 text-sm text-muted-foreground" suppressHydrationWarning>
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
                    <Button
                      onClick={() => setReportOpen(true)}
                      className="mt-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Download My Impact Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>

          {/* Impact Story Cards */}
          <AnimatedSection animation="fade-up" delay={0.15}>
            <div className="mb-2">
              <h2 className="text-lg font-semibold">Your Impact Story</h2>
              <p className="text-sm text-muted-foreground">
                See how your actions create real change in your community
              </p>
            </div>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <ImpactStoryCard
              title="Dollars Kept Local"
              value={impactLoading ? "..." : `$${Math.round(Number(impact?.estimated_dollars_kept_local || 0)).toLocaleString()}`}
              description="Money that stayed in your community instead of going to corporate chains"
              icon={DollarSign}
              color="bg-primary"
              delay={0.15}
            />

            <ImpactStoryCard
              title="Businesses Supported"
              value={impactLoading ? "..." : `${impact?.businesses_supported || 0}`}
              description="Local entrepreneurs and family-owned businesses you've helped thrive"
              icon={Store}
              color="bg-chart-2"
              delay={0.2}
            />

            <ImpactStoryCard
              title="Jobs Impacted"
              value={impactLoading ? "..." : `${impact?.jobs_impacted_estimate || 0}`}
              description="Local workers whose livelihoods are supported by your choices"
              icon={Users}
              color="bg-chart-3"
              delay={0.25}
            />

            <ImpactStoryCard
              title="Check-ins"
              value={impactLoading ? "..." : `${impact?.total_check_ins || 0}`}
              description="Times you've visited and engaged with local businesses"
              icon={MapPin}
              color="bg-chart-4"
              delay={0.3}
            />
          </div>

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
                    <div className="flex justify-between text-sm" suppressHydrationWarning>
                      <span className="text-muted-foreground">Reviews Left</span>
                      {impactLoading ? (
                        <Skeleton className="h-4 w-8" />
                      ) : (
                        <span className="font-medium">{impact?.reviews_left || 0}</span>
                      )}
                    </div>
                    <div className="flex justify-between text-sm" suppressHydrationWarning>
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
                    <div className="flex justify-between text-sm" suppressHydrationWarning>
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
                    <div className="text-center" suppressHydrationWarning>
                      {pulseLoading ? (
                        <Skeleton className="h-10 w-24 mx-auto mb-1" />
                      ) : (
                        <div className="text-3xl font-bold gradient-text mb-1">
                          {(communityImpact?.pulseScore || 0).toLocaleString()}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Community Pulse Score
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs" suppressHydrationWarning>
                        <span className="text-muted-foreground">
                          Total Dollars Kept Local
                        </span>
                        {pulseLoading ? (
                          <Skeleton className="h-4 w-16" />
                        ) : (
                          <span>${Math.round(communityImpact?.totalDollarsKeptLocal || 0).toLocaleString()}</span>
                        )}
                      </div>
                      <div className="flex justify-between text-xs" suppressHydrationWarning>
                        <span className="text-muted-foreground">
                          Businesses Supported
                        </span>
                        {pulseLoading ? (
                          <Skeleton className="h-4 w-12" />
                        ) : (
                          <span>{(communityImpact?.totalBusinessesSupported || 0).toLocaleString()}</span>
                        )}
                      </div>
                      <div className="flex justify-between text-xs" suppressHydrationWarning>
                        <span className="text-muted-foreground">Active Members</span>
                        {pulseLoading ? (
                          <Skeleton className="h-4 w-12" />
                        ) : (
                          <span>{formatCompactCount(communityImpact?.activeUsers || 0)}</span>
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

              {/* Business Spotlight */}
              <AnimatedSection animation="fade-up" delay={0.4}>
                <Card className="mt-6 bg-gradient-to-br from-chart-2/5 to-primary/5">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Star className="h-4 w-4 text-chart-5" />
                      Business Spotlight
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {featuredBusiness ? (
                      <>
                        <div className="h-24 bg-gradient-to-br from-primary/10 to-chart-2/10 rounded-lg flex items-center justify-center text-4xl mb-3">
                          {featuredBusiness.category?.icon || "🏪"}
                        </div>
                        <h4 className="font-semibold mb-1">{featuredBusiness.name}</h4>
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                          {featuredBusiness.short_description ||
                            featuredBusiness.description ||
                            (featuredBusiness.category
                              ? `${featuredBusiness.category.name} in your local community`
                              : "Popular local business in your area")}
                        </p>
                        <NavLink href={`/business/${featuredBusiness.id}`}>
                          <Button variant="outline" size="sm" className="w-full">
                            View Business
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </NavLink>
                      </>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        Discover amazing local businesses in your area!
                      </div>
                    )}
                  </CardContent>
                </Card>
              </AnimatedSection>
            </div>
          </div>
        </div>
      </div>

      <ImpactReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        userId={userId}
        userName={userName}
      />
    </div>
  );
}
