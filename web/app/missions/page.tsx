"use client";

import { Zap, Trophy, Clock, ChevronRight, LogIn } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedSection } from "@/components/features/home/AnimatedSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActiveMissions, useMissionProgressDetails } from "@/hooks/useMissions";
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
    <div className="grid sm:grid-cols-3 gap-4 mb-8">
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
}

function ActiveMissionCard({ mission, progressDetail, index }: ActiveMissionCardProps) {
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

  return (
    <AnimatedSection animation="fade-up" delay={0.1 * (index + 2)}>
      <Card className="group">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="text-5xl">{icon}</div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h2 className="text-lg font-semibold">{mission.title}</h2>
                <Badge variant="secondary">{categoryName}</Badge>
                <Badge variant="outline">{difficulty}</Badge>
              </div>
              <p className="text-muted-foreground mb-2">{mission.description}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDeadline(mission.end_date, daysRemaining)}
                </span>
                {mission.reward_description && (
                  <span className="text-chart-3">Reward: {mission.reward_description}</span>
                )}
              </div>
            </div>

            <div className="w-full md:w-48">
              <div className="flex justify-between text-sm mb-1">
                <span>Progress</span>
                <span className="font-medium">{currentCount}/{targetCount}</span>
              </div>
              <Progress value={percentComplete} className="h-2 mb-3" />
              <Button asChild className="w-full group" size="sm">
                <Link href="/discover">
                  {currentCount > 0 ? "Continue" : "Start"}
                  <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
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

  // Stats computed from real data
  const activeCount = activeMissions?.length ?? 0;
  const completedCount = allCompleted.length;
  const inProgressCount = userActive?.filter((m) => m.progress.current_count > 0).length ?? 0;

  return (
    <div className="relative min-h-screen bg-background">
      <Header />

      <div className="pt-20 pb-12">
        <div className="mx-auto max-w-6xl px-6">
          {/* Header */}
          <AnimatedSection animation="fade-up">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-6 w-6 text-chart-3" />
                <h1 className="text-3xl font-bold tracking-tight">
                  Boost Missions
                </h1>
              </div>
              <p className="text-muted-foreground">
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
                    <div className="h-12 w-12 rounded-xl bg-chart-3/10 flex items-center justify-center">
                      <Zap className="h-6 w-6 text-chart-3" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{activeCount}</div>
                      <div className="text-xs text-muted-foreground">Active Missions</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-chart-5/10 flex items-center justify-center">
                      <Trophy className="h-6 w-6 text-chart-5" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{completedCount}</div>
                      <div className="text-xs text-muted-foreground">Completed</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{inProgressCount}</div>
                      <div className="text-xs text-muted-foreground">In Progress</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
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
                <TabsList className="mb-6">
                  <TabsTrigger value="active">Active Missions</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-4">
                  {isLoading ? (
                    <>
                      <MissionCardSkeleton />
                      <MissionCardSkeleton />
                      <MissionCardSkeleton />
                    </>
                  ) : activeMissions && activeMissions.length > 0 ? (
                    activeMissions.map((mission, index) => (
                      <ActiveMissionCard
                        key={mission.id}
                        mission={mission}
                        progressDetail={progressMap.get(mission.id)}
                        index={index}
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
                    <>
                      <MissionCardSkeleton />
                      <MissionCardSkeleton />
                    </>
                  ) : allCompleted.length > 0 ? (
                    allCompleted.map((detail, index) => (
                      <AnimatedSection key={detail.progress.id} animation="fade-up" delay={0.1 * (index + 2)}>
                        <Card className="bg-muted/30">
                          <CardContent className="p-6">
                            <div className="flex items-center gap-6">
                              <div className="text-5xl opacity-50">
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
                              <Trophy className="h-8 w-8 text-chart-5" />
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
