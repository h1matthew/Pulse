"use client";

import { Tag, Clock, MapPin, Star, ChevronRight } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedSection } from "@/components/features/home/AnimatedSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ACTIVE_DEALS = [
  {
    id: "1",
    business: "The Local Bean",
    title: "First Visit Special",
    description: "Get 15% off your first purchase when you check in on Pulse!",
    discount: "15% OFF",
    type: "standard",
    code: "PULSE15",
    expiresIn: "No expiration",
    category: "Food & Drink",
    rating: 4.7,
    reviewCount: 128,
    icon: "☕",
  },
  {
    id: "2",
    business: "Artisan Books & Gifts",
    title: "Book Lover's Deal",
    description: "Buy 2 books, get the 3rd at 50% off!",
    discount: "BOGO 50%",
    type: "standard",
    code: "BOOKS50",
    expiresIn: "7 days left",
    category: "Retail",
    rating: 4.9,
    reviewCount: 89,
    icon: "📚",
  },
  {
    id: "3",
    business: "Wellness Hub Spa",
    title: "New Client Special",
    description: "First-time clients receive 20% off any service",
    discount: "20% OFF",
    type: "standard",
    code: "WELCOME20",
    expiresIn: "14 days left",
    category: "Health & Wellness",
    rating: 4.6,
    reviewCount: 64,
    icon: "💆",
  },
  {
    id: "4",
    business: "The Local Bean",
    title: "Coffee Explorer Mission",
    description: "Try 3 different local coffee shops this month and unlock a free pastry!",
    discount: "FREE PASTRY",
    type: "boost_mission",
    code: "COFFEE3",
    expiresIn: "12 days left",
    category: "Food & Drink",
    rating: 4.7,
    reviewCount: 128,
    icon: "☕",
    missionProgress: 2,
    missionTarget: 3,
  },
  {
    id: "5",
    business: "Corner Bistro",
    title: "Flash Deal: Happy Hour",
    description: "50% off appetizers from 4-6pm today only!",
    discount: "50% OFF",
    type: "flash",
    code: "FLASH50",
    expiresIn: "4 hours left",
    category: "Food & Drink",
    rating: 4.5,
    reviewCount: 213,
    icon: "🍽️",
  },
];

const CLAIMED_DEALS = [
  {
    id: "6",
    business: "The Local Bean",
    title: "Welcome Offer",
    description: "10% off your first visit",
    discount: "10% OFF",
    claimedAt: "2 weeks ago",
    used: true,
    icon: "☕",
  },
];

export default function DealsPage() {
  return (
    <div className="relative min-h-screen bg-background">
      <Header />

      <div className="pt-20 pb-12">
        <div className="mx-auto max-w-6xl px-6">
          {/* Header */}
          <AnimatedSection animation="fade-up">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="h-6 w-6 text-chart-2" />
                <h1 className="text-3xl font-bold tracking-tight">
                  Deals & Offers
                </h1>
              </div>
              <p className="text-muted-foreground">
                Exclusive deals and Boost Mission rewards from local businesses
              </p>
            </div>
          </AnimatedSection>

          {/* Stats */}
          <AnimatedSection animation="fade-up" delay={0.1}>
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-chart-2/10 flex items-center justify-center">
                    <Tag className="h-6 w-6 text-chart-2" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">5</div>
                    <div className="text-xs text-muted-foreground">Available Deals</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-chart-3/10 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-chart-3" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">2</div>
                    <div className="text-xs text-muted-foreground">Flash Deals</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-chart-5/10 flex items-center justify-center">
                    <Star className="h-6 w-6 text-chart-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">1</div>
                    <div className="text-xs text-muted-foreground">Claimed</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </AnimatedSection>

          {/* Deals Tabs */}
          <AnimatedSection animation="fade-up" delay={0.15}>
            <Tabs defaultValue="available" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="available">Available Deals</TabsTrigger>
                <TabsTrigger value="claimed">Claimed</TabsTrigger>
              </TabsList>

              <TabsContent value="available" className="space-y-4">
                {ACTIVE_DEALS.map((deal, index) => (
                  <AnimatedSection key={deal.id} animation="fade-up" delay={0.1 * (index + 2)}>
                    <Card className="group">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center gap-6">
                          {/* Icon */}
                          <div className="text-5xl">{deal.icon}</div>

                          {/* Content */}
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold">{deal.title}</h3>
                              {deal.type === "boost_mission" && (
                                <Badge className="bg-chart-3 text-white">Boost Mission</Badge>
                              )}
                              {deal.type === "flash" && (
                                <Badge className="bg-destructive text-white animate-pulse">Flash Deal</Badge>
                              )}
                              <Badge variant="secondary">{deal.category}</Badge>
                            </div>

                            <p className="text-muted-foreground mb-2">{deal.description}</p>

                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {deal.business}
                              </span>
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-chart-5 text-chart-5" />
                                {deal.rating} ({deal.reviewCount} reviews)
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {deal.expiresIn}
                              </span>
                            </div>

                            {deal.type === "boost_mission" && deal.missionProgress !== undefined && (
                              <div className="mt-3 p-3 bg-chart-3/10 rounded-lg">
                                <div className="flex justify-between text-sm mb-1">
                                  <span>Mission Progress</span>
                                  <span className="font-medium">{deal.missionProgress}/{deal.missionTarget}</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-chart-3 rounded-full"
                                    style={{ width: `${(deal.missionProgress / deal.missionTarget) * 100}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Action */}
                          <div className="flex flex-col items-end gap-2">
                            <div className="text-2xl font-bold text-chart-2">{deal.discount}</div>
                            <Button className="group" size="sm">
                              {deal.type === "boost_mission" ? "Continue Mission" : "Claim Deal"}
                              <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Button>
                            {deal.code && (
                              <div className="text-xs text-muted-foreground">
                                Code: <span className="font-mono font-medium">{deal.code}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </AnimatedSection>
                ))}
              </TabsContent>

              <TabsContent value="claimed" className="space-y-4">
                {CLAIMED_DEALS.map((deal, index) => (
                  <AnimatedSection key={deal.id} animation="fade-up" delay={0.1 * (index + 2)}>
                    <Card className="bg-muted/30">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-6">
                          <div className="text-5xl opacity-50">{deal.icon}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-semibold">{deal.title}</h3>
                              <Badge variant="outline">Used</Badge>
                            </div>
                            <p className="text-muted-foreground text-sm">{deal.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span>{deal.business}</span>
                              <span>Claimed {deal.claimedAt}</span>
                            </div>
                          </div>
                          <div className="text-xl font-bold text-muted-foreground">{deal.discount}</div>
                        </div>
                      </CardContent>
                    </Card>
                  </AnimatedSection>
                ))}

                {CLAIMED_DEALS.length === 0 && (
                  <div className="text-center py-16">
                    <div className="text-4xl mb-4">🎁</div>
                    <h3 className="text-lg font-semibold mb-2">No claimed deals yet</h3>
                    <p className="text-muted-foreground">Start exploring and claim your first deal!</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </AnimatedSection>
        </div>
      </div>
    </div>
  );
}
