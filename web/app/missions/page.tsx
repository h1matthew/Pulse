"use client";

import { Clock, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
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
import type { BoostMissionWithCategory, MissionProgressDetails } from "@/types/mission";

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

function MissionRowSkeleton() {
  return (
    <div className="flex gap-4 py-4">
      <Skeleton className="h-6 w-14 shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-full max-w-md" />
        <Skeleton className="h-3 w-36" />
      </div>
      <Skeleton className="h-7 w-24 shrink-0" />
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="mt-3" role="status" aria-busy="true">
      <span className="sr-only">Loading mission stats…</span>
      <Skeleton className="h-3 w-64" />
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
      <div className="card-lift flex flex-col gap-4 px-2 py-4 md:flex-row">
        {/* Progress numeral, largest and leftmost */}
        <div className="w-14 shrink-0 pt-0.5">
          <p className="font-mono text-h3 leading-none tabular-nums">
            {currentCount}/{targetCount}
          </p>
          <p className="mt-1.5 font-mono text-meta text-text-tertiary">{difficulty}</p>
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-body font-medium">{mission.title}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 font-mono text-meta uppercase tracking-[0.02em] text-text-tertiary">
            <span>{categoryName}</span>
            <span aria-hidden="true">&middot;</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {formatDeadline(mission.end_date, daysRemaining)}
            </span>
          </p>
          <p className="mt-1.5 text-small text-muted-foreground">{mission.description}</p>
          {mission.reward_description && (
            <p className="mt-1 text-small">Reward: {mission.reward_description}</p>
          )}
          <Progress
            value={percentComplete}
            className="mt-2.5 h-1"
            aria-label={`${mission.title} progress: ${currentCount} of ${targetCount}`}
          />
        </div>

        <div className="shrink-0 self-start md:self-center">
          {hasStarted ? (
            <Button asChild size="xs" aria-label={`Continue mission: ${mission.title}`}>
              <Link href={continueHref}>Continue</Link>
            </Button>
          ) : isLoggedIn ? (
            <Button
              size="xs"
              onClick={handleStart}
              disabled={startMission.isPending}
              aria-label={`Start mission: ${mission.title}`}
            >
              {startMission.isPending ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden="true" />
                  Starting…
                </>
              ) : (
                "Start"
              )}
            </Button>
          ) : (
            <Button asChild size="xs" aria-label={`Sign in to start mission: ${mission.title}`}>
              <Link href="/login">Sign in to start</Link>
            </Button>
          )}
        </div>
      </div>
    </AnimatedSection>
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
        <div className="mx-auto max-w-5xl px-6">
          {/* Header */}
          <AnimatedSection animation="fade-up">
            <div className="mb-5 border-b border-border pb-5">
              <h1 className="text-h2 font-medium">Missions</h1>
              <p className="mt-1.5 text-small text-muted-foreground">
                Receipt-verified visits grouped into short challenges.
              </p>
              {isLoading ? (
                <StatsSkeleton />
              ) : (
                <p className="mt-3 flex flex-wrap items-baseline gap-x-1.5 font-mono text-meta tabular-nums text-text-tertiary">
                  <span data-testid="stat-active">{activeCount} active</span>
                  <span aria-hidden="true">&middot;</span>
                  <span data-testid="stat-completed">{completedCount} completed</span>
                  <span aria-hidden="true">&middot;</span>
                  <span data-testid="stat-in-progress">{inProgressCount} in progress</span>
                </p>
              )}
            </div>
          </AnimatedSection>

          {/* Error State */}
          {missionsError && (
            <AnimatedSection animation="fade-up" delay={0.15}>
              <div className="mb-5 border-y border-border py-6">
                <p className="text-body font-medium text-destructive">Failed to load missions</p>
                <p className="mt-1 text-small text-muted-foreground">Please try refreshing the page.</p>
              </div>
            </AnimatedSection>
          )}

          {/* Missions Tabs */}
          {!missionsError && (
            <AnimatedSection animation="fade-up" delay={0.15}>
              <Tabs defaultValue="active" className="w-full">
                <TabsList className={cn(underlineTabsListClass, "mb-6")}>
                  <TabsTrigger value="active" className={underlineTabsTriggerClass}>
                    Active
                  </TabsTrigger>
                  <TabsTrigger value="completed" className={underlineTabsTriggerClass}>
                    Completed
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="divide-y divide-border border-t border-border">
                  {isLoading ? (
                    <div role="status" aria-busy="true" className="divide-y divide-border">
                      <span className="sr-only">Loading missions…</span>
                      <MissionRowSkeleton />
                      <MissionRowSkeleton />
                      <MissionRowSkeleton />
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
                    <div className="py-10">
                      <h2 className="text-body font-medium">No active missions</h2>
                      <p className="mt-1 text-small text-muted-foreground">
                        New missions are added regularly. Check back soon.
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="completed" className="divide-y divide-border border-t border-border">
                  {!isLoggedIn ? (
                    <div className="py-10">
                      <h2 className="text-body font-medium">Sign in to track progress</h2>
                      <p className="mt-1 text-small text-muted-foreground">
                        Sign in to start missions and keep progress across devices.
                      </p>
                      <Button asChild size="sm" className="mt-4">
                        <Link href="/login">Sign in</Link>
                      </Button>
                    </div>
                  ) : progressLoading ? (
                    <div role="status" aria-busy="true" className="divide-y divide-border">
                      <span className="sr-only">Loading completed missions…</span>
                      <MissionRowSkeleton />
                      <MissionRowSkeleton />
                    </div>
                  ) : allCompleted.length > 0 ? (
                    allCompleted.map((detail, index) => (
                      <AnimatedSection key={detail.progress.id} animation="fade-up" delay={0.1 * (index + 2)}>
                        <div className="card-lift flex gap-4 px-2 py-4">
                          <div className="w-14 shrink-0 pt-0.5">
                            <p className="font-mono text-h3 leading-none tabular-nums">
                              {detail.progress.mission.target_count}/{detail.progress.mission.target_count}
                            </p>
                            <p className="mt-1.5 font-mono text-meta text-ok">Completed</p>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                              <h2 className="text-body font-medium">{detail.progress.mission.title}</h2>
                              {detail.progress.reward_claimed && (
                                <Badge variant="outline">Claimed</Badge>
                              )}
                            </div>
                            <p className="mt-1 font-mono text-meta uppercase tracking-[0.02em] text-text-tertiary">
                              Completed {formatCompletedAt(detail.progress.completed_at)}
                            </p>
                            <p className="mt-1.5 text-small text-muted-foreground">
                              {detail.progress.mission.description}
                            </p>
                            {detail.progress.mission.reward_description && (
                              <p className="mt-1 text-small">
                                Earned: {detail.progress.mission.reward_description}
                              </p>
                            )}
                          </div>
                        </div>
                      </AnimatedSection>
                    ))
                  ) : (
                    <div className="py-10">
                      <h2 className="text-body font-medium">No completed missions yet</h2>
                      <p className="mt-1 text-small text-muted-foreground">
                        Start an active mission above and complete it to see your achievements here.
                      </p>
                    </div>
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
