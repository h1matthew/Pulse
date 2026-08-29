"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, ArrowRight, FileText } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { ImpactReportDialog } from "@/components/features/dashboard/ImpactReport";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
import type { ImpactReportData, ReportBusiness } from "@/lib/report-generator";

const DASHBOARD_SPOTLIGHT_LOCATION = { lat: 29.4187, lng: -98.4842 };
const DASHBOARD_SPOTLIGHT_RADIUS_METERS = 10000;

/**
 * Share of local spend that stays in the local economy. Same constant the
 * impact report API applies server-side (LOCAL_ECONOMIC_MULTIPLIER).
 */
const LOCAL_SHARE = 0.68;

async function fetchRecentActivity() {
  const response = await fetch('/api/activity');
  if (!response.ok) throw new Error('Failed to fetch activity');
  return response.json();
}

async function fetchImpactReport(): Promise<ImpactReportData> {
  const to = new Date().toISOString().split('T')[0];
  const response = await fetch(`/api/impact/report?to=${to}`);
  if (!response.ok) throw new Error('Failed to fetch impact report');
  return response.json();
}

const currency = (value: number) => `$${Math.round(value).toLocaleString()}`;

/** Ledger rows, oldest first, so the running total accumulates downward. */
function buildLedger(businesses: ReportBusiness[]) {
  const ordered = [...businesses].sort(
    (a, b) => new Date(a.lastVisit).getTime() - new Date(b.lastVisit).getTime()
  );
  let running = 0;
  return ordered.map((entry) => {
    const kept = entry.totalSpent * LOCAL_SHARE;
    running += kept;
    return { ...entry, kept, running };
  });
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

const engagementBarChartConfig = {
  checkins: { label: "Check-ins", color: "var(--chart-1)" },
  reviews: { label: "Reviews", color: "var(--chart-2)" },
  deals: { label: "Deals", color: "var(--chart-3)" },
  missions: { label: "Missions", color: "var(--chart-4)" },
} satisfies ChartConfig;

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      let cancelled = false;
      const verify = async () => {
        const supabase = (await import('@/lib/supabase/client')).createClient();
        const { data: { user: freshUser } } = await supabase.auth.getUser();
        if (!cancelled && !freshUser) {
          router.replace('/login');
        }
      };
      const timer = setTimeout(verify, 500);
      return () => { cancelled = true; clearTimeout(timer); };
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
  const { data: report, isLoading: reportLoading } = useHydrationSafeQuery({
    queryKey: ['impact', 'report', 'ledger'],
    queryFn: fetchImpactReport,
    enabled: !!userId,
  });

  const ledger = useMemo(() => buildLedger(report?.businesses ?? []), [report]);
  const ledgerSpend = ledger.reduce((sum, row) => sum + row.totalSpent, 0);
  const ledgerKept = ledger.length > 0 ? ledger[ledger.length - 1].running : 0;

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
        <div className="mx-auto max-w-6xl px-6">
          {/* Header */}
          <AnimatedSection animation="fade-up">
            <div className="mb-5 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-h2 font-medium">Welcome back, {userName}</h1>
                <p className="mt-1.5 text-small text-muted-foreground">
                  {impact && Number(impact.estimated_dollars_kept_local) > 0
                    ? `Every check-in below is a receipt you filed. ${LOCAL_SHARE * 100}% of what you spent at an independent stays in the local economy.`
                    : "Check in with a receipt at a local business to open your ledger."}
                </p>
                {!impactLoading && (
                  <p className="mt-3 flex flex-wrap items-baseline gap-x-1.5 font-mono text-meta tabular-nums text-text-tertiary">
                    <span>{impactScore.toLocaleString()} pts</span>
                    {impact?.community_rank && (
                      <>
                        <span aria-hidden="true">&middot;</span>
                        <span>rank #{impact.community_rank}</span>
                      </>
                    )}
                    <span aria-hidden="true">&middot;</span>
                    <span>{impact?.businesses_supported || 0} businesses</span>
                    <span aria-hidden="true">&middot;</span>
                    <span>{impact?.total_check_ins || 0} check-ins</span>
                    <span aria-hidden="true">&middot;</span>
                    <span>{impactDisplay?.tier?.name || "Getting Started"}</span>
                  </p>
                )}
              </div>
              <Button onClick={() => setReportOpen(true)} variant="outline" size="sm">
                <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                Export Report
              </Button>
            </div>
          </AnimatedSection>

          {/* Local-spend ledger — auditable rows, not a hero counter */}
          <AnimatedSection animation="fade-up" delay={0.1}>
            <section aria-labelledby="ledger-heading" className="mb-8">
              <div className="mb-3 flex items-baseline justify-between gap-4">
                <h2 id="ledger-heading" className="text-h3 font-medium">
                  Local spend ledger
                </h2>
                <p className="font-mono text-meta text-text-tertiary">
                  All time &middot; {LOCAL_SHARE * 100}% retained
                </p>
              </div>

              {reportLoading ? (
                <div className="divide-y divide-border border-y border-border">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="my-3 h-4 w-full" />
                  ))}
                </div>
              ) : ledger.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[36rem] border-collapse text-small">
                    <thead>
                      <tr className="border-y border-border text-left font-mono text-meta text-text-tertiary">
                        <th scope="col" className="py-2 pr-3 font-normal">Last visit</th>
                        <th scope="col" className="py-2 pr-3 font-normal">Business</th>
                        <th scope="col" className="py-2 pr-3 text-right font-normal">Visits</th>
                        <th scope="col" className="py-2 pr-3 text-right font-normal">Spend</th>
                        <th scope="col" className="py-2 pr-3 text-right font-normal">Retained</th>
                        <th scope="col" className="py-2 text-right font-normal">Running total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {ledger.map((row) => (
                        <tr key={`${row.name}-${row.lastVisit}`} className="card-lift">
                          <td className="py-2 pr-3 font-mono text-meta tabular-nums text-text-tertiary">
                            {new Date(row.lastVisit).toLocaleDateString()}
                          </td>
                          <td className="py-2 pr-3">
                            <span className="text-foreground">{row.name}</span>
                            <span className="ml-2 font-mono text-meta text-text-tertiary">{row.category}</span>
                          </td>
                          <td className="py-2 pr-3 text-right font-mono text-meta tabular-nums">{row.checkIns}</td>
                          <td className="py-2 pr-3 text-right font-mono tabular-nums">{currency(row.totalSpent)}</td>
                          <td className="py-2 pr-3 text-right font-mono tabular-nums">{currency(row.kept)}</td>
                          <td className="py-2 text-right font-mono tabular-nums">{currency(row.running)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border-strong font-mono tabular-nums">
                        <td className="py-2 pr-3 text-meta text-text-tertiary" colSpan={3}>
                          {ledger.length} {ledger.length === 1 ? "business" : "businesses"}
                        </td>
                        <td className="py-2 pr-3 text-right">{currency(ledgerSpend)}</td>
                        <td className="py-2 pr-3 text-right">{currency(ledgerKept)}</td>
                        <td className="py-2 text-right text-foreground">{currency(ledgerKept)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="border-y border-border py-8">
                  <p className="text-small text-muted-foreground">
                    No verified visits yet. Check in with a receipt and the visit is
                    added here with its dollar amount.
                  </p>
                  <NavLink href="/discover" className="mt-4 inline-block">
                    <Button size="sm">Find a place nearby</Button>
                  </NavLink>
                </div>
              )}
            </section>
          </AnimatedSection>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-8">
              {/* Tier progress */}
              <AnimatedSection animation="fade-up" delay={0.15}>
                <section aria-labelledby="tier-heading">
                  <div className="mb-3 flex items-baseline justify-between gap-4">
                    <h2 id="tier-heading" className="text-h3 font-medium">
                      {impactDisplay?.tier?.name || "Getting Started"}
                    </h2>
                    <p className="font-mono text-meta tabular-nums text-text-tertiary">
                      {nextTierProgress}%
                      {impactDisplay?.nextTier ? ` to ${impactDisplay.nextTier.name}` : " · top tier"}
                    </p>
                  </div>
                  <Progress value={nextTierProgress} className="h-1" />
                </section>
              </AnimatedSection>

              {/* Engagement breakdown */}
              <AnimatedSection animation="fade-up" delay={0.2}>
                <section aria-labelledby="engagement-heading">
                  <h2 id="engagement-heading" className="mb-3 text-h3 font-medium">
                    Engagement breakdown
                  </h2>
                  {impactLoading ? (
                    <Skeleton className="h-[180px] w-full" />
                  ) : (
                    <ChartContainer config={engagementBarChartConfig} className="h-[180px] w-full">
                      <BarChart data={engagementData} layout="vertical" margin={{ left: 16 }}>
                        <CartesianGrid horizontal={false} />
                        <YAxis dataKey="category" type="category" tickLine={false} axisLine={false} width={80} />
                        <XAxis type="number" hide />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ChartContainer>
                  )}
                </section>
              </AnimatedSection>

              {/* Active missions */}
              <AnimatedSection animation="fade-up" delay={0.25}>
                <section aria-labelledby="missions-heading">
                  <div className="mb-3 flex items-baseline justify-between gap-4">
                    <h2 id="missions-heading" className="text-h3 font-medium">Active missions</h2>
                    <NavLink href="/missions" className="font-mono text-meta text-text-tertiary hover:text-primary">
                      View all
                    </NavLink>
                  </div>
                  {missionsLoading ? (
                    <div className="divide-y divide-border border-y border-border">
                      <Skeleton className="my-3 h-4 w-full" />
                      <Skeleton className="my-3 h-4 w-full" />
                    </div>
                  ) : activeMissions.length > 0 ? (
                    <div className="divide-y divide-border border-y border-border">
                      {activeMissions.slice(0, 4).map((mission) => (
                        <div key={mission.progress.id} className="py-3">
                          <div className="flex items-baseline justify-between gap-3">
                            <h3 className="truncate text-body font-medium">{mission.progress.mission.title}</h3>
                            <span className="shrink-0 font-mono text-meta tabular-nums text-text-tertiary">
                              {mission.progress.current_count}/{mission.progress.mission.target_count}
                            </span>
                          </div>
                          <Progress value={mission.percentageComplete} className="mt-2 h-1" />
                          <p className="mt-1.5 text-meta text-muted-foreground">
                            {mission.progress.mission.reward_description}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border-y border-border py-6">
                      <p className="text-small text-muted-foreground">No active missions.</p>
                      <NavLink href="/missions" className="mt-3 inline-block">
                        <Button variant="outline" size="sm">Browse missions</Button>
                      </NavLink>
                    </div>
                  )}
                </section>
              </AnimatedSection>

              {/* Recent activity */}
              <AnimatedSection animation="fade-up" delay={0.3}>
                <section aria-labelledby="activity-heading">
                  <h2 id="activity-heading" className="mb-3 text-h3 font-medium">Recent activity</h2>
                  {activityLoading ? (
                    <div className="divide-y divide-border border-y border-border">
                      <Skeleton className="my-3 h-4 w-full" />
                      <Skeleton className="my-3 h-4 w-full" />
                      <Skeleton className="my-3 h-4 w-full" />
                    </div>
                  ) : recentActivity && recentActivity.length > 0 ? (
                    <div className="divide-y divide-border border-y border-border">
                      {recentActivity.map((activity: { id: string; type: string; business: string; time: string; impact: number }) => (
                        <div key={activity.id} className="flex items-baseline justify-between gap-4 py-2.5">
                          <p className="min-w-0 truncate text-small">
                            {activity.type === "check_in" && "Checked in at "}
                            {activity.type === "review" && "Reviewed "}
                            {activity.type === "bookmark" && "Bookmarked "}
                            {activity.type === "deal_claimed" && "Claimed deal at "}
                            <span className="font-medium">{activity.business}</span>
                          </p>
                          <p className="flex shrink-0 items-baseline gap-x-1.5 font-mono text-meta tabular-nums text-text-tertiary">
                            <span>{activity.time}</span>
                            <span aria-hidden="true">&middot;</span>
                            <span>+{activity.impact} pts</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border-y border-border py-6">
                      <p className="text-small text-muted-foreground">
                        No recent activity. Check in somewhere to see it here.
                      </p>
                    </div>
                  )}
                </section>
              </AnimatedSection>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              <AnimatedSection animation="fade-up" delay={0.35}>
                <section aria-labelledby="totals-heading">
                  <h2 id="totals-heading" className="mb-3 text-h3 font-medium">Your totals</h2>
                  <dl className="divide-y divide-border border-y border-border">
                    {[
                      { label: "Dollars kept local", value: currency(Number(impact?.estimated_dollars_kept_local || 0)) },
                      { label: "Businesses supported", value: String(impact?.businesses_supported || 0) },
                      { label: "Jobs supported (est.)", value: String(impact?.jobs_impacted_estimate || 0) },
                      { label: "Check-ins", value: String(impact?.total_check_ins || 0) },
                      { label: "Reviews left", value: String(impact?.reviews_left || 0) },
                      { label: "Missions completed", value: String(impact?.missions_completed || 0) },
                      { label: "Deals claimed", value: String(impact?.deals_claimed || 0) },
                    ].map((stat) => (
                      <div key={stat.label} className="flex justify-between gap-3 py-2 text-small" suppressHydrationWarning>
                        <dt className="text-muted-foreground">{stat.label}</dt>
                        {impactLoading ? (
                          <Skeleton className="h-4 w-10" />
                        ) : (
                          <dd className="font-mono tabular-nums">{stat.value}</dd>
                        )}
                      </div>
                    ))}
                  </dl>
                </section>
              </AnimatedSection>

              <AnimatedSection animation="fade-up" delay={0.4}>
                <section aria-labelledby="community-heading">
                  <h2 id="community-heading" className="mb-3 text-h3 font-medium">Community</h2>
                  <dl className="divide-y divide-border border-y border-border">
                    {[
                      { label: "Pulse score", value: (communityImpact?.pulseScore || 0).toLocaleString() },
                      { label: "Dollars kept local", value: currency(communityImpact?.totalDollarsKeptLocal || 0) },
                      { label: "Businesses supported", value: (communityImpact?.totalBusinessesSupported || 0).toLocaleString() },
                      { label: "Active members", value: formatCompactCount(communityImpact?.activeUsers || 0) },
                    ].map((stat) => (
                      <div key={stat.label} className="flex justify-between gap-3 py-2 text-small" suppressHydrationWarning>
                        <dt className="text-muted-foreground">{stat.label}</dt>
                        {pulseLoading ? (
                          <Skeleton className="h-4 w-14" />
                        ) : (
                          <dd className="font-mono tabular-nums">{stat.value}</dd>
                        )}
                      </div>
                    ))}
                  </dl>
                  <NavLink href="/leaderboard" className="mt-3 inline-block font-mono text-meta text-text-tertiary hover:text-primary">
                    View leaderboard
                  </NavLink>
                </section>
              </AnimatedSection>

              <AnimatedSection animation="fade-up" delay={0.45}>
                <section aria-labelledby="spotlight-heading">
                  <h2 id="spotlight-heading" className="mb-3 text-h3 font-medium">Spotlight</h2>
                  {featuredBusiness ? (
                    <div className="border-y border-border py-3">
                      <h3 className="text-body font-medium">
                        <NavLink href={`/business/${featuredBusiness.id}`} className="hover:text-primary">
                          {featuredBusiness.name}
                        </NavLink>
                      </h3>
                      <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 font-mono text-meta uppercase tracking-[0.02em] text-text-tertiary">
                        <span>{featuredBusiness.category?.name ?? "Local business"}</span>
                        {featuredBusiness.city && (
                          <>
                            <span aria-hidden="true">&middot;</span>
                            <span>{featuredBusiness.city}</span>
                          </>
                        )}
                        <span aria-hidden="true">&middot;</span>
                        <span className="tabular-nums">
                          {featuredBusiness.average_rating || "New"} / {featuredBusiness.review_count || 0} reviews
                        </span>
                      </p>
                      <p className="mt-1.5 line-clamp-3 text-small text-muted-foreground">
                        {featuredBusiness.short_description ||
                          featuredBusiness.description ||
                          (featuredBusiness.category
                            ? `${featuredBusiness.category.name} in your area`
                            : "Popular local business")}
                      </p>
                      <NavLink
                        href={`/business/${featuredBusiness.id}`}
                        className="mt-2.5 inline-flex items-center gap-1 font-mono text-meta text-text-tertiary hover:text-primary"
                      >
                        View business
                        <ArrowRight className="h-3 w-3" aria-hidden="true" />
                      </NavLink>
                    </div>
                  ) : (
                    <p className="border-y border-border py-6 text-small text-muted-foreground">
                      No spotlight business available right now.
                    </p>
                  )}
                </section>
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
