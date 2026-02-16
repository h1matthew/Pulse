"use client";

import { useState } from "react";
import { Tag, Clock, MapPin, Star, ChevronRight, Loader2, Copy, Check } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedSection } from "@/components/features/home/AnimatedSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAvailableDeals, useUserClaims, useClaimDeal } from "@/hooks/useDeals";
import { useAuth } from "@/components/providers/AuthProvider";
import { toast } from "sonner";
import type { DealWithBusiness, DealClaimWithDeal } from "@/types/business";

// Helper function to format discount display
function formatDiscount(type: string, value: number | null): string {
  if (!value) return "SPECIAL";
  switch (type) {
    case "percentage":
      return `${value}% OFF`;
    case "fixed_amount":
      return `$${value} OFF`;
    case "free_item":
      return "FREE ITEM";
    case "bogo":
      return "BOGO";
    default:
      return "SPECIAL";
  }
}

// Helper function to format expiration
function formatExpiration(endDate: string | null): string {
  if (!endDate) return "No expiration";
  const end = new Date(endDate);
  const now = new Date();
  const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Expired";
  if (diffDays === 0) return "Expires today";
  if (diffDays === 1) return "1 day left";
  if (diffDays <= 7) return `${diffDays} days left`;
  if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks left`;
  return "No expiration";
}

// Helper function to get category icon
function getCategoryIcon(categoryName?: string): string {
  const icons: Record<string, string> = {
    "Food & Drink": "🍽️",
    "Retail": "🛍️",
    "Services": "🔧",
    "Entertainment": "🎭",
    "Health & Wellness": "💪",
    "Arts & Culture": "🎨",
  };
  return icons[categoryName || ""] || "🏪";
}

// Deal Card Component
function DealCard({
  deal,
  index,
  onClaim,
  isClaiming,
  isClaimed,
}: {
  deal: DealWithBusiness;
  index: number;
  onClaim: (deal: DealWithBusiness) => void;
  isClaiming: boolean;
  isClaimed: boolean;
}) {
  const discount = formatDiscount(deal.discount_type, deal.discount_value);
  const expiresIn = formatExpiration(deal.end_date);
  const categoryName = deal.business?.category?.name || "Local Business";
  const icon = getCategoryIcon(categoryName);
  const rating = deal.business?.average_rating || 0;
  const reviewCount = deal.business?.review_count || 0;

  return (
    <AnimatedSection animation="fade-up" delay={0.1 * (index + 2)}>
      <Card className="group">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Icon */}
            <div className="text-5xl">{icon}</div>

            {/* Content */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold">{deal.title}</h3>
                {deal.deal_type === "boost_mission" && (
                  <Badge className="bg-chart-3 text-white">Boost Mission</Badge>
                )}
                {deal.deal_type === "flash" && (
                  <Badge className="bg-destructive text-white animate-pulse">Flash Deal</Badge>
                )}
                <Badge variant="secondary">{categoryName}</Badge>
              </div>

              <p className="text-muted-foreground mb-2">{deal.description}</p>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {deal.business?.name || "Local Business"}
                </span>
                {rating > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-chart-5 text-chart-5" />
                    {rating.toFixed(1)} ({reviewCount} reviews)
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {expiresIn}
                </span>
              </div>

              {deal.minimum_purchase && (
                <p className="text-xs text-muted-foreground mt-2">
                  Minimum purchase: ${deal.minimum_purchase}
                </p>
              )}
            </div>

            {/* Action */}
            <div className="flex flex-col items-end gap-2">
              <div className="text-2xl font-bold text-chart-2">{discount}</div>
              <Button
                className="group"
                size="sm"
                onClick={() => onClaim(deal)}
                disabled={isClaiming || isClaimed}
              >
                {isClaiming ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : isClaimed ? (
                  <>
                    <Check className="mr-1 h-4 w-4" />
                    Claimed
                  </>
                ) : deal.deal_type === "boost_mission" ? (
                  "Continue Mission"
                ) : (
                  <>
                    Claim Deal
                    <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </AnimatedSection>
  );
}

// Loading Skeleton
function DealCardSkeleton({ index }: { index: number }) {
  return (
    <AnimatedSection animation="fade-up" delay={0.1 * (index + 2)}>
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="flex flex-col items-end gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    </AnimatedSection>
  );
}

export default function DealsPage() {
  const { user } = useAuth();
  const [selectedDeal, setSelectedDeal] = useState<DealWithBusiness | null>(null);
  const [claimedDeal, setClaimedDeal] = useState<DealClaimWithDeal | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const {
    data: dealsData,
    isLoading: dealsLoading,
    error: dealsError,
  } = useAvailableDeals();

  const {
    data: claimsData,
    isLoading: claimsLoading,
  } = useUserClaims();

  const claimDeal = useClaimDeal();

  const deals = dealsData?.deals || [];
  const claims = claimsData?.claims || [];
  const claimedDealIds = new Set(claims.map((c) => c.deal_id));

  const handleClaim = async (deal: DealWithBusiness) => {
    if (!user) {
      toast.error("Sign in required", {
        description: "Please sign in to claim deals",
      });
      return;
    }

    if (claimedDealIds.has(deal.id)) {
      toast.info("Already claimed", {
        description: "You have already claimed this deal",
      });
      return;
    }

    setSelectedDeal(deal);

    try {
      const result = await claimDeal.mutateAsync(deal.id);
      setClaimedDeal(result);
      toast.success("Deal claimed!", {
        description: "Your redemption code is ready",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to claim deal";
      toast.error("Error", { description: message });
      setSelectedDeal(null);
    }
  };

  const handleCopyCode = () => {
    if (claimedDeal?.redeemed_code) {
      navigator.clipboard.writeText(claimedDeal.redeemed_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      toast.success("Code copied!");
    }
  };

  const handleCloseDialog = () => {
    setSelectedDeal(null);
    setClaimedDeal(null);
    setCopiedCode(false);
  };

  // Calculate stats
  const flashDealsCount = deals.filter((d) => d.deal_type === "flash").length;
  const activeClaims = claims.filter((c) => !c.redeemed_at).length;

  if (dealsError) {
    return (
      <div className="relative min-h-screen bg-background">
        <Header />
        <div className="pt-32 pb-12 px-6">
          <div className="mx-auto max-w-6xl text-center">
            <h1 className="text-2xl font-bold mb-4">Error loading deals</h1>
            <p className="text-muted-foreground">Please try again later</p>
          </div>
        </div>
      </div>
    );
  }

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
                    <div className="text-2xl font-bold">
                      {dealsLoading ? <Skeleton className="h-8 w-8" /> : deals.length}
                    </div>
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
                    <div className="text-2xl font-bold">
                      {dealsLoading ? <Skeleton className="h-8 w-8" /> : flashDealsCount}
                    </div>
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
                    <div className="text-2xl font-bold">
                      {claimsLoading ? <Skeleton className="h-8 w-8" /> : activeClaims}
                    </div>
                    <div className="text-xs text-muted-foreground">Active Claims</div>
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
                <TabsTrigger value="claimed">My Claims</TabsTrigger>
              </TabsList>

              <TabsContent value="available" className="space-y-4">
                {dealsLoading ? (
                  // Loading skeletons
                  Array.from({ length: 3 }).map((_, i) => (
                    <DealCardSkeleton key={i} index={i} />
                  ))
                ) : deals.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-4xl mb-4">🎁</div>
                    <h3 className="text-lg font-semibold mb-2">No deals available</h3>
                    <p className="text-muted-foreground">Check back soon for new offers!</p>
                  </div>
                ) : (
                  deals.map((deal, index) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      index={index}
                      onClaim={handleClaim}
                      isClaiming={claimDeal.isPending && selectedDeal?.id === deal.id}
                      isClaimed={claimedDealIds.has(deal.id)}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="claimed" className="space-y-4">
                {claimsLoading ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <DealCardSkeleton key={i} index={i} />
                  ))
                ) : claims.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-4xl mb-4">🎁</div>
                    <h3 className="text-lg font-semibold mb-2">No claimed deals yet</h3>
                    <p className="text-muted-foreground">Start exploring and claim your first deal!</p>
                  </div>
                ) : (
                  claims.map((claim, index) => {
                    const deal = claim.deal;
                    if (!deal) return null;

                    const isRedeemed = !!claim.redeemed_at;
                    const discount = formatDiscount(deal.discount_type, deal.discount_value);
                    const categoryName = deal.business?.category?.name || "Local Business";
                    const icon = getCategoryIcon(categoryName);

                    return (
                      <AnimatedSection key={claim.id} animation="fade-up" delay={0.1 * (index + 2)}>
                        <Card className={isRedeemed ? "bg-muted/30" : ""}>
                          <CardContent className="p-6">
                            <div className="flex items-center gap-6">
                              <div className={`text-5xl ${isRedeemed ? "opacity-50" : ""}`}>{icon}</div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-lg font-semibold">{deal.title}</h3>
                                  {isRedeemed ? (
                                    <Badge variant="outline">Used</Badge>
                                  ) : (
                                    <Badge className="bg-chart-2 text-white">Active</Badge>
                                  )}
                                </div>
                                <p className="text-muted-foreground text-sm">{deal.description}</p>
                                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                  <span>{deal.business?.name || "Local Business"}</span>
                                  <span>Claimed {new Date(claim.claimed_at).toLocaleDateString()}</span>
                                </div>
                                {!isRedeemed && claim.redeemed_code && (
                                  <div className="mt-3 p-2 bg-muted rounded-lg inline-flex items-center gap-2">
                                    <span className="text-sm font-mono">{claim.redeemed_code}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2"
                                      onClick={() => {
                                        navigator.clipboard.writeText(claim.redeemed_code!);
                                        toast.success("Code copied!");
                                      }}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <div className={`text-xl font-bold ${isRedeemed ? "text-muted-foreground" : ""}`}>
                                {discount}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </AnimatedSection>
                    );
                  })
                )}
              </TabsContent>
            </Tabs>
          </AnimatedSection>
        </div>
      </div>

      {/* Claim Success Dialog */}
      <Dialog open={!!claimedDeal} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deal Claimed! 🎉</DialogTitle>
            <DialogDescription>
              {selectedDeal?.title} at {selectedDeal?.business?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Your redemption code:</p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-2xl font-bold bg-muted px-4 py-2 rounded-lg">
                  {claimedDeal?.redeemed_code}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyCode}
                >
                  {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Show this code to the business to redeem your deal.
            </p>
          </div>
          <Button onClick={handleCloseDialog} className="w-full">
            Got it!
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
