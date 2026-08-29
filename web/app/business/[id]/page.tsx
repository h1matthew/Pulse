"use client";

import { use, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Phone,
  Globe,
  Star,
  Heart,
  Share2,
  Navigation,
  CheckCircle,
  Send,
  ExternalLink,
  Loader2,
  MapPinned,
} from "lucide-react";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  underlineTabsListClass,
  underlineTabsTriggerClass,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useBusiness } from "@/hooks/useBusinesses";
import { TOUR_DEMO_BUSINESS_ID } from "@/lib/demo/demo-business";
import { useClaimDeal } from "@/hooks/useDeals";
import {
  useIsBookmarked,
  useToggleBookmark,
} from "@/hooks/useBookmarks";
import { useAuth } from "@/components/providers/AuthProvider";
import { PhotoGallery } from "@/components/features/business/PhotoGallery";
import {
  ReceiptCheckInDialog,
  type CheckInSuccessResult,
} from "@/components/features/business/ReceiptCheckInDialog";
import { BaanihaliPuzzleCaptcha } from "@/components/features/bot/BaanihaliPuzzleCaptcha";
import { toast } from "sonner";
import { NavLink } from "@/components/ui/nav-link";
import {
  buildBusinessFallbackImageUrl,
  buildBusinessPhotoUrl,
  buildBusinessSummary,
  formatTagLabel,
  getBusinessReviewLabel,
  getGoogleMapsReviewUrl,
  shouldShowGoogleReviewHint,
} from "@/lib/business/display";
import {
  buildCombinedReviewFeed,
  buildReviewPageNumbers,
  paginateCombinedReviewFeed,
} from "@/lib/business/review-feed";
import { createReviewSchema } from "@/lib/validation";

/**
 * Business detail pages render content instantly — no entrance or scroll-reveal
 * animations. This local no-op shadows the shared AnimatedSection so the markup
 * below stays unchanged while every section simply appears in place.
 */
function AnimatedSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  animation?: string;
  delay?: number;
  once?: boolean;
}) {
  return <div className={className}>{children}</div>;
}

/**
 * ============================================================================
 * UX DESIGN: Business Detail Page
 * ============================================================================
 *
 * USER JOURNEY:
 *   1. User arrives from a Discover row or direct link → identity block loads
 *   2. Tabs (About · Reviews · Deals) let the user explore without page navigation
 *   3. "Leave a Review" form validates client-side (Zod) before POST; CAPTCHA on submit
 *   4. Save and Share sit next to Directions in the identity block
 *   5. Check-in CTA records a visit, which later grants "Verified" badge on reviews
 *   6. Deals tab shows claimable offers with one-click claim + redemption code copy
 *
 * DESIGN RATIONALE:
 *   - Rating numeral leads the identity block; the photo is evidence beside it
 *   - Facts sit in labelled definition rows so address, phone, and hours scan
 *   - Review form shows inline field errors (not just toasts) for immediate correction
 *   - Star rating uses interactive star buttons with aria-label per star for a11y
 *
 * ACCESSIBILITY FEATURES:
 *   - Interactive star rating buttons each have aria-label ("Rate N stars")
 *   - Review textarea has aria-describedby linking to validation error messages
 *   - Tab triggers use Radix TabsList with built-in keyboard nav (arrow keys)
 *   - Bookmark/share icon buttons carry descriptive aria-labels
 *   - Loading skeleton uses aria-busy for screen reader announcement
 *
 * INPUT VALIDATION (reviews):
 *   - Syntactical: Zod schema enforces rating 1-5 (int), content 10-2000 chars,
 *     business_id as UUID, photos as URL array (max 5)
 *   - Semantic: duplicate review check (409), verified_purchase from check-in history,
 *     CAPTCHA token verified server-side, content sanitized against XSS
 * ============================================================================
 */

interface BusinessDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function BusinessDetailPage({
  params,
}: BusinessDetailPageProps) {
  const { id } = use(params);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [heroPhotoFailed, setHeroPhotoFailed] = useState(false);
  const [isSyncingReviews, setIsSyncingReviews] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [reviewErrors, setReviewErrors] = useState<Record<string, string>>({});
  const [reviewCaptchaToken, setReviewCaptchaToken] = useState<string | null>(null);
  const [showReviewCaptcha, setShowReviewCaptcha] = useState(false);
  const [aiDescription, setAiDescription] = useState<string | null>(null);
  const [aiDescriptionCached, setAiDescriptionCached] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  const { data: business, isLoading, isError, refetch } = useBusiness(id);
  const canonicalBusinessId = business?.id || id;
  const { data: isBookmarked } = useIsBookmarked(canonicalBusinessId);
  const toggleBookmark = useToggleBookmark();
  const claimDeal = useClaimDeal();

  useEffect(() => {
    setHeroPhotoFailed(false);
  }, [business?.id]);

  // Reflect an existing check-in on load so the button doesn't invite a
  // doomed second attempt (the API would 409 it)
  useEffect(() => {
    if (!user || !canonicalBusinessId) return;
    let cancelled = false;
    fetch(`/api/businesses/${canonicalBusinessId}/checkin`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.checkedInToday) setHasCheckedIn(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, canonicalBusinessId]);

  // Submit review with a specific CAPTCHA token (called directly from CAPTCHA onVerify)
  const submitReviewWithToken = async (token: string) => {
    if (!business?.id || !user) return;
    const isDemoBusiness = business.id.startsWith('demo-') || business.id === 'onboarding-demo';
    setIsSubmittingReview(true);
    try {
      if (isDemoBusiness) {
        toast.success("Review submitted", { description: "Thank you for sharing your experience!" });
        setReviewText("");
        setReviewRating(5);
        setReviewCaptchaToken(null);
        return;
      }
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: business.id,
          rating: reviewRating,
          content: reviewText,
          captchaToken: token,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to submit review");
      }
      toast.success("Review submitted", { description: "Thank you for sharing your experience!" });
      setReviewText("");
      setReviewRating(5);
      setReviewCaptchaToken(null);
      queryClient.invalidateQueries({ queryKey: ["businesses", "detail"] });
      refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit review.";
      toast.error("Review failed", { description: message });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  useEffect(() => {
    setReviewsPage(1);
  }, [business?.id, business?.reviews?.length, business?.external_reviews?.length]);

  const handleBookmark = async () => {
    if (!user) {
      toast.error("Sign in required", {
        description: "Please sign in to bookmark businesses",
      });
      return;
    }

    try {
      await toggleBookmark.mutateAsync({
        businessId: canonicalBusinessId,
        isBookmarked: isBookmarked || false,
      });
      toast.success(isBookmarked ? "Bookmark removed" : "Business bookmarked", {
        description: isBookmarked
          ? "Removed from your saved businesses"
          : "Added to your saved businesses",
      });
    } catch {
      toast.error("Error", {
        description: "Failed to update bookmark",
      });
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: business?.name || "",
        text: buildBusinessSummary({
          name: business?.name || "",
          short_description: business?.short_description,
          description: business?.description,
          categoryName: business?.category?.name,
          city: business?.city,
          state: business?.state,
          tags: business?.tags,
        }),
        url: window.location.href,
      });
    } catch {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied", {
        description: "Business link copied to clipboard",
      });
    }
  };

  const handleGetDirections = () => {
    if (business?.address) {
      const query = encodeURIComponent(
        `${business.address}, ${business.city}, ${business.state} ${business.zip_code}`
      );
      window.open(`https://maps.google.com/?q=${query}`, "_blank");
    }
  };

  const handleSubmitReview = async () => {
    // ACCESSIBILITY: Auth gate — screen readers will hear the toast error message
    if (!user) {
      toast.error("Sign in required", {
        description: "Please sign in to leave a review",
      });
      return;
    }

    // INPUT VALIDATION — Syntactical (Zod schema):
    //   • business_id must be a valid UUID
    //   • rating must be an integer between 1 and 5
    //   • content must be 10–2000 characters
    //   • photos (optional) must be valid URL strings, max 5
    // INPUT VALIDATION — Semantic:
    //   • Server rejects duplicate reviews for the same business (409)
    //   • Server checks CAPTCHA token if provided (bot prevention)
    //   • Server determines verified_purchase from check-in history
    const validation = createReviewSchema.safeParse({
      business_id: business?.id || id,
      rating: reviewRating,
      content: reviewText,
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const field = issue.path[0]?.toString() || "form";
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setReviewErrors(fieldErrors);
      return;
    }

    setReviewErrors({});

    if (!business?.id) {
      toast.error("Business unavailable", {
        description: "Could not resolve this business. Please refresh and try again.",
      });
      return;
    }

    // Bot prevention: CAPTCHA must be verified (button is disabled without it)
    if (!reviewCaptchaToken) {
      toast.error("CAPTCHA required", { description: "Please verify the CAPTCHA first." });
      return;
    }

    const isDemoBusiness = business.id.startsWith('demo-') || business.id === 'onboarding-demo';

    try {
      if (isDemoBusiness) {
        toast.success("Review submitted", { description: "Thank you for sharing your experience!" });
        setReviewText("");
        setReviewRating(5);
        setReviewCaptchaToken(null);
        return;
      }

      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: business.id,
          rating: reviewRating,
          content: reviewText,
          captchaToken: reviewCaptchaToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to submit review");
      }

      toast.success("Review submitted", {
        description: "Thank you for sharing your experience!",
      });
      setReviewText("");
      setReviewRating(5);
      setReviewCaptchaToken(null);
      queryClient.invalidateQueries({ queryKey: ["businesses", "detail"] });
      refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit review. Please try again.";
      toast.error("Error", { description: message });
    }
  };

  const handleSyncGoogleReviews = async (silent = false) => {
    if (!business?.place_id) {
      if (!silent) {
        toast.error("No Google Place ID", {
          description: "This business doesn't have a Google Place ID.",
        });
      }
      return;
    }

    setIsSyncingReviews(true);
    try {
      const response = await fetch(`/api/businesses/${canonicalBusinessId}/reviews/sync`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to sync reviews");
      }

      const result = await response.json();
      if (!silent) {
        toast.success("Reviews synced", {
          description:
            result.synced > 0
              ? `Synced ${result.synced} Google reviews`
              : result.google_review_count > 0
                ? "Sync complete. Review metadata refreshed."
                : "Sync complete. No new reviews found.",
        });
      }

      // Refresh business data to show new reviews
      queryClient.invalidateQueries({ queryKey: ["businesses", "detail"] });
      refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to sync reviews";
      if (!silent) {
        toast.error("Error", { description: message });
      } else {
        console.error("Auto-sync reviews failed:", message);
      }
    } finally {
      setIsSyncingReviews(false);
    }
  };

  const handleCheckIn = () => {
    if (!user) {
      toast.error("Sign in required", {
        description: "Please sign in to check in",
      });
      return;
    }
    // Check-ins require receipt proof — collected and verified in the dialog.
    setCheckInOpen(true);
  };

  const handleCheckInVerified = (result: CheckInSuccessResult) => {
    setHasCheckedIn(true);
    const total = result.verification?.total;
    toast.success("Receipt verified — checked in!", {
      description:
        total != null
          ? `$${total.toFixed(2)} kept local at ${business?.name ?? "this business"}.`
          : `Your visit to ${business?.name ?? "this business"} is logged.`,
    });
    for (const update of result.missionUpdates ?? []) {
      if (update.completed) {
        toast.success(`Mission complete: ${update.title}!`, {
          description: "Check the missions page to claim your reward.",
        });
      } else {
        toast.info(`${update.title}: ${update.currentCount}/${update.targetCount}`, {
          description: "Verified visit counted toward your mission.",
        });
      }
    }
    queryClient.invalidateQueries({ queryKey: ["missions", "progress"] });
    queryClient.invalidateQueries({ queryKey: ["impact"] });
    queryClient.invalidateQueries({ queryKey: ["activity"] });
  };

  const handleGenerateDescription = async (force = false, silent = false) => {
    setIsGeneratingDescription(true);
    try {
      const url = `/api/businesses/${canonicalBusinessId}/generate-description${force ? '?force=true' : ''}`;
      const response = await fetch(url, { method: 'POST' });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate description');
      }

      const data = await response.json();
      setAiDescription(data.description);
      setAiDescriptionCached(data.cached || false);

      if (!silent) {
        if (data.cached) {
          toast.info('Using cached description', {
            description: 'This description was previously generated.',
          });
        } else {
          toast.success('Description generated!', {
            description: force
              ? 'Fresh AI description created.'
              : 'AI description created from website and reviews.',
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate description';
      if (!silent) {
        toast.error('Error', { description: message });
      } else {
        console.error('Auto-generate description failed:', message);
      }
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handleClaimDeal = async (dealId: string) => {
    if (!user) {
      toast.error("Sign in required", {
        description: "Please sign in to claim deals",
      });
      return;
    }

    try {
      await claimDeal.mutateAsync(dealId);
      toast.success("Deal claimed", {
        description: "Your deal is now available in your claims.",
      });
      queryClient.invalidateQueries({ queryKey: ["businesses", "detail"] });
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Failed to claim deal.";
      toast.error("Could not claim deal", {
        description: message,
      });
    }
  };

  // Show skeleton while loading OR before the query has resolved (prevents hydration mismatch
  // where server renders "not found" but client starts with loading state)
  if (isLoading || (!business && !isError)) {
    return (
      <div className="relative min-h-screen">
        <Header />
        <div className="pt-28 pb-12">
          <div className="mx-auto max-w-6xl px-6">
            <Skeleton className="h-64 w-full mb-6" />
            <Skeleton className="h-8 w-1/3 mb-4" />
            <Skeleton className="h-4 w-1/4 mb-8" />
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="relative min-h-screen">
        <Header />
        <div className="pt-28 pb-12">
          <div className="mx-auto max-w-6xl px-6">
            <h1 className="text-h2 font-medium">Business not found</h1>
            <p className="mt-1.5 text-small text-muted-foreground">
              The business you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
            <NavLink href="/discover" className="mt-5 inline-block">
              <Button size="sm">Browse Businesses</Button>
            </NavLink>
          </div>
        </div>
      </div>
    );
  }

  const getPriceRange = (level: number | null) => {
    if (!level) return "";
    return "$".repeat(level);
  };

  const getBusinessHours = (rawHours: unknown): { hours: Record<string, string>; today: string } => {
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const today = dayNames[new Date().getDay()];

    // Google Places v2 stores hours as string array: ["Monday: 9 AM – 5 PM", ...]
    if (Array.isArray(rawHours)) {
      const parsed: Record<string, string> = {};
      for (const entry of rawHours) {
        if (typeof entry === "string") {
          const colonIdx = entry.indexOf(":");
          if (colonIdx > 0) {
            const day = entry.substring(0, colonIdx).trim().toLowerCase();
            const time = entry.substring(colonIdx + 1).trim();
            parsed[day] = time;
          }
        }
      }
      return { hours: parsed, today };
    }

    // Legacy format: { monday: "9:00 AM - 5:00 PM", ... }
    if (rawHours && typeof rawHours === "object") {
      return { hours: rawHours as Record<string, string>, today };
    }

    return { hours: {}, today };
  };

  const { hours: businessHours, today } = getBusinessHours(business.hours);
  const localReviews = business.reviews || [];
  const externalReviews = business.external_reviews || [];
  const localReviewCount = business.local_review_count ?? localReviews.length;
  const combinedReviewFeed = buildCombinedReviewFeed(localReviews, externalReviews);
  const combinedReviewCount = combinedReviewFeed.length;
  const reviewTabCount =
    business.data_source === "google"
      ? Math.max(business.review_count || 0, combinedReviewCount)
      : combinedReviewCount;
  const paginatedReviews = paginateCombinedReviewFeed(combinedReviewFeed, reviewsPage);
  const reviewPages = buildReviewPageNumbers(paginatedReviews.totalPages);
  const reviewLabel = getBusinessReviewLabel({
    data_source: business.data_source,
    review_count: business.review_count,
  });
  const defaultTab = reviewTabCount > 0 ? "reviews" : "about";
  const businessSummary = buildBusinessSummary({
    name: business.name,
    short_description: business.short_description,
    description: business.description,
    categoryName: business.category?.name,
    city: business.city,
    state: business.state,
    tags: business.tags,
  });
  const showGoogleReviewHint = shouldShowGoogleReviewHint({
    data_source: business.data_source,
    review_count: business.review_count,
    local_review_count: localReviewCount,
  });
  const isTourDemo = business.id === TOUR_DEMO_BUSINESS_ID;
  const fallbackHeroImageUrl = buildBusinessFallbackImageUrl({
    name: business.name,
    categoryName: business.category?.name,
    // The onboarding tour's demo business gets a plain "Demo" cover — no
    // initials, grid, or accent circles.
    ...(isTourDemo ? { label: "Demo", plain: true } : {}),
  });
  const googleReviewsUrl = getGoogleMapsReviewUrl({
    name: business.name,
    address: [business.address, business.city, business.state]
      .filter(Boolean)
      .join(", "),
    place_id: business.place_id,
  });
  const displaySyncStatus = {
    canSync: false,
    lastSyncedText: "Synced",
    isStale: false,
  };
  const latitude = Number(business.latitude);
  const longitude = Number(business.longitude);
  const hasValidCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  const mapQuery = hasValidCoordinates
    ? `${latitude},${longitude}`
    : [business.address, business.city, business.state, business.zip_code]
        .filter(Boolean)
        .join(", ");
  const mapsEmbedApiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ||
    "";
  const mapEmbedSrc = mapQuery
    ? mapsEmbedApiKey
      ? hasValidCoordinates
        ? `https://www.google.com/maps/embed/v1/view?key=${mapsEmbedApiKey}&center=${latitude},${longitude}&zoom=15`
        : `https://www.google.com/maps/embed/v1/search?key=${mapsEmbedApiKey}&q=${encodeURIComponent(mapQuery)}`
      : `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=15&output=embed`
    : null;

  return (
    <div className="relative min-h-screen">
      <Header />

      {/* Identity block: rating numeral first, then name, then the metadata
          line. The photo sits beside it as evidence, not as a backdrop. */}
      <div className="pt-28 pb-6">
        <div className="mx-auto max-w-6xl px-6">
          <AnimatedSection animation="fade-up">
            <div className="flex flex-col gap-6 border-b border-border pb-6 md:flex-row md:items-start">
              <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-lg border border-border md:h-32 md:w-48">
                {(() => {
                  const photoUrl = buildBusinessPhotoUrl(business.photos?.[0], {
                    maxWidth: 800,
                    maxHeight: 500,
                  });
                  const showPhoto = !!photoUrl && !heroPhotoFailed;
                  return showPhoto ? (
                    <Image
                      src={photoUrl}
                      alt={business.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 192px"
                      priority
                      unoptimized
                      onError={() => setHeroPhotoFailed(true)}
                    />
                  ) : (
                    <Image
                      src={fallbackHeroImageUrl}
                      alt={`${business.name} default cover`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 192px"
                      priority
                      unoptimized
                    />
                  );
                })()}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-3">
                  <p className="font-mono text-h1 leading-none tabular-nums" aria-label={reviewLabel}>
                    {business.average_rating}
                  </p>
                  <h1 className="min-w-0 text-h2 font-medium [text-wrap:balance]">
                    {business.name}
                  </h1>
                </div>

                {/* Fixed slot order: category · neighborhood · price · status */}
                <p className="mt-2 flex flex-wrap items-center gap-x-1.5 font-mono text-meta uppercase tracking-[0.02em] text-text-tertiary">
                  <span>{business.category?.name}</span>
                  {business.city && (
                    <>
                      <span aria-hidden="true">&middot;</span>
                      <span>{[business.city, business.state].filter(Boolean).join(", ")}</span>
                    </>
                  )}
                  {business.price_range && (
                    <>
                      <span aria-hidden="true">&middot;</span>
                      <span>{getPriceRange(business.price_range)}</span>
                    </>
                  )}
                  <span aria-hidden="true">&middot;</span>
                  <span className="tabular-nums">{reviewLabel}</span>
                  {business.is_verified && (
                    <>
                      <span aria-hidden="true">&middot;</span>
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" aria-hidden="true" />
                        Verified
                      </span>
                    </>
                  )}
                  {business.is_featured && (
                    <>
                      <span aria-hidden="true">&middot;</span>
                      <span>Featured</span>
                    </>
                  )}
                </p>

                <p className="mt-2 max-w-2xl text-small text-muted-foreground">
                  {businessSummary}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button size="sm" onClick={handleGetDirections} aria-label="Get directions to this business">
                    <Navigation className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    Directions
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBookmark}
                    disabled={toggleBookmark.isPending}
                    aria-label={isBookmarked ? "Remove bookmark" : "Bookmark this business"}
                    data-tour="business-bookmark"
                  >
                    <Heart
                      className={cn("mr-1.5 h-3.5 w-3.5", isBookmarked && "fill-current")}
                      aria-hidden="true"
                    />
                    {isBookmarked ? "Saved" : "Save"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShare}
                    aria-label="Share this business"
                  >
                    <Share2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    Share
                  </Button>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>

      <div className="pb-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <AnimatedSection animation="fade-up" delay={0.15}>
                <Tabs defaultValue={defaultTab} className="w-full">
                  <TabsList className={underlineTabsListClass}>
                    <TabsTrigger value="about" className={underlineTabsTriggerClass}>
                      About
                    </TabsTrigger>
                    <TabsTrigger
                      value="reviews"
                      className={underlineTabsTriggerClass}
                      data-tour="business-reviews"
                    >
                      Reviews ({reviewTabCount})
                    </TabsTrigger>
                    <TabsTrigger
                      value="deals"
                      className={underlineTabsTriggerClass}
                      data-tour="business-deals"
                    >
                      Deals ({business.deals?.length || 0})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="about" className="mt-5 space-y-6">
                    {/* Contact block — one labelled row per fact */}
                    <dl className="divide-y divide-border border-y border-border">
                      <div className="flex justify-between gap-6 py-2.5 text-small">
                        <dt className="shrink-0 font-mono text-meta uppercase tracking-[0.02em] text-text-tertiary">
                          Address
                        </dt>
                        <dd className="text-right">
                          {business.address}, {business.city}, {business.state} {business.zip_code}
                        </dd>
                      </div>

                      {business.phone && (
                        <div className="flex justify-between gap-6 py-2.5 text-small">
                          <dt className="shrink-0 font-mono text-meta uppercase tracking-[0.02em] text-text-tertiary">
                            Phone
                          </dt>
                          <dd className="text-right">
                            <a href={`tel:${business.phone}`} className="font-mono hover:text-primary">
                              {business.phone}
                            </a>
                          </dd>
                        </div>
                      )}

                      {business.website && (
                        <div className="flex justify-between gap-6 py-2.5 text-small">
                          <dt className="shrink-0 font-mono text-meta uppercase tracking-[0.02em] text-text-tertiary">
                            Website
                          </dt>
                          <dd className="min-w-0 truncate text-right">
                            <a
                              href={business.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-primary"
                            >
                              {business.website.replace(/^https?:\/\//, "")}
                            </a>
                          </dd>
                        </div>
                      )}

                      {Object.entries(businessHours).map(([day, hours]) => (
                        <div key={day} className="flex justify-between gap-6 py-2 text-small">
                          <dt
                            className={cn(
                              "shrink-0 font-mono text-meta uppercase tracking-[0.02em] capitalize",
                              day === today ? "text-foreground" : "text-text-tertiary"
                            )}
                          >
                            {day}
                          </dt>
                          <dd
                            className={cn(
                              "font-mono text-meta text-right",
                              day === today ? "text-foreground" : "text-muted-foreground"
                            )}
                          >
                            {hours}
                          </dd>
                        </div>
                      ))}
                    </dl>

                    {business.tags && business.tags.length > 0 && (
                      <div>
                        <h3 className="mb-2 text-h3 font-medium">Tags</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {business.tags.map((tag: string) => (
                            <Badge key={tag} variant="outline">
                              {formatTagLabel(tag)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {business.amenities && business.amenities.length > 0 && (
                      <div>
                        <h3 className="mb-2 text-h3 font-medium">Amenities</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {business.amenities.map((amenity: string) => (
                            <Badge key={amenity} variant="secondary">
                              {amenity}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="reviews" className="mt-5 space-y-6">
                    {business.data_source === "google" && business.review_count > 0 && (
                      <div className="flex flex-col gap-3 border-y border-border py-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-small text-muted-foreground">
                          Pulse shows a sample of the {reviewLabel.toLowerCase()} on Google.
                        </p>
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={googleReviewsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Read all reviews on Google Maps
                            <ExternalLink className="ml-2 h-3.5 w-3.5" aria-hidden="true" />
                          </a>
                        </Button>
                      </div>
                    )}

                    {/* Write Review */}
                    {user && (
                      <div data-tour="review-form" className="rounded-lg border border-border p-5">
                          <h3 className="mb-4 text-h3 font-medium">Write a Review</h3>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium mb-2 block" id="rating-label">
                                Rating
                              </label>
                              <div className="flex gap-1" role="group" aria-labelledby="rating-label">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    onClick={() => {
                                      setReviewRating(star);
                                      setReviewErrors((prev) => {
                                        const next = { ...prev };
                                        delete next.rating;
                                        return next;
                                      });
                                    }}
                                    className="p-1"
                                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                                    aria-pressed={star === reviewRating}
                                  >
                                    <Star
                                      className={cn(
                                        "h-5 w-5",
                                        star <= reviewRating
                                          ? "fill-current text-foreground"
                                          : "text-text-tertiary"
                                      )}
                                      aria-hidden="true"
                                    />
                                  </button>
                                ))}
                              </div>
                              {reviewErrors.rating && (
                                <p className="text-sm text-destructive mt-1">{reviewErrors.rating}</p>
                              )}
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-2 block" htmlFor="review-content">
                                Your Review
                              </label>
                              <Textarea
                                id="review-content"
                                placeholder="Share your experience... (minimum 10 characters)"
                                value={reviewText}
                                onChange={(e) => {
                                  setReviewText(e.target.value);
                                  setReviewErrors((prev) => {
                                    const next = { ...prev };
                                    delete next.content;
                                    return next;
                                  });
                                }}
                                rows={4}
                                maxLength={2000}
                                aria-describedby="review-char-count"
                                className={reviewErrors.content ? "border-destructive" : ""}
                              />
                              <div className="flex justify-between mt-1">
                                {reviewErrors.content ? (
                                  <p className="text-sm text-destructive">{reviewErrors.content}</p>
                                ) : (
                                  <span />
                                )}
                                <p
                                  id="review-char-count"
                                  className={cn(
                                    "text-xs",
                                    reviewText.length < 10
                                      ? "text-muted-foreground"
                                      : reviewText.length > 1900
                                        ? "text-destructive"
                                        : "text-muted-foreground"
                                  )}
                                >
                                  {reviewText.length}/2000
                                </p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Button
                                type="button"
                                variant={reviewCaptchaToken ? "secondary" : "outline"}
                                className="w-full"
                                onClick={() => {
                                  setReviewErrors({});
                                  setShowReviewCaptcha(true);
                                }}
                              >
                                {reviewCaptchaToken ? "CAPTCHA Verified" : "Verify CAPTCHA"}
                              </Button>
                              {!reviewCaptchaToken && (
                                <p className="text-xs text-muted-foreground text-center">
                                  Required before submitting.
                                </p>
                              )}
                            </div>
                            <Button
                              onClick={handleSubmitReview}
                              disabled={isSubmittingReview || !reviewCaptchaToken}
                            >
                              {isSubmittingReview ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4 mr-2" />
                              )}
                              {isSubmittingReview ? "Submitting..." : "Submit Review"}
                            </Button>
                          </div>
                      </div>
                    )}

                    {/* Sync Google Reviews */}
                    {business.place_id && (
                      <div className="flex items-center justify-between gap-4 border-y border-border py-3">
                        <p className="flex flex-wrap items-center gap-x-1.5 font-mono text-meta uppercase tracking-[0.02em] text-text-tertiary">
                          <span>Google reviews</span>
                          <span aria-hidden="true">&middot;</span>
                          <span>{displaySyncStatus.isStale ? "Needs sync" : "Up to date"}</span>
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSyncGoogleReviews()}
                          disabled={isSyncingReviews}
                        >
                          {isSyncingReviews ? (
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Globe className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          {isSyncingReviews ? "Syncing..." : "Refresh"}
                        </Button>
                      </div>
                    )}

                    {/* Reviews List */}
                    {combinedReviewCount > 0 ? (
                      <>
                        <div className="divide-y divide-border border-y border-border">
                          {paginatedReviews.items.map((item) => {
                            const isPulse = item.source === "pulse";
                            const author = isPulse
                              ? item.review.user?.full_name || "Anonymous"
                              : item.review.author_name || "Google user";
                            const when = isPulse
                              ? new Date(item.review.created_at).toLocaleDateString()
                              : item.review.relative_time ||
                                (item.review.created_at
                                  ? new Date(item.review.created_at).toLocaleDateString()
                                  : "Google review");

                            return (
                              <article key={item.id} className="flex gap-4 py-4">
                                <p className="w-8 shrink-0 font-mono text-h3 leading-none tabular-nums">
                                  {item.review.rating}
                                </p>
                                <div className="min-w-0 flex-1">
                                  <p className="flex flex-wrap items-center gap-x-1.5 font-mono text-meta uppercase tracking-[0.02em] text-text-tertiary">
                                    <span className="text-foreground">{author}</span>
                                    <span aria-hidden="true">&middot;</span>
                                    <span>{when}</span>
                                    <span aria-hidden="true">&middot;</span>
                                    <span>{isPulse ? "Pulse" : "Google"}</span>
                                  </p>
                                  <p className="mt-1.5 text-small text-foreground">
                                    {item.review.content}
                                  </p>
                                  {!isPulse && item.review.maps_url && (
                                    <a
                                      href={item.review.maps_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="mt-2 inline-flex items-center gap-1 font-mono text-meta text-text-tertiary hover:text-primary"
                                    >
                                      View on Google Maps
                                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                    </a>
                                  )}
                                </div>
                              </article>
                            );
                          })}
                        </div>

                        {paginatedReviews.totalPages > 1 && (
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="font-mono text-meta tabular-nums text-text-tertiary">
                              Page {paginatedReviews.page} of {paginatedReviews.totalPages}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Button
                                variant="outline"
                                size="xs"
                                disabled={!paginatedReviews.hasPreviousPage}
                                onClick={() =>
                                  setReviewsPage((currentPage) => Math.max(1, currentPage - 1))
                                }
                              >
                                Previous
                              </Button>
                              {reviewPages.map((pageNumber) => (
                                <Button
                                  key={pageNumber}
                                  variant={pageNumber === paginatedReviews.page ? "default" : "outline"}
                                  size="xs"
                                  className="font-mono tabular-nums"
                                  onClick={() => setReviewsPage(pageNumber)}
                                  aria-label={`Go to reviews page ${pageNumber}`}
                                >
                                  {pageNumber}
                                </Button>
                              ))}
                              <Button
                                variant="outline"
                                size="xs"
                                disabled={!paginatedReviews.hasNextPage}
                                onClick={() =>
                                  setReviewsPage((currentPage) =>
                                    Math.min(paginatedReviews.totalPages, currentPage + 1)
                                  )
                                }
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div data-tour="review-empty" className="border-y border-border py-8">
                        {showGoogleReviewHint ? (
                          <>
                            <p className="text-body font-medium">
                              No written Pulse reviews yet
                            </p>
                            <p className="mt-1 text-small text-muted-foreground">
                              This business has {reviewLabel.toLowerCase()} from Google, but
                              no detailed reviews have been posted in Pulse yet.
                            </p>
                            <Button variant="outline" size="sm" asChild className="mt-4">
                              <a
                                href={googleReviewsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Read on Google Maps
                                <ExternalLink className="ml-2 h-3.5 w-3.5" aria-hidden="true" />
                              </a>
                            </Button>
                          </>
                        ) : (
                          <>
                            <p className="text-body font-medium">No reviews yet</p>
                            <p className="mt-1 text-small text-muted-foreground">
                              Be the first to write one.
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="deals" className="mt-5">
                    {business.deals && business.deals.length > 0 ? (
                      <div className="divide-y divide-border border-y border-border">
                        {business.deals.map((deal) => {
                          const isDemoDeal = deal.id.startsWith("demo-");
                          return (
                            <div key={deal.id} className="flex gap-4 py-4">
                              <p className="w-20 shrink-0 font-mono text-lead leading-none tabular-nums">
                                {deal.discount_value
                                  ? deal.discount_type === "percentage"
                                    ? `${deal.discount_value}%`
                                    : `$${deal.discount_value}`
                                  : "—"}
                              </p>
                              <div className="min-w-0 flex-1">
                                <h3 className="text-body font-medium">{deal.title}</h3>
                                <p className="mt-1 flex flex-wrap items-center gap-x-1.5 font-mono text-meta uppercase tracking-[0.02em] text-text-tertiary">
                                  <span>
                                    {deal.deal_type === "boost_mission"
                                      ? "Mission reward"
                                      : "Special offer"}
                                  </span>
                                  {deal.mission_requirement && (
                                    <>
                                      <span aria-hidden="true">&middot;</span>
                                      <span>{deal.mission_requirement}</span>
                                    </>
                                  )}
                                </p>
                                <p className="mt-1.5 text-small text-muted-foreground">
                                  {deal.description}
                                </p>
                                <Button
                                  size="xs"
                                  className="mt-2.5"
                                  disabled={claimDeal.isPending || isDemoDeal}
                                  onClick={() => {
                                    if (!isDemoDeal) handleClaimDeal(deal.id);
                                  }}
                                >
                                  {isDemoDeal
                                    ? "Demo deal"
                                    : claimDeal.isPending
                                      ? "Claiming..."
                                      : "Claim"}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="border-y border-border py-8">
                        <p className="text-body font-medium">No active deals</p>
                        <p className="mt-1 text-small text-muted-foreground">
                          Offers from this business will appear here.
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </AnimatedSection>
            </div>

            {/* Sidebar */}
            <div className="space-y-6 self-start lg:sticky lg:top-24">
              <AnimatedSection animation="fade-up" delay={0.2}>
                <section aria-labelledby="actions-heading">
                  <h2 id="actions-heading" className="mb-2 text-h3 font-medium">Quick actions</h2>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={hasCheckedIn ? "secondary" : "default"}
                      onClick={handleCheckIn}
                      disabled={hasCheckedIn}
                      data-tour="business-checkin"
                    >
                      {hasCheckedIn ? (
                        <CheckCircle className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <MapPinned className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {hasCheckedIn ? "Checked In" : "Check In"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleGetDirections}>
                      <Navigation className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      Directions
                    </Button>
                    {business.phone && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`tel:${business.phone}`}>
                          <Phone className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                          Call
                        </a>
                      </Button>
                    )}
                  </div>
                </section>
              </AnimatedSection>

              {/* Community impact */}
              <AnimatedSection animation="fade-up" delay={0.25}>
                <section aria-labelledby="impact-heading">
                  <h2 id="impact-heading" className="mb-2 text-h3 font-medium">Community impact</h2>
                  <dl className="divide-y divide-border border-y border-border">
                    {[
                      { label: "Bookmarked by", value: `${business.bookmark_count} people` },
                      {
                        label: business.data_source === "google" ? "Total ratings" : "Total reviews",
                        value: String(business.review_count),
                      },
                      { label: "Average rating", value: String(business.average_rating) },
                    ].map((row) => (
                      <div key={row.label} className="flex justify-between gap-3 py-2 text-small">
                        <dt className="text-muted-foreground">{row.label}</dt>
                        <dd className="font-mono tabular-nums">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              </AnimatedSection>

              {/* Map */}
              {mapEmbedSrc && (
                <AnimatedSection animation="fade-up" delay={0.3}>
                  <section aria-labelledby="location-heading">
                    <h2 id="location-heading" className="mb-2 text-h3 font-medium">Location</h2>
                    <div className="overflow-hidden rounded-lg border border-border">
                      <iframe
                        width="100%"
                        height="200"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        title={`Map showing location of ${business.name}`}
                        src={mapEmbedSrc}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={handleGetDirections}
                    >
                      <Navigation className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      Open in Google Maps
                    </Button>
                  </section>
                </AnimatedSection>
              )}
            </div>
          </div>
        </div>
      </div>

      <ReceiptCheckInDialog
        open={checkInOpen}
        onOpenChange={setCheckInOpen}
        businessId={canonicalBusinessId}
        businessName={business.name}
        onSuccess={handleCheckInVerified}
        onAlreadyCheckedIn={() => {
          setHasCheckedIn(true);
          toast.info("Already checked in", {
            description: "You've already checked in today!",
          });
        }}
      />

      {/* Review CAPTCHA Modal */}
      {showReviewCaptcha && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4">
          <div className="w-full max-w-sm space-y-3 rounded-lg border border-border bg-surface-1 p-4">
            <h3 className="text-h3 font-medium">Verify You&apos;re Human</h3>
            <p className="text-small text-muted-foreground">
              Complete this puzzle to submit your review.
            </p>
            <BaanihaliPuzzleCaptcha
              onVerify={(token) => {
                setReviewCaptchaToken(token);
                setShowReviewCaptcha(false);
                submitReviewWithToken(token);
              }}
              onCancel={() => setShowReviewCaptcha(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
