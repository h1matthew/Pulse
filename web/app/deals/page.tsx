"use client";

import { useMemo, useState } from "react";
import {
  Tag,
  Clock,
  MapPin,
  Star,
  ChevronRight,
  Loader2,
  AlertCircle,
  Check,
  Copy,
} from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedSection } from "@/components/features/home/AnimatedSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RefreshCw } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useAvailableDeals, useClaimDeal, useUserClaims, useScrapeDeals } from "@/hooks/useDeals";
import { toast } from "sonner";
import type { DealClaimWithDeal } from "@/types/business";

function formatDiscount(
  discountType: string,
  discountValue: number | null
): string {
  if (discountType === "percentage" && discountValue) {
    return `${discountValue}% OFF`;
  }
  if (discountType === "fixed_amount" && discountValue) {
    return `$${discountValue} OFF`;
  }
  if (discountType === "bogo") return "BOGO";
  if (discountType === "free_item") return "FREE ITEM";
  return "SPECIAL";
}

function formatExpiry(endDate: string | null): string {
  if (!endDate) return "No expiration";
  const end = new Date(endDate);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  if (diffMs <= 0) return "Expired";

  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const totalDays = Math.floor(totalHours / 24);

  if (totalDays > 0) {
    return `${totalDays} day${totalDays === 1 ? "" : "s"} left`;
  }
  return `${totalHours} hour${totalHours === 1 ? "" : "s"} left`;
}

function formatClaimedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleDateString();
}

function getBusinessIcon(claim: DealClaimWithDeal["deal"]): string {
  return claim.business?.category?.icon || "🏪";
}

export default function DealsPage() {
  const { isLoggedIn, userId } = useAuth();

  const {
    data: availableDeals = [],
    isLoading: availableLoading,
    isError: availableError,
  } = useAvailableDeals();
  const {
    data: claimedDeals = [],
    isLoading: claimsLoading,
    isError: claimsError,
  } = useUserClaims();
  const claimDeal = useClaimDeal();
  const scrapeDeals = useScrapeDeals();
  const [claimedDeal, setClaimedDeal] = useState<DealClaimWithDeal | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCloseDialog = () => {
    setClaimedDeal(null);
    setCopiedCode(false);
  };

  const handleCopyCode = () => {
    if (claimedDeal?.redeemed_code) {
      navigator.clipboard.writeText(claimedDeal.redeemed_code);
      setCopiedCode(true);
      toast.success("Code copied to clipboard");
    }
  };

  const flashCount = useMemo(
    () => availableDeals.filter((deal) => deal.deal_type === "flash").length,
    [availableDeals]
  );
  const visibleClaims = isLoggedIn ? claimedDeals : [];

  async function handleClaim(dealId: string, alreadyClaimed?: boolean) {
    if (alreadyClaimed) return;

    if (!isLoggedIn) {
      toast.error("Sign in required", {
        description: "Please sign in to claim deals.",
      });
      return;
    }

    try {
      await claimDeal.mutateAsync(dealId);
      toast.success("Deal claimed", {
        description: "Your deal is now in the Claimed tab.",
      });
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Failed to claim deal";
      toast.error("Unable to claim deal", { description });
    }
  }

  const isLoading = availableLoading || (isLoggedIn && claimsLoading);
  const isError = availableError || (isLoggedIn && claimsError);

  return (
    <div className="relative min-h-screen bg-background">
      <Header />

      <div className="pt-20 pb-12">
        <div className="mx-auto max-w-6xl px-6">
          <AnimatedSection animation="fade-up">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Tag className="h-6 w-6 text-chart-2" />
                  <h1 className="text-3xl font-bold tracking-tight">Deals & Offers</h1>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={scrapeDeals.isPending}
                  onClick={async () => {
                    try {
                      const result = await scrapeDeals.mutateAsync(undefined);
                      if (result.dealsFound > 0) {
                        toast.success(`Found ${result.dealsFound} new deal${result.dealsFound === 1 ? "" : "s"}`, {
                          description: `Scanned ${result.scraped} business website${result.scraped === 1 ? "" : "s"}`,
                        });
                      } else {
                        toast.info("No new deals found", {
                          description: result.scraped > 0
                            ? `Scanned ${result.scraped} business website${result.scraped === 1 ? "" : "s"}`
                            : "No businesses to scan right now",
                        });
                      }
                    } catch {
                      toast.error("Failed to scan for deals");
                    }
                  }}
                >
                  {scrapeDeals.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Scan for Deals
                    </>
                  )}
                </Button>
              </div>
              <p className="text-muted-foreground">
                Live offers and mission rewards from local businesses
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={0.1}>
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-chart-2/10 flex items-center justify-center">
                    <Tag className="h-6 w-6 text-chart-2" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold" data-testid="stat-available">
                      {availableDeals.length}
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
                    <div className="text-2xl font-bold" data-testid="stat-flash">
                      {flashCount}
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
                    <div className="text-2xl font-bold" data-testid="stat-claimed">
                      {visibleClaims.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Claimed</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </AnimatedSection>

          {isLoading && (
            <div className="py-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">Loading deals...</p>
            </div>
          )}

          {!isLoading && isError && (
            <div className="py-12 text-center">
              <AlertCircle className="h-6 w-6 mx-auto mb-3 text-destructive" />
              <p className="font-medium">Could not load deals</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try refreshing in a moment.
              </p>
            </div>
          )}

          {!isLoading && !isError && (
            <AnimatedSection animation="fade-up" delay={0.15}>
              <Tabs defaultValue="available" className="w-full">
                <TabsList className="mb-6">
                  <TabsTrigger value="available">Available Deals</TabsTrigger>
                  <TabsTrigger value="claimed">Claimed</TabsTrigger>
                </TabsList>

                <TabsContent value="available" className="space-y-4">
                  {availableDeals.length === 0 && (
                    <div className="text-center py-16">
                      <div className="text-4xl mb-4">🏷️</div>
                      <h2 className="text-lg font-semibold mb-2">
                        No available deals right now
                      </h2>
                      <p className="text-muted-foreground">
                        Check back soon for new local offers.
                      </p>
                    </div>
                  )}

                  {availableDeals.map((deal, index) => {
                    const businessHref = deal.business?.id ? `/business/${deal.business.id}` : null;
                    const isDemoDeal = deal.id.startsWith("demo-");
                    const actionLabel = deal.isClaimed
                      ? "Claimed"
                      : deal.deal_type === "boost_mission"
                        ? "Continue Mission"
                        : "Claim Deal";
                    const isClaiming = claimDeal.isPending;

                    return (
                      <AnimatedSection
                        key={deal.id}
                        animation="fade-up"
                        delay={0.05 * (index + 1)}
                      >
                        <Card className="group">
                          <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row md:items-center gap-6">
                              <div className="text-5xl">
                                {deal.business?.category?.icon || "🏪"}
                              </div>

                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <h2 className="text-lg font-semibold">
                                    {businessHref ? (
                                      <Link href={businessHref} className="text-primary hover:underline">
                                        {deal.title}
                                      </Link>
                                    ) : (
                                      deal.title
                                    )}
                                  </h2>
                                  {deal.deal_type === "boost_mission" && (
                                    <Badge className="bg-chart-3 text-white">Boost Mission</Badge>
                                  )}
                                  {deal.deal_type === "flash" && (
                                    <Badge className="bg-destructive text-white">
                                      Flash Deal
                                    </Badge>
                                  )}
                                  {deal.source === "scraped" && (
                                    <Badge variant="outline">From website</Badge>
                                  )}
                                  {deal.business?.category?.name && (
                                    <Badge variant="secondary">
                                      {deal.business.category.name}
                                    </Badge>
                                  )}
                                </div>

                                <p className="text-muted-foreground mb-2">{deal.description}</p>

                                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {businessHref ? (
                                      <Link href={businessHref} className="text-primary hover:underline">
                                        {deal.business?.name || "Local business"}
                                      </Link>
                                    ) : (
                                      deal.business?.name || "Local business"
                                    )}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Star className="h-3 w-3 fill-chart-5 text-chart-5" />
                                    {deal.business?.average_rating || "New"} (
                                    {deal.business?.review_count || 0} reviews)
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatExpiry(deal.end_date)}
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-2">
                                <div className="text-2xl font-bold text-chart-2">
                                  {formatDiscount(deal.discount_type, deal.discount_value)}
                                </div>
                                {isDemoDeal && businessHref ? (
                                  <Link href={businessHref} className="inline-block">
                                    <Button className="group" size="sm">
                                      View Business
                                      <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                    </Button>
                                  </Link>
                                ) : (
                                  <Button
                                    className="group"
                                    size="sm"
                                    disabled={deal.isClaimed || isClaiming}
                                    onClick={() => handleClaim(deal.id, deal.isClaimed)}
                                  >
                                    {isClaiming ? "Claiming..." : actionLabel}
                                    <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                  </Button>
                                )}
                                {deal.code && (
                                  <div className="text-xs text-muted-foreground">
                                    Code:{" "}
                                    <span className="font-mono font-medium">{deal.code}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </AnimatedSection>
                    );
                  })}
                </TabsContent>

                <TabsContent value="claimed" className="space-y-4">
                  {visibleClaims.length === 0 && (
                    <div className="text-center py-16">
                      <div className="text-4xl mb-4">🎁</div>
                      <h2 className="text-lg font-semibold mb-2">No claimed deals yet</h2>
                      <p className="text-muted-foreground">
                        Claim an offer to see it here.
                      </p>
                    </div>
                  )}

                  {visibleClaims.map((claim, index) => (
                    <AnimatedSection
                      key={claim.id}
                      animation="fade-up"
                      delay={0.05 * (index + 1)}
                    >
                      <Card className="bg-muted/30">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-6">
                            <div className="text-5xl opacity-70">
                              {getBusinessIcon(claim.deal)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-lg font-semibold">
                                  {claim.deal.business?.id ? (
                                    <Link href={`/business/${claim.deal.business.id}`} className="text-primary hover:underline">
                                      {claim.deal.title}
                                    </Link>
                                  ) : (
                                    claim.deal.title
                                  )}
                                </h2>
                                <Badge variant="outline">
                                  {claim.redeemed_at ? "Used" : "Claimed"}
                                </Badge>
                              </div>
                              <p className="text-muted-foreground text-sm">
                                {claim.deal.description}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                <span>
                                  {claim.deal.business?.id ? (
                                    <Link href={`/business/${claim.deal.business.id}`} className="text-primary hover:underline">
                                      {claim.deal.business?.name || "Local business"}
                                    </Link>
                                  ) : (
                                    claim.deal.business?.name || "Local business"
                                  )}
                                </span>
                                <span>Claimed {formatClaimedAt(claim.claimed_at)}</span>
                                {claim.redeemed_code && (
                                  <span className="font-mono">{claim.redeemed_code}</span>
                                )}
                              </div>
                            </div>
                            <div className="text-xl font-bold text-muted-foreground">
                              {formatDiscount(
                                claim.deal.discount_type,
                                claim.deal.discount_value
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </AnimatedSection>
                  ))}
                </TabsContent>
              </Tabs>
            </AnimatedSection>
          )}
        </div>
      </div>

      {/* Claim Success Dialog */}
      <Dialog open={!!claimedDeal} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deal Claimed! 🎉</DialogTitle>
            <DialogDescription>
              {claimedDeal?.deal?.title} at {claimedDeal?.deal?.business?.name}
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
                  aria-label={copiedCode ? "Code copied" : "Copy redemption code"}
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
