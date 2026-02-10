"use client";

import { Zap, Trophy, Clock, ChevronRight } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AnimatedSection } from "@/components/features/home/AnimatedSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ACTIVE_MISSIONS = [
  {
    id: "1",
    title: "Coffee Explorer",
    description: "Visit 3 different local coffee shops this month",
    longDescription: "Discover the unique flavors of local coffee shops in your area. Each visit brings you closer to unlocking this mission!",
    progress: 2,
    target: 3,
    reward: "Free pastry at any participating coffee shop",
    icon: "☕",
    category: "Food & Drink",
    deadline: "Ends in 12 days",
    difficulty: "Easy",
  },
  {
    id: "2",
    title: "Local Foodie",
    description: "Try 5 restaurants in the Food & Drink category",
    longDescription: "Support local restaurants and expand your culinary horizons. From cozy cafes to fine dining!",
    progress: 3,
    target: 5,
    reward: "20% off your next meal at any partner restaurant",
    icon: "🍽️",
    category: "Food & Drink",
    deadline: "Ends in 18 days",
    difficulty: "Medium",
  },
  {
    id: "3",
    title: "Community Voice",
    description: "Leave 3 thoughtful reviews for local businesses",
    longDescription: "Your reviews help others discover great local businesses. Share your experiences and make an impact!",
    progress: 1,
    target: 3,
    reward: "Featured reviewer badge + $5 credit",
    icon: "⭐",
    category: "Community",
    deadline: "No deadline",
    difficulty: "Easy",
  },
  {
    id: "4",
    title: "Support Local",
    description: "Bookmark 10 businesses you want to support",
    longDescription: "Build your personal list of local favorites. Bookmark businesses to keep track of places you love!",
    progress: 7,
    target: 10,
    reward: "Exclusive early access to new deals",
    icon: "💝",
    category: "Community",
    deadline: "No deadline",
    difficulty: "Easy",
  },
  {
    id: "5",
    title: "Wellness Warrior",
    description: "Visit 3 health & wellness businesses",
    longDescription: "Take care of yourself while supporting local gyms, spas, salons, and wellness centers.",
    progress: 1,
    target: 3,
    reward: "Free class or treatment upgrade",
    icon: "💪",
    category: "Health & Wellness",
    deadline: "Ends in 25 days",
    difficulty: "Medium",
  },
];

const COMPLETED_MISSIONS = [
  {
    id: "6",
    title: "First Steps",
    description: "Check in at your first local business",
    completedAt: "2 weeks ago",
    reward: "Welcome badge",
    icon: "👣",
  },
  {
    id: "7",
    title: "Deal Hunter",
    description: "Claim your first deal",
    completedAt: "1 week ago",
    reward: "$5 credit",
    icon: "🎁",
  },
];

export default function MissionsPage() {
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
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-chart-3/10 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-chart-3" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">5</div>
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
                    <div className="text-2xl font-bold">2</div>
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
                    <div className="text-2xl font-bold">3</div>
                    <div className="text-xs text-muted-foreground">In Progress</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </AnimatedSection>

          {/* Missions Tabs */}
          <AnimatedSection animation="fade-up" delay={0.15}>
            <Tabs defaultValue="active" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="active">Active Missions</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="space-y-4">
                {ACTIVE_MISSIONS.map((mission, index) => (
                  <AnimatedSection key={mission.id} animation="fade-up" delay={0.1 * (index + 2)}>
                    <Card className="group">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center gap-6">
                          {/* Icon */}
                          <div className="text-5xl">{mission.icon}</div>

                          {/* Content */}
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold">{mission.title}</h3>
                              <Badge variant="secondary">{mission.category}</Badge>
                              <Badge variant="outline">{mission.difficulty}</Badge>
                            </div>
                            <p className="text-muted-foreground mb-2">{mission.longDescription}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {mission.deadline}
                              </span>
                              <span className="text-chart-3">Reward: {mission.reward}</span>
                            </div>
                          </div>

                          {/* Progress */}
                          <div className="w-full md:w-48">
                            <div className="flex justify-between text-sm mb-1">
                              <span>Progress</span>
                              <span className="font-medium">{mission.progress}/{mission.target}</span>
                            </div>
                            <Progress value={(mission.progress / mission.target) * 100} className="h-2 mb-3" />
                            <Button className="w-full group" size="sm">
                              Continue
                              <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </AnimatedSection>
                ))}
              </TabsContent>

              <TabsContent value="completed" className="space-y-4">
                {COMPLETED_MISSIONS.map((mission, index) => (
                  <AnimatedSection key={mission.id} animation="fade-up" delay={0.1 * (index + 2)}>
                    <Card className="bg-muted/30">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-6">
                          <div className="text-5xl opacity-50">{mission.icon}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-semibold">{mission.title}</h3>
                              <Badge className="bg-chart-5 text-white">Completed</Badge>
                            </div>
                            <p className="text-muted-foreground text-sm">{mission.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span>Completed {mission.completedAt}</span>
                              <span className="text-chart-3">Earned: {mission.reward}</span>
                            </div>
                          </div>
                          <Trophy className="h-8 w-8 text-chart-5" />
                        </div>
                      </CardContent>
                    </Card>
                  </AnimatedSection>
                ))}
              </TabsContent>
            </Tabs>
          </AnimatedSection>
        </div>
      </div>
    </div>
  );
}
