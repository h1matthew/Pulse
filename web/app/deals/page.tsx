"use client";

import { useMemo, useState } from "react";
import {
  Tag,
  Gift,
  MapPin,
  Star,
  ChevronRight,
  Loader2,
  AlertCircle,
  Check,
  Copy,
  Clock,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  if (!endDate) return "no expiration";
  const end = new Date(endDate);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  if (diffMs <= 0) return "expired";

  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const totalDays = Math.floor(totalHours / 24);

  if (totalDays > 0) {
    return `ends in ${totalDays} day${totalDays === 1 ? "" : "s"}`;
  }
  return `ends in ${totalHours} hour${totalHours === 1 ? "" : "s"}`;
}

function formatClaimedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleDateString();
}

/** Loading placeholder matching the deal card layout (prevents CLS). */
function DealCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-center">
        <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="flex flex-col items-start gap-2 md:items-end">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export default function DealsPage() {
  const { isLoggedIn } = useAuth();

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
    <div className="min-h-screen">
      <Header />

      <main className="px-6 pb-12 pt-32">
        <div className="mx-auto max-w-6xl">
          <AnimatedSection animation="fade-up">
            <div className="mb-8 flex flex-col gap-5 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Save local
                </p>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Deals & Offers
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
                  Live offers and mission rewards from local businesses
                </p>
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
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Scan for Deals
                  </>
                )}
              </Button>
            </div>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={0.1}>
            <div className="mb-8 grid gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Tag className="h-5 w-5 text-primary" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="mb-1 h-7 w-10" />
                  ) : (
                    <div className="font-mono text-2xl font-semibold" data-testid="stat-available">
                      {availableDeals.length}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">Available Deals</div>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="mb-1 h-7 w-10" />
                  ) : (
                    <div className="font-mono text-2xl font-semibold" data-testid="stat-flash">
                      {flashCount}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">Flash Deals</div>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Gift className="h-5 w-5 text-primary" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="mb-1 h-7 w-10" />
                  ) : (
                    <div className="font-mono text-2xl font-semibold" data-testid="stat-claimed">
                      {visibleClaims.length}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">Claimed</div>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {isLoading && (
            <div className="space-y-4" data-testid="deals-skeleton" aria-busy="true" aria-label="Loading deals">
              {[0, 1, 2, 3].map((i) => (
                <DealCardSkeleton key={i} />
              ))}
            </div>
          )}

          {!isLoading && isError && (
            <div className="py-12 text-center">
              <AlertCircle className="mx-auto mb-3 h-6 w-6 text-destructive" />
              <p className="font-medium">Could not load deals</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try refreshing in a moment.
              </p>
            </div>
          )}

          {!isLoading && !isError && (
            <AnimatedSection animation="fade-up" delay={0.15}>
              <Tabs defaultValue="available" className="w-full">
                <TabsList className={cn(underlineTabsListClass, "mb-6")}>
                  <TabsTrigger value="available" className={underlineTabsTriggerClass}>
                    Available Deals
                  </TabsTrigger>
                  <TabsTrigger value="claimed" className={underlineTabsTriggerClass}>
                    Claimed
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="available" className="space-y-4">
                  {availableDeals.length === 0 && (
                    <div className="rounded-lg border border-border bg-card py-16 text-center">
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Tag className="h-6 w-6 text-primary" aria-hidden="true" />
                      </div>
                      <h2 className="mb-2 text-lg font-semibold">
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
                        <div className="rounded-lg border border-border bg-card p-6">
                          <div className="flex flex-col gap-6 md:flex-row md:items-center">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                              <Tag className="h-6 w-6 text-primary" aria-hidden="true" />
                            </div>

                            <div className="flex-1">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <h2 className="text-lg font-semibold">
                                  {businessHref ? (
                                    <Link href={businessHref} className="hover:text-primary hover:underline">
                                      {deal.title}
                                    </Link>
                                  ) : (
                                    deal.title
                                  )}
                                </h2>
                                {deal.deal_type === "boost_mission" && (
                                  <Badge variant="secondary">Boost Mission</Badge>
                                )}
                                {deal.deal_type === "flash" && (
                                  <Badge variant="outline" className="border-primary/40 text-primary">
                                    Flash Deal
                                  </Badge>
                                )}
                                {deal.source === "scraped" && (
                                  <Badge variant="outline">From website</Badge>
                                )}
                              </div>

                              <p className="mb-2 text-sm leading-6 text-muted-foreground">
                                {deal.description}
                              </p>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1 font-medium text-foreground">
                                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                                  {businessHref ? (
                                    <Link href={businessHref} className="hover:text-primary hover:underline">
                                      {deal.business?.name || "Local business"}
                                    </Link>
                                  ) : (
                                    deal.business?.name || "Local business"
                                  )}
                                </span>
                                {deal.business?.category?.name && (
                                  <>
                                    <span aria-hidden="true">&middot;</span>
                                    <span>{deal.business.category.name}</span>
                                  </>
                                )}
                                <span aria-hidden="true">&middot;</span>
                                <span className="flex items-center gap-1">
                                  <Star className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span className="font-mono">
                                    {deal.business?.average_rating || "New"}
                                  </span>
                                  ({deal.business?.review_count || 0} reviews)
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-col items-start gap-2 md:items-end">
                              <div className="font-mono text-2xl font-semibold text-primary">
                                {formatDiscount(deal.discount_type, deal.discount_value)}
                              </div>
                              <span className="font-mono text-xs text-muted-foreground">
                                {formatExpiry(deal.end_date)}
                              </span>
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
                                  <span className="rounded bg-muted px-2 py-0.5 font-mono font-medium">
                                    {deal.code}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </AnimatedSection>
                    );
                  })}
                </TabsContent>

                <TabsContent value="claimed" className="space-y-4">
                  {visibleClaims.length === 0 && (
                    <div className="rounded-lg border border-border bg-card py-16 text-center">
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Gift className="h-6 w-6 text-primary" aria-hidden="true" />
                      </div>
                      <h2 className="mb-2 text-lg font-semibold">No claimed deals yet</h2>
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
                      <div className="rounded-lg border border-border bg-card p-6">
                        <div className="flex items-center gap-6">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <Gift className="h-6 w-6 text-primary" aria-hidden="true" />
                          </div>
                          <div className="flex-1">
                            <div className="mb-1 flex items-center gap-2">
                              <h2 className="text-lg font-semibold">
                                {claim.deal.business?.id ? (
                                  <Link href={`/business/${claim.deal.business.id}`} className="hover:text-primary hover:underline">
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
                            <p className="text-sm text-muted-foreground">
                              {claim.deal.description}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                              <span>
                                {claim.deal.business?.id ? (
                                  <Link href={`/business/${claim.deal.business.id}`} className="hover:text-primary hover:underline">
                                    {claim.deal.business?.name || "Local business"}
                                  </Link>
                                ) : (
                                  claim.deal.business?.name || "Local business"
                                )}
                              </span>
                              <span aria-hidden="true">&middot;</span>
                              <span>Claimed {formatClaimedAt(claim.claimed_at)}</span>
                              {claim.redeemed_code && (
                                <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
                                  {claim.redeemed_code}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="font-mono text-xl font-semibold text-muted-foreground">
                            {formatDiscount(
                              claim.deal.discount_type,
                              claim.deal.discount_value
                            )}
                          </div>
                        </div>
                      </div>
                    </AnimatedSection>
                  ))}
                </TabsContent>
              </Tabs>
            </AnimatedSection>
          )}
        </div>
      </main>

      {/* Claim Success Dialog */}
      <Dialog open={!!claimedDeal} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deal claimed</DialogTitle>
            <DialogDescription>
              {claimedDeal?.deal?.title} at {claimedDeal?.deal?.business?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center">
              <p className="mb-2 text-sm text-muted-foreground">Your redemption code:</p>
              <div className="flex items-center justify-center gap-2">
                <code className="rounded-lg bg-muted px-4 py-2 font-mono text-2xl font-semibold">
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
            <p className="text-center text-xs text-muted-foreground">
              Show this code to the business to redeem your deal.
            </p>
          </div>
          <Button onClick={handleCloseDialog} className="w-full">
            Got it
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
