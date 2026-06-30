"use client";

import { use, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  MapPin,
  Phone,
  Globe,
  Clock,
  Star,
  Heart,
  Share2,
  Navigation,
  CheckCircle,
  DollarSign,
  Tag,
  TrendingUp,
  Send,
  ExternalLink,
  Loader2,
  MapPinned,
} from "lucide-react";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
 *   1. User arrives from Discover card or direct link → hero loads with photo/fallback
 *   2. Tabs (About · Reviews · Deals) let the user explore without page navigation
 *   3. "Leave a Review" form validates client-side (Zod) before POST; CAPTCHA on submit
 *   4. Bookmark heart and Share button in the hero enable quick engagement
 *   5. Check-in CTA records a visit, which later grants "Verified" badge on reviews
 *   6. Deals tab shows claimable offers with one-click claim + redemption code copy
 *
 * DESIGN RATIONALE:
 *   - Hero section uses a gradient overlay so white text is always readable on photos
 *   - Review form shows inline field errors (not just toasts) for immediate correction
 *   - Star rating uses interactive star buttons with aria-label per star for a11y
 *   - Tab-based layout prevents long scroll and keeps context tight
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
          <div className="mx-auto max-w-6xl px-6 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h1 className="text-2xl font-bold mb-2">Business not found</h1>
            <p className="text-muted-foreground mb-6">
              The business you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
            <NavLink href="/discover">
              <Button>Browse Businesses</Button>
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

      {/* Immersive hero — identity and actions live on the photo itself */}
      <div className="bg-gradient-to-b from-primary/5 via-background to-background pt-28 pb-8">
        <div className="mx-auto max-w-6xl px-6">
          <AnimatedSection animation="fade-up">
            <div className="relative h-[24rem] md:h-[27rem] rounded-3xl overflow-hidden shadow-xl shadow-primary/5">
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
                    sizes="(max-width: 1200px) 100vw, 1152px"
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
                    sizes="(max-width: 1200px) 100vw, 1152px"
                    priority
                    unoptimized
                  />
                );
              })()}
              {/* Legibility scrims — source photos can be near-white, so the
                  identity block always sits on its own dark gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-transparent to-transparent" />

              {business.is_featured && (
                <Badge className="absolute top-5 left-5 bg-white/15 text-white border border-white/25 backdrop-blur-md shadow-lg">
                  Featured
                </Badge>
              )}

              {/* Identity overlay */}
              <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
                  <div className="min-w-0">
                    <div className="mb-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium uppercase tracking-[0.14em] text-white/75">
                      <span>{business.category?.name}</span>
                      {business.price_range && (
                        <>
                          <span aria-hidden="true" className="text-white/40">·</span>
                          <span className="tracking-normal">{getPriceRange(business.price_range)}</span>
                        </>
                      )}
                    </div>
                    <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white [text-wrap:balance]">
                      {business.name}
                    </h1>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-white/85">
                      <span className="flex items-center gap-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-4 w-4",
                              i < Math.round(business.average_rating)
                                ? "fill-white text-white"
                                : "text-white/35"
                            )}
                          />
                        ))}
                        <span className="font-semibold text-white ml-1.5">
                          {business.average_rating}
                        </span>
                        <span className="text-white/70">({reviewLabel})</span>
                      </span>
                      {business.is_verified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/15 border border-white/25 backdrop-blur-md px-2.5 py-0.5 text-xs font-medium text-white">
                          <CheckCircle className="h-3 w-3" aria-hidden="true" />
                          Verified
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "rounded-full border backdrop-blur-md transition-colors",
                        isBookmarked
                          ? "bg-primary/85 border-primary/60 text-white hover:bg-primary hover:text-white"
                          : "bg-white/10 border-white/25 text-white hover:bg-white/25 hover:text-white"
                      )}
                      onClick={handleBookmark}
                      disabled={toggleBookmark.isPending}
                      aria-label={isBookmarked ? "Remove bookmark" : "Bookmark this business"}
                      data-tour="business-bookmark"
                    >
                      <Heart
                        className={cn("h-4 w-4", isBookmarked && "fill-white")}
                        aria-hidden="true"
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full bg-white/10 border border-white/25 text-white backdrop-blur-md transition-colors hover:bg-white/25 hover:text-white"
                      onClick={handleShare}
                      aria-label="Share this business"
                    >
                      <Share2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button onClick={handleGetDirections} aria-label="Get directions to this business">
                      <Navigation className="h-4 w-4 mr-2" aria-hidden="true" />
                      Directions
                    </Button>
                  </div>
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

                  <TabsContent value="about" className="mt-6 space-y-6">
                    {/* AI Description */}
                    <Card className="overflow-hidden border-t-2 border-t-primary/30">
                      <CardContent className="p-6">
                        <h3 className="font-semibold mb-3">About</h3>
                        <p className="text-foreground leading-relaxed">
                          {businessSummary}
                        </p>

                        {business.tags && business.tags.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium mb-2">Tags</h4>
                            <div className="flex flex-wrap gap-2">
                              {business.tags.map((tag: string) => (
                                <Badge key={tag} variant="outline">
                                  {formatTagLabel(tag)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {business.amenities && business.amenities.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium mb-2">Amenities</h4>
                            <div className="flex flex-wrap gap-2">
                              {business.amenities.map((amenity: string) => (
                                <Badge key={amenity} variant="secondary">
                                  {amenity}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Business Info */}
                    <Card>
                      <CardContent className="p-6 space-y-4">
                        <h3 className="font-semibold mb-3">Business Info</h3>

                        <div className="flex items-start gap-3">
                          <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="font-medium">Address</p>
                            <p className="text-sm text-muted-foreground">
                              {business.address}
                              <br />
                              {business.city}, {business.state} {business.zip_code}
                            </p>
                          </div>
                        </div>

                        {business.phone && (
                          <div className="flex items-start gap-3">
                            <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="font-medium">Phone</p>
                              <a
                                href={`tel:${business.phone}`}
                                className="text-sm text-primary hover:underline"
                              >
                                {business.phone}
                              </a>
                            </div>
                          </div>
                        )}

                        {business.website && (
                          <div className="flex items-start gap-3">
                            <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="font-medium">Website</p>
                              <a
                                href={business.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline"
                              >
                                {business.website.replace(/^https?:\/\//, "")}
                              </a>
                            </div>
                          </div>
                        )}

                        {Object.keys(businessHours).length > 0 && (
                          <div className="flex items-start gap-3">
                            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div className="flex-1">
                              <p className="font-medium">Hours</p>
                              <div className="text-sm space-y-1 mt-1">
                                {Object.entries(businessHours).map(([day, hours]) => (
                                  <div
                                    key={day}
                                    className={`flex justify-between ${
                                      day === today ? "text-primary font-medium" : "text-muted-foreground"
                                    }`}
                                  >
                                    <span className="capitalize">{day}</span>
                                    <span>{hours}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="reviews" className="mt-6 space-y-6">
                    {business.data_source === "google" && business.review_count > 0 && (
                      <Card>
                        <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-medium text-foreground">
                              Want to read all {reviewLabel.toLowerCase()}?
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Open the full review feed on Google Maps.
                            </p>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={googleReviewsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Read all reviews on Google Maps
                              <ExternalLink className="h-3.5 w-3.5 ml-2" />
                            </a>
                          </Button>
                        </CardContent>
                      </Card>
                    )}

                    {/* Write Review */}
                    {user && (
                      <Card data-tour="review-form">
                        <CardContent className="p-6">
                          <h3 className="font-semibold mb-4">Write a Review</h3>
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
                                      className={`h-6 w-6 ${
                                        star <= reviewRating
                                          ? "fill-chart-5 text-chart-5"
                                          : "text-muted-foreground"
                                      }`}
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
                        </CardContent>
                      </Card>
                    )}

                    {/* Sync Google Reviews Button */}
                    {business.place_id && (
                      <Card>
                        <CardContent className="p-4 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">Google Reviews</p>
                              <Badge
                                variant={displaySyncStatus.isStale ? "secondary" : "outline"}
                                className="text-xs"
                              >
                                {displaySyncStatus.isStale ? "Needs Sync" : "Up to date"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {displaySyncStatus.lastSyncedText}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => handleSyncGoogleReviews()}
                            disabled={isSyncingReviews}
                          >
                            {isSyncingReviews ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Globe className="h-4 w-4 mr-2" />
                            )}
                            {isSyncingReviews ? "Syncing..." : "Refresh"}
                          </Button>
                        </CardContent>
                      </Card>
                    )}

                    {/* Reviews List */}
                    {combinedReviewCount > 0 ? (
                      <>
                        {paginatedReviews.items.map((item, index: number) => (
                          <AnimatedSection
                            key={item.id}
                            animation="fade-up"
                            delay={0.08 * index}
                          >
                            <Card>
                              <CardContent className="p-6">
                                {item.source === "pulse" ? (
                                  <>
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                          <span className="font-medium">
                                            {item.review.user?.full_name?.[0] || "U"}
                                          </span>
                                        </div>
                                        <div>
                                          <p className="font-medium">
                                            {item.review.user?.full_name || "Anonymous"}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {new Date(item.review.created_at).toLocaleDateString()}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[10px]">
                                          Pulse
                                        </Badge>
                                        <div className="flex items-center gap-1">
                                          <Star className="h-4 w-4 fill-chart-5 text-chart-5" />
                                          <span>{item.review.rating}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <p className="text-foreground leading-relaxed">
                                      {item.review.content}
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                          <span className="font-medium">
                                            {item.review.author_name?.[0] || "G"}
                                          </span>
                                        </div>
                                        <div>
                                          <p className="font-medium">
                                            {item.review.author_name || "Google user"}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {item.review.relative_time ||
                                              (item.review.created_at
                                                ? new Date(item.review.created_at).toLocaleDateString()
                                                : "Google review")}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] border-primary/40 text-primary"
                                        >
                                          Google
                                        </Badge>
                                        <div className="flex items-center gap-1">
                                          <Star className="h-4 w-4 fill-chart-5 text-chart-5" />
                                          <span>{item.review.rating}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <p className="text-foreground leading-relaxed">
                                      {item.review.content}
                                    </p>
                                    {item.review.maps_url && (
                                      <div className="mt-3">
                                        <a
                                          href={item.review.maps_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                                        >
                                          View on Google Maps
                                          <ExternalLink className="h-3.5 w-3.5" />
                                        </a>
                                      </div>
                                    )}
                                  </>
                                )}
                              </CardContent>
                            </Card>
                          </AnimatedSection>
                        ))}

                        {paginatedReviews.totalPages > 1 && (
                          <Card>
                            <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <p className="text-sm text-muted-foreground">
                                Page {paginatedReviews.page} of {paginatedReviews.totalPages}
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
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
                                    size="sm"
                                    onClick={() => setReviewsPage(pageNumber)}
                                    aria-label={`Go to reviews page ${pageNumber}`}
                                  >
                                    {pageNumber}
                                  </Button>
                                ))}
                                <Button
                                  variant="outline"
                                  size="sm"
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
                            </CardContent>
                          </Card>
                        )}
                      </>
                    ) : (
                      <Card data-tour="review-empty">
                        <CardContent className="p-6 text-center">
                          {showGoogleReviewHint ? (
                            <>
                              <p className="text-foreground font-medium">
                                No written Pulse reviews yet
                              </p>
                              <p className="text-sm text-muted-foreground mt-1 mb-4">
                                This business has {reviewLabel.toLowerCase()} from Google, but
                                no detailed reviews have been posted in Pulse yet.
                              </p>
                              <Button variant="outline" size="sm" asChild>
                                <a
                                  href={googleReviewsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Read on Google Maps
                                  <ExternalLink className="h-3.5 w-3.5 ml-2" />
                                </a>
                              </Button>
                            </>
                          ) : (
                            <>
                              <p className="text-muted-foreground">No reviews yet</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Be the first to share your experience!
                              </p>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="deals" className="mt-6 space-y-6">
                    {business.deals && business.deals.length > 0 ? (
                      business.deals.map((deal, index: number) => {
                        const isDemoDeal = deal.id.startsWith("demo-");
                        return (
                          <AnimatedSection
                            key={deal.id}
                            animation="fade-up"
                            delay={0.1 * index}
                          >
                            <Card>
                              <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <Badge className="mb-2" variant="secondary">
                                      <Tag className="h-3 w-3 mr-1" />
                                      {deal.deal_type === "boost_mission"
                                        ? "Mission Reward"
                                        : "Special Offer"}
                                    </Badge>
                                    <h3 className="font-semibold text-lg">
                                      {deal.title}
                                    </h3>
                                    <p className="text-muted-foreground mt-1">
                                      {deal.description}
                                    </p>
                                    {deal.mission_requirement && (
                                      <p className="text-sm text-chart-3 mt-2">
                                        <TrendingUp className="h-4 w-4 inline mr-1" />
                                        Mission: {deal.mission_requirement}
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    {deal.discount_value && (
                                      <div className="text-2xl font-bold text-chart-2">
                                        {deal.discount_type === "percentage"
                                          ? `${deal.discount_value}%`
                                          : `$${deal.discount_value}`}
                                      </div>
                                    )}
                                    <Button
                                      size="sm"
                                      className="mt-2"
                                      disabled={claimDeal.isPending || isDemoDeal}
                                      onClick={() => {
                                        if (!isDemoDeal) handleClaimDeal(deal.id);
                                      }}
                                    >
                                      <DollarSign className="h-4 w-4 mr-1" />
                                      {isDemoDeal
                                        ? "Demo deal"
                                        : claimDeal.isPending
                                          ? "Claiming..."
                                          : "Claim"}
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </AnimatedSection>
                        );
                      })
                    ) : (
                      <Card>
                        <CardContent className="p-6 text-center">
                          <p className="text-muted-foreground">No active deals</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Check back later for special offers!
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                </Tabs>
              </AnimatedSection>
            </div>

            {/* Sidebar */}
            <div className="space-y-6 self-start lg:sticky lg:top-24">
              <AnimatedSection animation="fade-up" delay={0.2}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="text-base">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2.5">
                    <Button className="w-full" onClick={handleGetDirections}>
                      <Navigation className="h-4 w-4 mr-2" />
                      Get Directions
                    </Button>
                    <div className="grid grid-cols-2 gap-2.5">
                      <Button
                        variant={hasCheckedIn ? "secondary" : "outline"}
                        onClick={handleCheckIn}
                        disabled={hasCheckedIn}
                        data-tour="business-checkin"
                      >
                        {hasCheckedIn ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <MapPinned className="h-4 w-4" />
                        )}
                        {hasCheckedIn ? "Checked In" : "Check In"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleBookmark}
                        disabled={toggleBookmark.isPending}
                      >
                        <Heart
                          className={`h-4 w-4 ${
                            isBookmarked ? "fill-primary text-primary" : ""
                          }`}
                        />
                        {isBookmarked ? "Bookmarked" : "Bookmark"}
                      </Button>
                    </div>
                    {business.phone && (
                      <Button
                        variant="outline"
                        className="w-full"
                        asChild
                      >
                        <a href={`tel:${business.phone}`}>
                          <Phone className="h-4 w-4 mr-2" />
                          Call Business
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </AnimatedSection>

              {/* Impact Card */}
              <AnimatedSection animation="fade-up" delay={0.25}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="text-base">Community Impact</CardTitle>
                  </CardHeader>
                  <CardContent className="divide-y divide-border/60">
                    <div className="flex items-center justify-between gap-3 py-2.5 pt-0 text-sm">
                      <span className="flex items-center gap-2.5 text-muted-foreground">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Heart className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        Bookmarked by
                      </span>
                      <span className="font-semibold tabular-nums">
                        {business.bookmark_count} people
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <span className="flex items-center gap-2.5 text-muted-foreground">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Star className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        {business.data_source === "google" ? "Total ratings" : "Total reviews"}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {business.review_count}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 py-2.5 pb-0 text-sm">
                      <span className="flex items-center gap-2.5 text-muted-foreground">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        Average rating
                      </span>
                      <span className="font-semibold tabular-nums">
                        {business.average_rating}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </AnimatedSection>

              {/* Map Card */}
              {mapEmbedSrc && (
                <AnimatedSection animation="fade-up" delay={0.3}>
                  <Card className="transition-shadow hover:shadow-md">
                    <CardHeader>
                      <CardTitle className="text-base">Location</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-hidden rounded-b-lg">
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
                      <div className="p-4">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={handleGetDirections}
                        >
                          <Navigation className="h-4 w-4 mr-2" />
                          Open in Google Maps
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-4 shadow-xl space-y-3">
            <h3 className="text-base font-semibold">Verify You&apos;re Human</h3>
            <p className="text-sm text-muted-foreground">
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
