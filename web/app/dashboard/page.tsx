"use client";

import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  DollarSign,
  Store,
  Users,
  Star,
  Zap,
  Target,
  Award,
  Loader2,
  Heart,
  MapPin,
  ArrowRight,
  FileText,
  BarChart3,
  Activity,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from "recharts";
import { ImpactReportDialog } from "@/components/features/dashboard/ImpactReport";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { AnimatedSection } from "@/components/features/home/AnimatedSection";
import { NavLink } from "@/components/ui/nav-link";
import { useUserImpact, useImpactDisplay, useCommunityPulse } from "@/hooks/useImpact";
import { useMissionProgressDetails } from "@/hooks/useMissions";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useHydrationSafeQuery } from "@/hooks/useHydrationSafeQuery";
import { useBusinesses } from "@/hooks/useBusinesses";
import type { BusinessWithCategory } from "@/types/business";

const DASHBOARD_SPOTLIGHT_LOCATION = { lat: 29.4187, lng: -98.4842 };
const DASHBOARD_SPOTLIGHT_RADIUS_METERS = 10000;

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

// Chart configs
const impactAreaChartConfig = {
  dollars: { label: "Dollars Local", color: "var(--chart-1)" },
  jobs: { label: "Jobs Impacted", color: "var(--chart-2)" },
} satisfies ChartConfig;

const engagementBarChartConfig = {
  checkins: { label: "Check-ins", color: "var(--chart-1)" },
  reviews: { label: "Reviews", color: "var(--chart-2)" },
  deals: { label: "Deals", color: "var(--chart-3)" },
  missions: { label: "Missions", color: "var(--chart-4)" },
} satisfies ChartConfig;

const radarChartConfig = {
  score: { label: "Your Score", color: "var(--chart-1)" },
} satisfies ChartConfig;

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  const userId = user?.id || '';
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Friend';

  const { data: impact, isLoading: impactLoading } = useUserImpact(userId);
  const impactDisplay = useImpactDisplay(userId);
  const { data: communityPulse, isLoading: pulseLoading } = useCommunityPulse(userId);
  const { activeMissions, isLoading: missionsLoading } = useMissionProgressDetails(userId);
  const { data: recentActivity, isLoading: activityLoading } = useHydrationSafeQuery({
    queryKey: ['activity'],
    queryFn: fetchRecentActivity,
    enabled: !!userId,
  });
  const { data: spotlightNearbyBusinesses } = useHydrationSafeQuery({
    queryKey: ['dashboard', 'spotlight', 'nearby'],
    queryFn: fetchSpotlightBusinesses,
    staleTime: 5 * 60 * 1000,
  });

  const { data: featuredBusinessData } = useBusinesses({ sortBy: 'review_count' }, 1, 12);
  const featuredBusiness = useMemo(() => {
    const nearbyBusinesses = spotlightNearbyBusinesses || [];
    const listBusinesses = featuredBusinessData?.businesses || [];
    const businesses = nearbyBusinesses.length > 0 ? nearbyBusinesses : listBusinesses;
    const bestBusiness = [...businesses]
      .filter((b) => {
        const photo = Array.isArray(b.photos) ? b.photos[0] : null
        const hasPhoto = typeof photo === 'string' && photo.startsWith('http')
        return b.data_source === 'google' && !!b.place_id && hasPhoto && (b.review_count || 0) >= 10
      })
      .sort((a, b) => {
        const scoreA = (a.average_rating || 0) * Math.log10(Math.max(a.review_count || 1, 1))
        const scoreB = (b.average_rating || 0) * Math.log10(Math.max(b.review_count || 1, 1))
        return scoreB - scoreA
      })[0]
    if (bestBusiness) return bestBusiness;
    return businesses[0];
  }, [spotlightNearbyBusinesses, featuredBusinessData?.businesses]);

  const impactScore = impact
    ? Math.floor(
        Number(impact.estimated_dollars_kept_local) / 10 +
        impact.total_check_ins * 5 +
        impact.reviews_left * 25 +
        impact.missions_completed * 100
      )
    : 0;

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
      userDollars > 0 || userBusinesses > 0 || userReviews > 0 || userMissions > 0 || userCheckIns > 0;
    if (!hasAnyImpact) return null;
    return {
      pulseScore: impactScore,
      totalDollarsKeptLocal: userDollars,
      totalBusinessesSupported: userBusinesses,
      activeUsers: 1,
    };
  }, [communityPulse, impact, impactScore]);

  // Build chart data from impact metrics
  const engagementData = useMemo(() => {
    if (!impact) return [];
    return [
      { category: "Check-ins", value: impact.total_check_ins, fill: "var(--chart-1)" },
      { category: "Reviews", value: impact.reviews_left, fill: "var(--chart-2)" },
      { category: "Deals", value: impact.deals_claimed, fill: "var(--chart-3)" },
      { category: "Missions", value: impact.missions_completed, fill: "var(--chart-4)" },
    ];
  }, [impact]);

  const radarData = useMemo(() => {
    if (!impact) return [];
    const maxCheckins = Math.max(impact.total_check_ins, 10);
    const maxReviews = Math.max(impact.reviews_left, 5);
    const maxDeals = Math.max(impact.deals_claimed, 5);
    const maxMissions = Math.max(impact.missions_completed, 3);
    const maxDollars = Math.max(Number(impact.estimated_dollars_kept_local), 100);
    return [
      { metric: "Check-ins", score: Math.round((impact.total_check_ins / maxCheckins) * 100) },
      { metric: "Reviews", score: Math.round((impact.reviews_left / maxReviews) * 100) },
      { metric: "Deals", score: Math.round((impact.deals_claimed / maxDeals) * 100) },
      { metric: "Missions", score: Math.round((impact.missions_completed / maxMissions) * 100) },
      { metric: "Impact $", score: Math.round((Number(impact.estimated_dollars_kept_local) / maxDollars) * 100) },
    ];
  }, [impact]);

  const tierProgressData = useMemo(() => {
    return [{ name: "progress", value: nextTierProgress, fill: "var(--chart-1)" }];
  }, [nextTierProgress]);

  const tierProgressConfig = {
    value: { label: "Progress", color: "var(--chart-1)" },
  } satisfies ChartConfig;

  if (authLoading) {
    return (
      <div className="relative min-h-screen">
        <Header />
        <div className="pt-28 pb-12 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relative min-h-screen">
      <Header />

      <div className="pt-28 pb-12">
        <div className="mx-auto max-w-7xl px-6">
          {/* Hero */}
          <AnimatedSection animation="fade-up">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-3">
                  <Activity className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Your Impact Dashboard</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Welcome back, {userName}
                </h1>
                <p className="text-muted-foreground mt-1 max-w-xl">
                  {impact && Number(impact.estimated_dollars_kept_local) > 0 ? (
                    <>
                      You&apos;ve kept <span className="font-semibold text-primary">${Math.round(Number(impact.estimated_dollars_kept_local)).toLocaleString()}</span> in your community.
                    </>
                  ) : (
                    "Start your journey to support local businesses."
                  )}
                </p>
              </div>
              <Button onClick={() => setReportOpen(true)} variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </AnimatedSection>

          {/* Score + Tier Progress Card */}
          <AnimatedSection animation="fade-up" delay={0.1}>
            <div className="grid gap-6 lg:grid-cols-[1fr_300px] mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Impact Score</CardDescription>
                  <div className="flex items-baseline gap-3">
                    {impactLoading ? (
                      <Skeleton className="h-12 w-32" />
                    ) : (
                      <CardTitle className="text-5xl font-bold tabular-nums gradient-text">
                        {impactScore.toLocaleString()}
                      </CardTitle>
                    )}
                    {!impactLoading && impact?.community_rank && (
                      <Badge variant="secondary" className="gap-1">
                        <Award className="h-3 w-3" />
                        Rank #{impact.community_rank}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5 text-chart-1" />
                        Dollars Local
                      </p>
                      {impactLoading ? (
                        <Skeleton className="h-7 w-20" />
                      ) : (
                        <p className="text-2xl font-semibold tabular-nums">
                          ${Math.round(Number(impact?.estimated_dollars_kept_local || 0)).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Store className="h-3.5 w-3.5 text-chart-2" />
                        Businesses
                      </p>
                      {impactLoading ? (
                        <Skeleton className="h-7 w-12" />
                      ) : (
                        <p className="text-2xl font-semibold tabular-nums">
                          {impact?.businesses_supported || 0}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-chart-3" />
                        Jobs Impacted
                      </p>
                      {impactLoading ? (
                        <Skeleton className="h-7 w-12" />
                      ) : (
                        <p className="text-2xl font-semibold tabular-nums">
                          {impact?.jobs_impacted_estimate || 0}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-chart-4" />
                        Check-ins
                      </p>
                      {impactLoading ? (
                        <Skeleton className="h-7 w-12" />
                      ) : (
                        <p className="text-2xl font-semibold tabular-nums">
                          {impact?.total_check_ins || 0}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Radial tier progress */}
              <Card>
                <CardHeader className="pb-0">
                  <CardDescription>Tier Progress</CardDescription>
                  <CardTitle className="text-lg">
                    {impactDisplay?.tier?.name || "Getting Started"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center pb-2">
                  <ChartContainer config={tierProgressConfig} className="mx-auto aspect-square h-[160px]">
                    <RadialBarChart
                      data={tierProgressData}
                      startAngle={90}
                      endAngle={90 - (360 * nextTierProgress / 100)}
                      innerRadius={60}
                      outerRadius={80}
                    >
                      <PolarGrid
                        gridType="circle"
                        radialLines={false}
                        stroke="none"
                        className="first:fill-muted last:fill-background"
                        polarRadius={[64, 56]}
                      />
                      <RadialBar dataKey="value" background cornerRadius={10} />
                      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-2xl font-bold">
                        {nextTierProgress}%
                      </text>
                    </RadialBarChart>
                  </ChartContainer>
                </CardContent>
                <CardFooter className="text-center text-xs text-muted-foreground pt-0">
                  {impactDisplay?.nextTier ? (
                    <p className="w-full">Next: {impactDisplay.nextTier.name}</p>
                  ) : (
                    <p className="w-full">Top tier reached!</p>
                  )}
                </CardFooter>
              </Card>
            </div>
          </AnimatedSection>

          {/* Charts Row */}
          <AnimatedSection animation="fade-up" delay={0.15}>
            <div className="grid gap-6 lg:grid-cols-2 mb-8">
              {/* Engagement Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Engagement Breakdown
                  </CardTitle>
                  <CardDescription>Your activity across all categories</CardDescription>
                </CardHeader>
                <CardContent>
                  {impactLoading ? (
                    <Skeleton className="h-[200px] w-full" />
                  ) : (
                    <ChartContainer config={engagementBarChartConfig} className="h-[200px] w-full">
                      <BarChart data={engagementData} layout="vertical" margin={{ left: 16 }}>
                        <CartesianGrid horizontal={false} />
                        <YAxis dataKey="category" type="category" tickLine={false} axisLine={false} width={80} />
                        <XAxis type="number" hide />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              {/* Impact Radar */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Impact Profile
                  </CardTitle>
                  <CardDescription>Relative strength across impact areas</CardDescription>
                </CardHeader>
                <CardContent>
                  {impactLoading ? (
                    <Skeleton className="h-[200px] w-full" />
                  ) : (
                    <ChartContainer config={radarChartConfig} className="h-[200px] w-full">
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Radar dataKey="score" fill="var(--chart-1)" fillOpacity={0.25} stroke="var(--chart-1)" strokeWidth={2} />
                      </RadarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </AnimatedSection>

          {/* Bottom section: Missions + Sidebar */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Active Missions */}
              <AnimatedSection animation="fade-up" delay={0.2}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Zap className="h-4 w-4 text-chart-3" />
                        Active Missions
                      </CardTitle>
                      <CardDescription>Complete missions to earn rewards</CardDescription>
                    </div>
                    <NavLink href="/missions">
                      <Button variant="ghost" size="sm">
                        View All <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </NavLink>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {missionsLoading ? (
                      <>
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                      </>
                    ) : activeMissions.length > 0 ? (
                      activeMissions.slice(0, 3).map((mission) => (
                        <div
                          key={mission.progress.id}
                          className="flex items-center gap-4 rounded-lg border p-4"
                        >
                          <div className="text-2xl">🎯</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium text-sm truncate">{mission.progress.mission.title}</h4>
                              <span className="text-xs text-muted-foreground tabular-nums ml-2">
                                {mission.progress.current_count}/{mission.progress.mission.target_count}
                              </span>
                            </div>
                            <Progress value={mission.percentageComplete} className="h-1.5" />
                            <p className="text-xs text-muted-foreground mt-1.5">
                              {mission.progress.mission.reward_description}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <p className="text-sm">No active missions</p>
                        <NavLink href="/missions">
                          <Button variant="outline" size="sm" className="mt-3">
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
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {activityLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-14 w-full" />
                        <Skeleton className="h-14 w-full" />
                        <Skeleton className="h-14 w-full" />
                      </div>
                    ) : recentActivity && recentActivity.length > 0 ? (
                      <div className="space-y-1">
                        {recentActivity.map((activity: { id: string; type: string; business: string; time: string; impact: number }) => (
                          <div
                            key={activity.id}
                            className="flex items-center justify-between py-3 border-b last:border-0"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                activity.type === "check_in" ? "bg-chart-1/10" :
                                activity.type === "review" ? "bg-chart-4/10" :
                                activity.type === "bookmark" ? "bg-chart-5/10" : "bg-chart-2/10"
                              }`}>
                                {activity.type === "check_in" && <TrendingUp className="h-4 w-4 text-chart-1" />}
                                {activity.type === "review" && <Star className="h-4 w-4 text-chart-4" />}
                                {activity.type === "bookmark" && <Store className="h-4 w-4 text-chart-5" />}
                                {activity.type === "deal_claimed" && <DollarSign className="h-4 w-4 text-chart-2" />}
                              </div>
                              <div>
                                <p className="text-sm font-medium">
                                  {activity.type === "check_in" && "Checked in at "}
                                  {activity.type === "review" && "Reviewed "}
                                  {activity.type === "bookmark" && "Bookmarked "}
                                  {activity.type === "deal_claimed" && "Claimed deal at "}
                                  <span className="text-primary">{activity.business}</span>
                                </p>
                                <p className="text-xs text-muted-foreground">{activity.time}</p>
                              </div>
                            </div>
                            <Badge variant="secondary" className="tabular-nums">
                              +{activity.impact} pts
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <p className="text-sm">No recent activity</p>
                        <p className="text-xs mt-1">Start exploring local businesses!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </AnimatedSection>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <AnimatedSection animation="fade-up" delay={0.3}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: "Reviews Left", value: impact?.reviews_left || 0 },
                      { label: "Missions Completed", value: impact?.missions_completed || 0 },
                      { label: "Deals Claimed", value: impact?.deals_claimed || 0 },
                    ].map((stat) => (
                      <div key={stat.label} className="flex justify-between text-sm" suppressHydrationWarning>
                        <span className="text-muted-foreground">{stat.label}</span>
                        {impactLoading ? (
                          <Skeleton className="h-4 w-8" />
                        ) : (
                          <span className="font-medium tabular-nums">{stat.value}</span>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </AnimatedSection>

              {/* Community Impact */}
              <AnimatedSection animation="fade-up" delay={0.35}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Community Impact</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center mb-4" suppressHydrationWarning>
                      {pulseLoading ? (
                        <Skeleton className="h-10 w-24 mx-auto mb-1" />
                      ) : (
                        <div className="text-3xl font-bold gradient-text mb-1">
                          {(communityImpact?.pulseScore || 0).toLocaleString()}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">Community Pulse Score</p>
                    </div>
                    <Separator className="my-3" />
                    <div className="space-y-2">
                      {[
                        { label: "Dollars Kept Local", value: `$${Math.round(communityImpact?.totalDollarsKeptLocal || 0).toLocaleString()}` },
                        { label: "Businesses Supported", value: (communityImpact?.totalBusinessesSupported || 0).toLocaleString() },
                        { label: "Active Members", value: formatCompactCount(communityImpact?.activeUsers || 0) },
                      ].map((stat) => (
                        <div key={stat.label} className="flex justify-between text-xs" suppressHydrationWarning>
                          <span className="text-muted-foreground">{stat.label}</span>
                          {pulseLoading ? <Skeleton className="h-4 w-16" /> : <span>{stat.value}</span>}
                        </div>
                      ))}
                    </div>
                    <NavLink href="/leaderboard">
                      <Button variant="outline" className="w-full mt-4" size="sm">
                        View Leaderboard
                      </Button>
                    </NavLink>
                  </CardContent>
                </Card>
              </AnimatedSection>

              {/* Business Spotlight */}
              <AnimatedSection animation="fade-up" delay={0.4}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Star className="h-4 w-4 text-chart-5" />
                      Spotlight
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {featuredBusiness ? (
                      <>
                        {(() => {
                          const photo = Array.isArray(featuredBusiness.photos) ? featuredBusiness.photos[0] : null
                          const photoUrl = typeof photo === 'string' && photo.startsWith('http') ? photo : null
                          return photoUrl ? (
                            <div className="h-36 rounded-lg overflow-hidden mb-3">
                              <img src={photoUrl} alt={featuredBusiness.name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="h-20 bg-gradient-to-br from-primary/10 to-chart-2/10 rounded-lg flex items-center justify-center text-3xl mb-3">
                              {featuredBusiness.category?.icon || "🏪"}
                            </div>
                          )
                        })()}
                        <h4 className="font-semibold text-sm mb-1">{featuredBusiness.name}</h4>
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                          {featuredBusiness.short_description ||
                            featuredBusiness.description ||
                            (featuredBusiness.category
                              ? `${featuredBusiness.category.name} in your area`
                              : "Popular local business")}
                        </p>
                        <NavLink href={`/business/${featuredBusiness.id}`}>
                          <Button variant="outline" size="sm" className="w-full">
                            View Business
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </NavLink>
                      </>
                    ) : (
                      <p className="text-center py-4 text-muted-foreground text-sm">
                        Discover amazing local businesses!
                      </p>
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
