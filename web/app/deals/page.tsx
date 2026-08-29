"use client";

import { useMemo, useState } from "react";
import {
  Loader2,
  AlertCircle,
  Check,
  Copy,
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

/** Loading placeholder matching the deal row pitch (prevents CLS). */
function DealRowSkeleton() {
  return (
    <div className="flex gap-4 py-4">
      <Skeleton className="h-6 w-20 shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-full max-w-md" />
        <Skeleton className="h-3 w-24" />
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
        <div className="mx-auto max-w-5xl">
          <AnimatedSection animation="fade-up">
            <div className="mb-6 flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <h1 className="text-h2 font-medium">
                  Deals
                </h1>
                <p className="mt-1.5 text-small text-muted-foreground">
                  Current offers from local businesses and rewards from active missions.
                </p>
                {!isLoading && (
                  <p className="mt-3 flex flex-wrap items-baseline gap-x-1.5 font-mono text-meta tabular-nums text-text-tertiary">
                    <span data-testid="stat-available" className="font-mono text-foreground">
                      {availableDeals.length} available
                    </span>
                    <span aria-hidden="true">·</span>
                    <span data-testid="stat-flash" className="font-mono">
                      {flashCount} flash
                    </span>
                    <span aria-hidden="true">·</span>
                    <span data-testid="stat-claimed" className="font-mono">
                      {visibleClaims.length} claimed
                    </span>
                  </p>
                )}
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
                    Scan for deals
                  </>
                )}
              </Button>
            </div>
          </AnimatedSection>

          {isLoading && (
            <div className="divide-y divide-border" data-testid="deals-skeleton" aria-busy="true" aria-label="Loading deals">
              {[0, 1, 2, 3, 4].map((i) => (
                <DealRowSkeleton key={i} />
              ))}
            </div>
          )}

          {!isLoading && isError && (
            <div className="py-10">
              <AlertCircle className="mb-3 h-5 w-5 text-destructive" aria-hidden="true" />
              <p className="text-body font-medium">Could not load deals</p>
              <p className="mt-1 text-small text-muted-foreground">
                Try refreshing in a moment.
              </p>
            </div>
          )}

          {!isLoading && !isError && (
            <AnimatedSection animation="fade-up" delay={0.15}>
              <Tabs defaultValue="available" className="w-full">
                <TabsList className={cn(underlineTabsListClass, "mb-6")}>
                  <TabsTrigger value="available" className={underlineTabsTriggerClass}>
                    Available
                  </TabsTrigger>
                  <TabsTrigger value="claimed" className={underlineTabsTriggerClass}>
                    Claimed
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="available" className="divide-y divide-border border-t border-border">
                  {availableDeals.length === 0 && (
                    <div className="py-10">
                      <h2 className="text-body font-medium">
                        No available deals right now
                      </h2>
                      <p className="mt-1 text-small text-muted-foreground">
                        Check back soon for new local offers.
                      </p>
                    </div>
                  )}

                  {availableDeals.map((deal) => {
                    const businessHref = deal.business?.id ? `/business/${deal.business.id}` : null;
                    const isDemoDeal = deal.id.startsWith("demo-");
                    const actionLabel = deal.isClaimed
                      ? "Claimed"
                      : deal.deal_type === "boost_mission"
                        ? "Continue Mission"
                        : "Claim Deal";
                    const isClaiming = claimDeal.isPending;

                    return (
                      <div key={deal.id} className="card-lift flex gap-4 px-2 py-4">
                        {/* Discount is the ranked figure: largest, leftmost */}
                        <div className="w-24 shrink-0 pt-0.5">
                          <p className="font-mono text-lead leading-none text-foreground">
                            {formatDiscount(deal.discount_type, deal.discount_value)}
                          </p>
                          <p className="mt-1.5 font-mono text-meta text-muted-foreground">
                            {formatExpiry(deal.end_date)}
                          </p>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                            <h2 className="text-body font-medium">
                              {businessHref ? (
                                <Link href={businessHref} className="hover:text-primary">
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
                              <Badge variant="outline">Flash Deal</Badge>
                            )}
                            {deal.source === "scraped" && (
                              <Badge variant="outline">From website</Badge>
                            )}
                          </div>

                          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 font-mono text-meta uppercase tracking-[0.02em] text-text-tertiary">
                            <span>
                              {businessHref ? (
                                <Link href={businessHref} className="hover:text-primary">
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
                            <span className="tabular-nums">
                              {deal.business?.average_rating || "New"} / {deal.business?.review_count || 0} reviews
                            </span>
                          </p>

                          <p className="mt-1.5 text-small text-muted-foreground">
                            {deal.description}
                          </p>

                          <div className="mt-2.5 flex flex-wrap items-center gap-3">
                            {isDemoDeal && businessHref ? (
                              <Button asChild size="xs" variant="outline">
                                <Link href={businessHref}>View business</Link>
                              </Button>
                            ) : (
                              <Button
                                size="xs"
                                disabled={deal.isClaimed || isClaiming}
                                onClick={() => handleClaim(deal.id, deal.isClaimed)}
                              >
                                {isClaiming ? "Claiming..." : actionLabel}
                              </Button>
                            )}
                            {deal.code && (
                              <span className="rounded bg-muted px-2 py-0.5 font-mono text-meta">
                                {deal.code}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </TabsContent>

                <TabsContent value="claimed" className="divide-y divide-border border-t border-border">
                  {visibleClaims.length === 0 && (
                    <div className="py-10">
                      <h2 className="text-body font-medium">No claimed deals yet</h2>
                      <p className="mt-1 text-small text-muted-foreground">
                        Claim an offer to see it here.
                      </p>
                    </div>
                  )}

                  {visibleClaims.map((claim) => (
                    <div key={claim.id} className="card-lift flex gap-4 px-2 py-4">
                      <div className="w-24 shrink-0 pt-0.5">
                        <p className="font-mono text-lead leading-none text-muted-foreground">
                          {formatDiscount(
                            claim.deal.discount_type,
                            claim.deal.discount_value
                          )}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <h2 className="text-body font-medium">
                            {claim.deal.business?.id ? (
                              <Link href={`/business/${claim.deal.business.id}`} className="hover:text-primary">
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
                        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 font-mono text-meta uppercase tracking-[0.02em] text-text-tertiary">
                          <span>
                            {claim.deal.business?.id ? (
                              <Link href={`/business/${claim.deal.business.id}`} className="hover:text-primary">
                                {claim.deal.business?.name || "Local business"}
                              </Link>
                            ) : (
                              claim.deal.business?.name || "Local business"
                            )}
                          </span>
                          <span aria-hidden="true">&middot;</span>
                          <span>Claimed {formatClaimedAt(claim.claimed_at)}</span>
                        </p>
                        <p className="mt-1.5 text-small text-muted-foreground">
                          {claim.deal.description}
                        </p>
                        {claim.redeemed_code && (
                          <p className="mt-2.5">
                            <span className="rounded bg-muted px-2 py-0.5 font-mono text-meta">
                              {claim.redeemed_code}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
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
                <code className="rounded-md bg-muted px-4 py-2 font-mono text-h2">
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
