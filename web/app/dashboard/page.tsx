"use client";

import { TrendingUp, DollarSign, Store, Users, Star, Zap, Target, Award } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AnimatedSection } from "@/components/features/home/AnimatedSection";
import { NavLink } from "@/components/ui/nav-link";

// Sample impact data
const IMPACT_DATA = {
  dollarsKeptLocal: 2847.50,
  businessesSupported: 23,
  jobsImpacted: 3,
  reviewsLeft: 12,
  missionsCompleted: 5,
  dealsClaimed: 8,
  totalCheckIns: 34,
  impactScore: 2847,
  communityRank: 156,
};

// Sample missions
const ACTIVE_MISSIONS = [
  {
    id: "1",
    title: "Coffee Explorer",
    description: "Visit 3 different local coffee shops",
    progress: 2,
    target: 3,
    reward: "Free pastry",
    icon: "☕",
  },
  {
    id: "2",
    title: "Local Foodie",
    description: "Try 5 restaurants in Food & Drink",
    progress: 3,
    target: 5,
    reward: "20% off next meal",
    icon: "🍽️",
  },
  {
    id: "3",
    title: "Community Voice",
    description: "Leave 3 thoughtful reviews",
    progress: 1,
    target: 3,
    reward: "Featured reviewer badge",
    icon: "⭐",
  },
];

// Sample recent activity
const RECENT_ACTIVITY = [
  { type: "check_in", business: "The Local Bean", time: "2 hours ago", impact: 25 },
  { type: "review", business: "Artisan Books", time: "1 day ago", impact: 10 },
  { type: "bookmark", business: "Wellness Hub Spa", time: "2 days ago", impact: 5 },
  { type: "deal_claimed", business: "Corner Bistro", time: "3 days ago", impact: 15 },
];

export default function DashboardPage() {
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
                    <div className="text-5xl font-bold gradient-text mb-2">
                      {IMPACT_DATA.impactScore.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Award className="h-4 w-4 text-chart-5" />
                      Rank #{IMPACT_DATA.communityRank} in your community
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">
                          Progress to next rank
                        </span>
                        <span className="font-medium">75%</span>
                      </div>
                      <Progress value={75} className="h-2" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Complete 2 more missions to reach the next rank!
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
                      <div className="text-2xl font-bold">
                        ${IMPACT_DATA.dollarsKeptLocal.toLocaleString()}
                      </div>
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
                      <div className="text-2xl font-bold">
                        {IMPACT_DATA.businessesSupported}
                      </div>
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
                      <div className="text-2xl font-bold">
                        {IMPACT_DATA.jobsImpacted}
                      </div>
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
                      <div className="text-2xl font-bold">
                        {IMPACT_DATA.totalCheckIns}
                      </div>
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
                    {ACTIVE_MISSIONS.map((mission) => (
                      <div
                        key={mission.id}
                        className="flex items-center gap-4 p-4 rounded-lg border bg-card/50"
                      >
                        <div className="text-3xl">{mission.icon}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold">{mission.title}</h4>
                            <span className="text-sm text-muted-foreground">
                              {mission.progress}/{mission.target}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {mission.description}
                          </p>
                          <Progress
                            value={(mission.progress / mission.target) * 100}
                            className="h-2"
                          />
                          <div className="mt-2 text-xs text-chart-3">
                            Reward: {mission.reward}
                          </div>
                        </div>
                      </div>
                    ))}
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
                      {RECENT_ACTIVITY.map((activity, index) => (
                        <div
                          key={index}
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
                      ))}
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
                      <span className="font-medium">{IMPACT_DATA.reviewsLeft}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Missions Completed
                      </span>
                      <span className="font-medium">
                        {IMPACT_DATA.missionsCompleted}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Deals Claimed</span>
                      <span className="font-medium">
                        {IMPACT_DATA.dealsClaimed}
                      </span>
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
                      <div className="text-3xl font-bold gradient-text mb-1">
                        8,742
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Community Pulse Score
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          Total Dollars Kept Local
                        </span>
                        <span>$2.4M</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          Businesses Supported
                        </span>
                        <span>847</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Active Members</span>
                        <span>3.2K</span>
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
