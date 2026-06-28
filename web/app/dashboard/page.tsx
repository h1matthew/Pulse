"use client";

import { useState, useEffect, useMemo } from "react";
import {
  DollarSign,
  Store,
  Users,
  MapPin,
  ArrowRight,
  FileText,
  Loader2,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
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
import { Separator } from "@/components/ui/separator";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { NavLink } from "@/components/ui/nav-link";
import { useUserImpact, useImpactDisplay, useCommunityPulse } from "@/hooks/useImpact";
import { useMissionProgressDetails } from "@/hooks/useMissions";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useHydrationSafeQuery } from "@/hooks/useHydrationSafeQuery";
import { useBusinesses } from "@/hooks/useBusinesses";
import type { BusinessWithCategory } from "@/types/business";

const SPOTLIGHT_LOCATION = { lat: 34.0286, lng: -117.8208 };
const SPOTLIGHT_RADIUS = 10000;

async function fetchRecentActivity() {
  const response = await fetch('/api/activity');
  if (!response.ok) throw new Error('Failed to fetch activity');
  return response.json();
}

async function fetchSpotlightBusinesses(): Promise<BusinessWithCategory[]> {
  const params = new URLSearchParams({
    lat: SPOTLIGHT_LOCATION.lat.toString(),
    lng: SPOTLIGHT_LOCATION.lng.toString(),
    radius: SPOTLIGHT_RADIUS.toString(),
  });
  const response = await fetch(`/api/businesses/nearby?${params.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch spotlight businesses");
  return response.json();
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

const engagementConfig = {
  checkins: { label: "Check-ins", color: "var(--chart-1)" },
  reviews: { label: "Reviews", color: "var(--chart-2)" },
  deals: { label: "Deals", color: "var(--chart-3)" },
  missions: { label: "Missions", color: "var(--chart-4)" },
} satisfies ChartConfig;

const radarConfig = {
  score: { label: "Score", color: "var(--chart-1)" },
} satisfies ChartConfig;

const tierConfig = {
  value: { label: "Progress", color: "var(--chart-1)" },
} satisfies ChartConfig;

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
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
  const { data: spotlightBusinesses } = useHydrationSafeQuery({
    queryKey: ['dashboard', 'spotlight', 'nearby'],
    queryFn: fetchSpotlightBusinesses,
    staleTime: 5 * 60 * 1000,
  });
  const { data: featuredBusinessData } = useBusinesses({ sortBy: 'review_count' }, 1, 12);

  const featuredBusiness = useMemo(() => {
    const nearby = spotlightBusinesses || [];
    const list = featuredBusinessData?.businesses || [];
    const businesses = nearby.length > 0 ? nearby : list;
    return [...businesses]
      .filter((b) => {
        const photo = Array.isArray(b.photos) ? b.photos[0] : null;
        return b.data_source === 'google' && !!b.place_id && typeof photo === 'string' && photo.startsWith('http') && (b.review_count || 0) >= 10;
      })
      .sort((a, b) => {
        const sa = (a.average_rating || 0) * Math.log10(Math.max(a.review_count || 1, 1));
        const sb = (b.average_rating || 0) * Math.log10(Math.max(b.review_count || 1, 1));
        return sb - sa;
      })[0] || businesses[0];
  }, [spotlightBusinesses, featuredBusinessData?.businesses]);

  const impactScore = impact
    ? Math.floor(
        Number(impact.estimated_dollars_kept_local) / 10 +
        impact.total_check_ins * 5 +
        impact.reviews_left * 25 +
        impact.missions_completed * 100
      )
    : 0;

  const tierProgress = impactDisplay?.nextTierProgress != null
    ? Math.round(impactDisplay.nextTierProgress * 100)
    : 0;

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
    const pct = (v: number, m: number) => Math.round((v / Math.max(v, m)) * 100);
    return [
      { metric: "Check-ins", score: pct(impact.total_check_ins, 10) },
      { metric: "Reviews", score: pct(impact.reviews_left, 5) },
      { metric: "Deals", score: pct(impact.deals_claimed, 5) },
      { metric: "Missions", score: pct(impact.missions_completed, 3) },
      { metric: "Impact $", score: pct(Number(impact.estimated_dollars_kept_local), 100) },
    ];
  }, [impact]);

  const communityData = useMemo(() => {
    const cp = communityPulse;
    if (cp && (Number(cp.pulse_score || 0) > 0 || Number(cp.total_dollars_kept_local || 0) > 0)) {
      return {
        score: Number(cp.pulse_score || 0),
        dollars: Number(cp.total_dollars_kept_local || 0),
        businesses: Number(cp.total_businesses_supported || 0),
        users: Number(cp.active_users || 0),
      };
    }
    if (!impact) return null;
    const d = Number(impact.estimated_dollars_kept_local || 0);
    if (d === 0 && impact.businesses_supported === 0) return null;
    return { score: impactScore, dollars: d, businesses: impact.businesses_supported, users: 1 };
  }, [communityPulse, impact, impactScore]);

  if (authLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex min-h-[60vh] items-center justify-center pt-14">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <Header />

      <div className="mx-auto max-w-6xl px-6 pb-12 pt-20">
        <div className="mb-6 flex items-end justify-between border-b border-border pb-4">
          <div>
            <h1 className="text-lg font-semibold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {impact && Number(impact.estimated_dollars_kept_local) > 0
                ? `$${Math.round(Number(impact.estimated_dollars_kept_local)).toLocaleString()} kept local`
                : `Welcome, ${userName}`}
            </p>
          </div>
          <Button onClick={() => setReportOpen(true)} variant="outline" size="sm">
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Export
          </Button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Dollars local", value: `$${Math.round(Number(impact?.estimated_dollars_kept_local || 0)).toLocaleString()}`, icon: DollarSign },
            { label: "Businesses", value: String(impact?.businesses_supported || 0), icon: Store },
            { label: "Jobs impacted", value: String(impact?.jobs_impacted_estimate || 0), icon: Users },
            { label: "Check-ins", value: String(impact?.total_check_ins || 0), icon: MapPin },
          ].map((m) => (
            <div key={m.label} className="rounded-lg border border-border bg-card p-3">
              {impactLoading ? <Skeleton className="mb-1 h-6 w-16" /> : (
                <div className="text-lg font-semibold tabular-nums">{m.value}</div>
              )}
              <div className="text-xs text-muted-foreground">{m.label}</div>
            </div>
          ))}
        </div>

        <div className="mb-6 grid gap-3 lg:grid-cols-[1fr_260px]">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Impact score</CardDescription>
              <div className="flex items-baseline gap-2">
                {impactLoading ? <Skeleton className="h-10 w-28" /> : (
                  <CardTitle className="text-4xl font-bold tabular-nums">{impactScore.toLocaleString()}</CardTitle>
                )}
                {!impactLoading && impact?.community_rank && (
                  <span className="text-xs text-muted-foreground">Rank #{impact.community_rank}</span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                <span>{impact?.reviews_left || 0} reviews</span>
                <span>{impact?.missions_completed || 0} missions</span>
                <span>{impact?.deals_claimed || 0} deals</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-0">
              <CardDescription>Tier</CardDescription>
              <CardTitle className="text-base">{impactDisplay?.tier?.name || "Getting Started"}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center pb-2">
              <ChartContainer config={tierConfig} className="mx-auto aspect-square h-[140px]">
                <RadialBarChart
                  data={[{ name: "progress", value: tierProgress, fill: "var(--chart-1)" }]}
                  startAngle={90}
                  endAngle={90 - (360 * tierProgress / 100)}
                  innerRadius={50}
                  outerRadius={66}
                >
                  <RadialBar dataKey="value" background cornerRadius={4} />
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-xl font-semibold">
                    {tierProgress}%
                  </text>
                </RadialBarChart>
              </ChartContainer>
            </CardContent>
            <CardFooter className="justify-center pt-0 text-xs text-muted-foreground">
              {impactDisplay?.nextTier ? `Next: ${impactDisplay.nextTier.name}` : "Top tier"}
            </CardFooter>
          </Card>
        </div>

        <div className="mb-6 grid gap-3 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-sm">Engagement</CardTitle></CardHeader>
            <CardContent>
              {impactLoading ? <Skeleton className="h-[180px] w-full" /> : (
                <ChartContainer config={engagementConfig} className="h-[180px] w-full">
                  <BarChart data={engagementData} layout="vertical" margin={{ left: 12 }}>
                    <CartesianGrid horizontal={false} />
                    <YAxis dataKey="category" type="category" tickLine={false} axisLine={false} width={72} />
                    <XAxis type="number" hide />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Profile</CardTitle></CardHeader>
            <CardContent>
              {impactLoading ? <Skeleton className="h-[180px] w-full" /> : (
                <ChartContainer config={radarConfig} className="h-[180px] w-full">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Radar dataKey="score" fill="var(--chart-1)" fillOpacity={0.2} stroke="var(--chart-1)" strokeWidth={1.5} />
                  </RadarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Active missions</CardTitle>
                <NavLink href="/missions">
                  <Button variant="ghost" size="sm" className="h-7 text-xs">All <ArrowRight className="ml-1 h-3 w-3" /></Button>
                </NavLink>
              </CardHeader>
              <CardContent className="space-y-2">
                {missionsLoading ? (
                  <><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></>
                ) : activeMissions.length > 0 ? (
                  activeMissions.slice(0, 3).map((m) => (
                    <div key={m.progress.id} className="flex items-center gap-3 rounded-md border border-border p-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="truncate font-medium">{m.progress.mission.title}</span>
                          <span className="ml-2 text-xs tabular-nums text-muted-foreground">{m.progress.current_count}/{m.progress.mission.target_count}</span>
                        </div>
                        <Progress value={m.percentageComplete} className="mt-1.5 h-1" />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">No active missions</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Recent activity</CardTitle></CardHeader>
              <CardContent>
                {activityLoading ? (
                  <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
                ) : recentActivity && recentActivity.length > 0 ? (
                  <div>
                    {recentActivity.map((a: { id: string; type: string; business: string; time: string; impact: number }) => (
                      <div key={a.id} className="flex items-center justify-between border-b border-border py-2.5 last:border-0">
                        <div>
                          <span className="text-sm">
                            {a.type === "check_in" && "Checked in at "}
                            {a.type === "review" && "Reviewed "}
                            {a.type === "bookmark" && "Bookmarked "}
                            {a.type === "deal_claimed" && "Claimed deal at "}
                            <span className="font-medium">{a.business}</span>
                          </span>
                          <div className="text-xs text-muted-foreground">{a.time}</div>
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">+{a.impact}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">No recent activity</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            <Card>
              <CardHeader><CardTitle className="text-sm">Community</CardTitle></CardHeader>
              <CardContent>
                <div className="mb-3 text-center" suppressHydrationWarning>
                  {pulseLoading ? <Skeleton className="mx-auto mb-1 h-8 w-20" /> : (
                    <div className="text-2xl font-semibold tabular-nums">{(communityData?.score || 0).toLocaleString()}</div>
                  )}
                  <p className="text-xs text-muted-foreground">Pulse score</p>
                </div>
                <Separator className="my-2" />
                <div className="space-y-1.5">
                  {[
                    { label: "Dollars local", value: `$${Math.round(communityData?.dollars || 0).toLocaleString()}` },
                    { label: "Businesses", value: (communityData?.businesses || 0).toLocaleString() },
                    { label: "Members", value: formatCompact(communityData?.users || 0) },
                  ].map((s) => (
                    <div key={s.label} className="flex justify-between text-xs" suppressHydrationWarning>
                      <span className="text-muted-foreground">{s.label}</span>
                      {pulseLoading ? <Skeleton className="h-3.5 w-12" /> : <span>{s.value}</span>}
                    </div>
                  ))}
                </div>
                <NavLink href="/leaderboard">
                  <Button variant="outline" className="mt-3 w-full" size="sm">Leaderboard</Button>
                </NavLink>
              </CardContent>
            </Card>

            {featuredBusiness && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Spotlight</CardTitle></CardHeader>
                <CardContent>
                  {(() => {
                    const photo = Array.isArray(featuredBusiness.photos) ? featuredBusiness.photos[0] : null;
                    const url = typeof photo === 'string' && photo.startsWith('http') ? photo : null;
                    return url ? (
                      <div className="mb-2 h-28 overflow-hidden rounded-md">
                        <img src={url} alt={featuredBusiness.name} className="h-full w-full object-cover" />
                      </div>
                    ) : null;
                  })()}
                  <h4 className="text-sm font-medium">{featuredBusiness.name}</h4>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {featuredBusiness.short_description || featuredBusiness.description || featuredBusiness.category?.name || "Local business"}
                  </p>
                  <NavLink href={`/business/${featuredBusiness.id}`}>
                    <Button variant="outline" size="sm" className="mt-2 w-full">View</Button>
                  </NavLink>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <ImpactReportDialog open={reportOpen} onOpenChange={setReportOpen} userId={userId} userName={userName} />
    </div>
  );
}
