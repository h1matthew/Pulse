"use client";

import { Zap, Trophy, Clock, ChevronRight, LogIn, Loader2, Flame, Users, MapPin, Star } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedSection } from "@/components/features/home/AnimatedSection";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  underlineTabsListClass,
  underlineTabsTriggerClass,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  useActiveMissions,
  useMissionProgressDetails,
  useStartMission,
} from "@/hooks/useMissions";
import { useAuth } from "@/components/providers/AuthProvider";
import { MISSION_CONFIGS } from "@/types/mission";
import type { MissionType, BoostMissionWithCategory, MissionProgressDetails } from "@/types/mission";

function getMissionIcon(missionType: MissionType): string {
  return MISSION_CONFIGS[missionType]?.icon ?? "🎯";
}

function getDifficultyLabel(targetCount: number): string {
  if (targetCount <= 3) return "Easy";
  if (targetCount <= 5) return "Medium";
  return "Hard";
}

function formatDeadline(endDate: string | null, daysRemaining: number | null): string {
  if (!endDate) return "No deadline";
  if (daysRemaining === null || daysRemaining <= 0) return "Ending soon";
  if (daysRemaining === 1) return "Ends tomorrow";
  return `Ends in ${daysRemaining} days`;
}

function formatCompletedAt(completedAt: string | null): string {
  if (!completedAt) return "Recently";
  const date = new Date(completedAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "1 week ago";
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? "s" : ""} ago`;
}

function MissionCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-3 w-36" />
          </div>
          <div className="w-full md:w-48 space-y-2">
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid sm:grid-cols-3 gap-4 mb-8" role="status" aria-busy="true">
      <span className="sr-only">Loading mission stats…</span>
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-6 flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="space-y-1">
              <Skeleton className="h-7 w-8" />
              <Skeleton className="h-3 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface ActiveMissionCardProps {
  mission: BoostMissionWithCategory;
  progressDetail?: MissionProgressDetails;
  index: number;
  isLoggedIn: boolean;
}

function ActiveMissionCard({ mission, progressDetail, index, isLoggedIn }: ActiveMissionCardProps) {
  const startMission = useStartMission();
  const hasStarted = !!progressDetail;
  // Continue should continue the mission: land on discover pre-filtered to
  // the mission's category when it has one, not the generic feed.
  const continueHref = mission.category?.slug
    ? `/discover?category=${mission.category.slug}`
    : "/discover";
  const currentCount = progressDetail?.progress.current_count ?? 0;
  const targetCount = mission.target_count;
  const percentComplete = targetCount > 0 ? (currentCount / targetCount) * 100 : 0;
  const icon = getMissionIcon(mission.mission_type as MissionType);
  const categoryName = mission.category?.name ?? mission.mission_type.replace("_", " ");
  const difficulty = getDifficultyLabel(targetCount);

  let daysRemaining: number | null = null;
  if (mission.end_date) {
    const endDate = new Date(mission.end_date);
    const now = new Date();
    daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }

  const handleStart = async () => {
    try {
      await startMission.mutateAsync(mission.id);
      toast.success("Mission started", {
        description: "Check-ins and visits now count toward this mission.",
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message ? error.message : "Please try again.";
      toast.error("Could not start mission", { description: message });
    }
  };

  return (
    <AnimatedSection animation="fade-up" delay={0.1 * (index + 2)}>
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="text-5xl" aria-hidden="true">{icon}</div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h2 className="text-lg font-semibold">{mission.title}</h2>
                <Badge variant="secondary">{categoryName}</Badge>
                <Badge variant="outline">{difficulty}</Badge>
              </div>
              <p className="text-muted-foreground mb-2">{mission.description}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {formatDeadline(mission.end_date, daysRemaining)}
                </span>
                {mission.reward_description && (
                  <span className="text-chart-3">Reward: {mission.reward_description}</span>
                )}
              </div>
            </div>

            <div className="w-full md:w-48">
              <div className="flex justify-between text-sm mb-1">
                <span id={`mission-progress-label-${mission.id}`}>Progress</span>
                <span className="font-medium tabular-nums">
                  {currentCount}/{targetCount}
                </span>
              </div>
              <Progress
                value={percentComplete}
                className="h-2 mb-3"
                aria-label={`${mission.title} progress: ${currentCount} of ${targetCount}`}
              />
              {hasStarted ? (
                <Button
                  asChild
                  className="w-full group"
                  size="sm"
                  aria-label={`Continue mission: ${mission.title}`}
                >
                  <Link href={continueHref}>
                    Continue
                    <ChevronRight
                      className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </Link>
                </Button>
              ) : isLoggedIn ? (
                <Button
                  className="w-full group"
                  size="sm"
                  onClick={handleStart}
                  disabled={startMission.isPending}
                  aria-label={`Start mission: ${mission.title}`}
                >
                  {startMission.isPending ? (
                    <>
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden="true" />
                      Starting…
                    </>
                  ) : (
                    <>
                      Start
                      <ChevronRight
                        className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  asChild
                  className="w-full group"
                  size="sm"
                  aria-label={`Sign in to start mission: ${mission.title}`}
                >
                  <Link href="/login">
                    Sign in to start
                    <ChevronRight
                      className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </AnimatedSection>
  );
}

// ── Hotspot Businesses (2× points this week) ────────────────────────
const HOTSPOT_BUSINESSES = [
  {
    id: "demo-la-villita-cafe",
    name: "La Villita Cafe LLC",
    category: "Food & Drink",
    multiplier: 2,
    reason: "Featured this week",
    rating: 4.6,
    distance: "0.3 mi",
  },
  {
    id: "demo-hotspot-2",
    name: "Bakery Lorraine",
    category: "Food & Drink",
    multiplier: 2,
    reason: "New on Pulse",
    rating: 4.8,
    distance: "1.2 mi",
  },
  {
    id: "demo-hotspot-3",
    name: "The Twig Book Shop",
    category: "Retail",
    multiplier: 2,
    reason: "Community pick",
    rating: 4.7,
    distance: "0.8 mi",
  },
];

// ── Group Check-in Tiers ─────────────────────────────────────────────
const GROUP_TIERS = [
  { friends: 1, label: "Duo", bonus: "+25%", color: "text-chart-3" },
  { friends: 2, label: "Trio", bonus: "+50%", color: "text-chart-5" },
  { friends: 3, label: "Squad (4+)", bonus: "+100%", color: "text-primary" },
];

function HotspotSection() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
          <Flame className="h-4 w-4 text-orange-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Hotspots</h2>
          <p className="text-xs text-muted-foreground">Earn 2× points at featured spots this week</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {HOTSPOT_BUSINESSES.map((biz) => (
          <Link key={biz.id} href={`/business/${biz.id}`}>
            <Card className="hover:border-orange-500/30 transition-colors cursor-pointer group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <Badge className="bg-orange-500 text-white border-0 text-[10px] px-1.5">
                    {biz.multiplier}× POINTS
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-chart-5 text-chart-5" />
                    {biz.rating}
                  </div>
                </div>
                <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                  {biz.name}
                </h3>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                  <span>{biz.category}</span>
                  <span>·</span>
                  <span className="flex items-center gap-0.5">
                    <MapPin className="h-3 w-3" />
                    {biz.distance}
                  </span>
                </div>
                <p className="text-[10px] text-orange-500/80 mt-2 font-medium uppercase tracking-wide">
                  {biz.reason}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function GroupCheckInSection() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Users className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Group Check-ins</h2>
          <p className="text-xs text-muted-foreground">
            Check in with friends at the same spot for bonus points
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="grid sm:grid-cols-3 gap-4">
            {GROUP_TIERS.map((tier) => (
              <div
                key={tier.friends}
                className="flex items-center gap-3 rounded-lg border border-border p-3"
              >
                <div className="flex -space-x-2">
                  {Array.from({ length: tier.friends + 1 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center"
                    >
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{tier.label}</p>
                  <p className={cn("text-lg font-bold tabular-nums", tier.color)}>
                    {tier.bonus}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            When you and your friends check in at the same business within 30 minutes,
            everyone earns bonus points. The more friends, the bigger the bonus.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MissionsPage() {
  const { isLoggedIn, userId, loading: authLoading } = useAuth();
  const { data: activeMissions, isLoading: missionsLoading, error: missionsError } = useActiveMissions();
  const {
    activeMissions: userActive,
    completedMissions: userCompleted,
    claimedMissions,
    isLoading: progressLoading,
  } = useMissionProgressDetails(userId ?? "");

  const isLoading = authLoading || missionsLoading;
  const allCompleted = [...(userCompleted ?? []), ...(claimedMissions ?? [])];

  // Build a map of mission ID -> progress detail for quick lookup
  const progressMap = new Map<string, MissionProgressDetails>();
  for (const detail of userActive ?? []) {
    progressMap.set(detail.progress.mission_id, detail);
  }

  // Stats computed from real data. "In progress" = missions the user has
  // started (enrolled in) and not yet completed — count 0/3 still counts.
  const activeCount = activeMissions?.length ?? 0;
  const completedCount = allCompleted.length;
  const inProgressCount = userActive?.length ?? 0;

  return (
    <div className="relative min-h-screen">
      <Header />

      <div className="pt-28 pb-12">
        <div className="mx-auto max-w-6xl px-6">
          {/* Header */}
          <AnimatedSection animation="fade-up">
            <div className="mb-8 border-b border-border pb-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Challenges &amp; rewards
              </p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Boost Missions
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
                Complete challenges, support local businesses, and unlock exclusive rewards
              </p>
            </div>
          </AnimatedSection>

          {/* Stats */}
          <AnimatedSection animation="fade-up" delay={0.1}>
            {isLoading ? (
              <StatsSkeleton />
            ) : (
              <div className="grid sm:grid-cols-3 gap-4 mb-8">
                <Card>
                  <CardContent className="p-6 flex items-center gap-4">
                    <div
                      className="h-12 w-12 rounded-xl bg-chart-3/10 flex items-center justify-center"
                      aria-hidden="true"
                    >
                      <Zap className="h-6 w-6 text-chart-3" />
                    </div>
                    {/* Label first in DOM so screen readers announce
                        "Active Missions, 4"; reversed visually. */}
                    <div className="flex flex-col-reverse">
                      <div className="text-xs text-muted-foreground">Active Missions</div>
                      <div className="text-2xl font-bold tabular-nums">{activeCount}</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 flex items-center gap-4">
                    <div
                      className="h-12 w-12 rounded-xl bg-chart-5/10 flex items-center justify-center"
                      aria-hidden="true"
                    >
                      <Trophy className="h-6 w-6 text-chart-5" />
                    </div>
                    <div className="flex flex-col-reverse">
                      <div className="text-xs text-muted-foreground">Completed</div>
                      <div className="text-2xl font-bold tabular-nums">{completedCount}</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 flex items-center gap-4">
                    <div
                      className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"
                      aria-hidden="true"
                    >
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex flex-col-reverse">
                      <div className="text-xs text-muted-foreground">In Progress</div>
                      <div className="text-2xl font-bold tabular-nums">{inProgressCount}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </AnimatedSection>

          {/* Hotspots — 2× point businesses */}
          <AnimatedSection animation="fade-up" delay={0.12}>
            <div className="mb-8">
              <HotspotSection />
            </div>
          </AnimatedSection>

          {/* Group Check-ins */}
          <AnimatedSection animation="fade-up" delay={0.14}>
            <div className="mb-8">
              <GroupCheckInSection />
            </div>
          </AnimatedSection>

          {/* Error State */}
          {missionsError && (
            <AnimatedSection animation="fade-up" delay={0.15}>
              <Card className="border-destructive/50">
                <CardContent className="p-6 text-center">
                  <p className="text-destructive mb-2">Failed to load missions</p>
                  <p className="text-sm text-muted-foreground">Please try refreshing the page.</p>
                </CardContent>
              </Card>
            </AnimatedSection>
          )}

          {/* Missions Tabs */}
          {!missionsError && (
            <AnimatedSection animation="fade-up" delay={0.15}>
              <Tabs defaultValue="active" className="w-full">
                <TabsList className={cn(underlineTabsListClass, "mb-6")}>
                  <TabsTrigger value="active" className={underlineTabsTriggerClass}>
                    Active Missions
                  </TabsTrigger>
                  <TabsTrigger value="completed" className={underlineTabsTriggerClass}>
                    Completed
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-4">
                  {isLoading ? (
                    <div className="space-y-4" role="status" aria-busy="true">
                      <span className="sr-only">Loading missions…</span>
                      <MissionCardSkeleton />
                      <MissionCardSkeleton />
                      <MissionCardSkeleton />
                    </div>
                  ) : activeMissions && activeMissions.length > 0 ? (
                    activeMissions.map((mission, index) => (
                      <ActiveMissionCard
                        key={mission.id}
                        mission={mission}
                        progressDetail={progressMap.get(mission.id)}
                        index={index}
                        isLoggedIn={isLoggedIn}
                      />
                    ))
                  ) : (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <Zap className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                        <h2 className="text-lg font-semibold mb-2">No Active Missions</h2>
                        <p className="text-muted-foreground text-sm">
                          New missions are added regularly. Check back soon for new challenges!
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="completed" className="space-y-4">
                  {!isLoggedIn ? (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <LogIn className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                        <h2 className="text-lg font-semibold mb-2">Sign In to Track Progress</h2>
                        <p className="text-muted-foreground text-sm mb-4">
                          Sign in to start completing missions and earning rewards.
                        </p>
                        <Button asChild>
                          <Link href="/login">Sign In</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ) : progressLoading ? (
                    <div className="space-y-4" role="status" aria-busy="true">
                      <span className="sr-only">Loading completed missions…</span>
                      <MissionCardSkeleton />
                      <MissionCardSkeleton />
                    </div>
                  ) : allCompleted.length > 0 ? (
                    allCompleted.map((detail, index) => (
                      <AnimatedSection key={detail.progress.id} animation="fade-up" delay={0.1 * (index + 2)}>
                        <Card className="bg-muted/30">
                          <CardContent className="p-6">
                            <div className="flex items-center gap-6">
                              <div className="text-5xl opacity-50" aria-hidden="true">
                                {getMissionIcon(detail.progress.mission.mission_type as MissionType)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h2 className="text-lg font-semibold">{detail.progress.mission.title}</h2>
                                  <Badge className="bg-chart-5 text-white">Completed</Badge>
                                  {detail.progress.reward_claimed && (
                                    <Badge variant="outline">Claimed</Badge>
                                  )}
                                </div>
                                <p className="text-muted-foreground text-sm">{detail.progress.mission.description}</p>
                                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                  <span>Completed {formatCompletedAt(detail.progress.completed_at)}</span>
                                  {detail.progress.mission.reward_description && (
                                    <span className="text-chart-3">
                                      Earned: {detail.progress.mission.reward_description}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Trophy className="h-8 w-8 text-chart-5" aria-hidden="true" />
                            </div>
                          </CardContent>
                        </Card>
                      </AnimatedSection>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                        <h2 className="text-lg font-semibold mb-2">No Completed Missions Yet</h2>
                        <p className="text-muted-foreground text-sm">
                          Start an active mission above and complete it to see your achievements here.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </AnimatedSection>
          )}
        </div>
      </div>
    </div>
  );
}
