"use client";

import { use, useState } from "react";
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
  Loader2,
  Send,
  MapPinned,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { AnimatedSection } from "@/components/features/home/AnimatedSection";
import { useBusiness } from "@/hooks/useBusinesses";
import {
  useIsBookmarked,
  useToggleBookmark,
} from "@/hooks/useBookmarks";
import { useAuth } from "@/components/providers/AuthProvider";
import { useClaimDeal } from "@/hooks/useDeals";
import { PhotoGallery } from "@/components/features/business/PhotoGallery";
import { toast } from "sonner";
import { NavLink } from "@/components/ui/nav-link";
import type { BusinessWithDetails, ReviewWithUser, Deal } from "@/types/business";
import { getSyncStatus } from "@/lib/reviews/sync-shared";
import { cn } from "@/lib/utils";
import { useEffect, useCallback } from "react";
import { createReviewSchema } from "@/lib/validation";
import { CaptchaWidget } from "@/components/features/bot/CaptchaWidget";

interface BusinessDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function BusinessDetailPage({
  params,
}: BusinessDetailPageProps) {
  const { id } = use(params);
  const { user } = useAuth();
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [isSyncingReviews, setIsSyncingReviews] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [reviewErrors, setReviewErrors] = useState<Record<string, string>>({});
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const handleCaptchaVerify = useCallback((token: string) => setCaptchaToken(token), []);

  const { data: business, isLoading, refetch } = useBusiness(id);
  const { data: isBookmarked } = useIsBookmarked(id);
  const toggleBookmark = useToggleBookmark();
  const claimDeal = useClaimDeal();
  const [claimedDeals, setClaimedDeals] = useState<Record<string, string | null>>({}); // dealId -> redemptionCode
  const [autoSyncTriggered, setAutoSyncTriggered] = useState(false);

  // AI Description state
  const [aiDescription, setAiDescription] = useState<string | null>(null);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [aiDescriptionCached, setAiDescriptionCached] = useState(false);

  // Auto-load AI description from business data or generate it
  useEffect(() => {
    if (!business?.id || isLoading) return;

    // If business already has an AI description in the database, use it
    if (business.ai_description) {
      setAiDescription(business.ai_description);
      setAiDescriptionCached(true);
      return;
    }

    // If no AI description exists, auto-generate one (silent — no toast)
    if (!aiDescription && !isGeneratingDescription) {
      handleGenerateDescription(false, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id, business?.ai_description, isLoading]);

  // Auto-sync reviews on first visit when no reviews exist but review_count > 0
  useEffect(() => {
    if (
      business?.place_id &&
      business?.review_count > 0 &&
      (!business.reviews || business.reviews.length === 0) &&
      !isSyncingReviews &&
      !autoSyncTriggered &&
      !isLoading
    ) {
      handleSyncGoogleReviews(true);
      setAutoSyncTriggered(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.place_id, business?.review_count, business?.reviews?.length, isLoading]);

  const handleBookmark = async () => {
    if (!user) {
      toast.error("Sign in required", {
        description: "Please sign in to bookmark businesses",
      });
      return;
    }

    try {
      await toggleBookmark.mutateAsync({
        businessId: id,
        isBookmarked: isBookmarked || false,
      });
      toast.success(isBookmarked ? "Bookmark removed" : "Business bookmarked", {
        description: isBookmarked
          ? "Removed from your saved businesses"
          : "Added to your saved businesses",
      });
    } catch (error) {
      toast.error("Error", {
        description: "Failed to update bookmark",
      });
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: business?.name || "",
        text: business?.short_description || business?.description || "",
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
    if (!user) {
      toast.error("Sign in required", {
        description: "Please sign in to leave a review",
      });
      return;
    }

    // Client-side Zod validation
    const validation = createReviewSchema.safeParse({
      business_id: id,
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

    if (!captchaToken) {
      toast.error("Verification required", {
        description: "Please complete the CAPTCHA verification",
      });
      return;
    }

    setIsSubmittingReview(true);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: id,
          rating: reviewRating,
          content: reviewText,
          captchaToken,
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
      setCaptchaToken(null);
      refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit review. Please try again.";
      toast.error("Error", { description: message });
    } finally {
      setIsSubmittingReview(false);
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
      const response = await fetch(`/api/businesses/${id}/reviews/sync`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to sync reviews");
      }

      const result = await response.json();
      if (!silent) {
        toast.success("Reviews synced", {
          description: `Synced ${result.synced} Google reviews`,
        });
      }

      // Refresh business data to show new reviews
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

  const handleClaimDeal = async (deal: Deal) => {
    if (!user) {
      toast.error("Sign in required", {
        description: "Please sign in to claim deals",
      });
      return;
    }

    try {
      const result = await claimDeal.mutateAsync(deal.id);
      // Store the redemption code
      setClaimedDeals(prev => ({
        ...prev,
        [deal.id]: result.redeemed_code
      }));
      toast.success("Deal claimed!", {
        description: `Your redemption code is: ${result.redeemed_code}`,
      });
      // Refresh business data to update claim status
      refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to claim deal";
      toast.error("Error", { description: message });
    }
  };

  const handleCheckIn = async () => {
    if (!user) {
      toast.error("Sign in required", {
        description: "Please sign in to check in",
      });
      return;
    }

    setIsCheckingIn(true);
    try {
      const response = await fetch(`/api/businesses/${id}/checkin`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 409) {
          toast.info("Already checked in", {
            description: "You've already checked in today!",
          });
          setHasCheckedIn(true);
          return;
        }
        throw new Error(error.error || "Failed to check in");
      }

      const result = await response.json();
      toast.success("Checked in!", {
        description: `+$${result.impact.estimated_dollars} estimated local impact`,
      });
      setHasCheckedIn(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to check in";
      toast.error("Error", { description: message });
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleGenerateDescription = async (force = false, silent = false) => {
    setIsGeneratingDescription(true);
    try {
      const url = `/api/businesses/${id}/generate-description${force ? '?force=true' : ''}`;
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

  if (isLoading) {
    return (
      <div className="relative min-h-screen bg-background" suppressHydrationWarning>
        <Header />
        <div className="pt-20 pb-12">
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
      <div className="relative min-h-screen bg-background">
        <Header />
        <div className="pt-20 pb-12">
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

  const getBusinessHours = (hours: Record<string, string>) => {
    const days = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
    const today = days[new Date().getDay() - 1] || "sunday";
    return { hours, today };
  };

  const { hours: businessHours, today } = getBusinessHours(
    (business.hours as Record<string, string>) || {}
  );

  return (
    <div className="relative min-h-screen bg-background">
      <Header />

      {/* Hero area with subtle gradient */}
      <div className="bg-gradient-to-b from-primary/5 via-background to-background pt-20 pb-6">
        <div className="mx-auto max-w-6xl px-6">
          {/* Photo Gallery */}
          <AnimatedSection animation="fade-up">
            <div className="mb-6">
              <PhotoGallery
                photos={business.photos || []}
                businessName={business.name}
                categoryIcon={business.category?.icon || "🏪"}
              />
              {business.is_featured && (
                <Badge className="absolute top-4 left-4 bg-chart-2 text-white z-10">
                  Featured
                </Badge>
              )}
            </div>
          </AnimatedSection>

          {/* Header */}
          <AnimatedSection animation="fade-up" delay={0.1}>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold">{business.name}</h1>
                  {business.is_verified && (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-4 w-4",
                          i < Math.round(business.average_rating)
                            ? "fill-chart-5 text-chart-5"
                            : "text-muted-foreground/30"
                        )}
                      />
                    ))}
                    <span className="font-medium text-foreground ml-1">
                      {business.average_rating}
                    </span>
                    <span>({business.review_count} reviews)</span>
                  </span>
                  <span>•</span>
                  <span>{business.category?.name}</span>
                  {business.price_range && (
                    <>
                      <span>•</span>
                      <span>{getPriceRange(business.price_range)}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleBookmark}
                  disabled={toggleBookmark.isPending}
                  aria-label={isBookmarked ? "Remove bookmark" : "Bookmark this business"}
                >
                  <Heart
                    className={`h-4 w-4 ${
                      isBookmarked ? "fill-chart-5 text-chart-5" : ""
                    }`}
                    aria-hidden="true"
                  />
                </Button>
                <Button variant="outline" size="icon" onClick={handleShare} aria-label="Share this business">
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button onClick={handleGetDirections} aria-label="Get directions to this business">
                  <Navigation className="h-4 w-4 mr-2" aria-hidden="true" />
                  Directions
                </Button>
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
                <Tabs defaultValue="about" className="w-full">
                  <TabsList className="w-full justify-start">
                    <TabsTrigger value="about">About</TabsTrigger>
                    <TabsTrigger value="reviews">
                      Reviews ({business.review_count ?? 0})
                    </TabsTrigger>
                    <TabsTrigger value="deals">
                      Deals ({business.deals?.length || 0})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="about" className="mt-6 space-y-6">
                    {/* AI Description */}
                    <Card className="overflow-hidden border-t-2 border-t-primary/30">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">About</h3>
                            {aiDescription && (
                              <Badge variant="secondary" className="gap-1 text-xs">
                                <Sparkles className="h-3 w-3" />
                                AI Generated
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleGenerateDescription(true)}
                            disabled={isGeneratingDescription}
                            className="h-8 px-2"
                          >
                            {isGeneratingDescription ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                        </div>

                        {isGeneratingDescription ? (
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-[95%]" />
                            <Skeleton className="h-4 w-[90%]" />
                          </div>
                        ) : aiDescription ? (
                          <div className="space-y-4">
                            <p className="text-muted-foreground leading-relaxed">
                              {aiDescription}
                            </p>
                            {aiDescriptionCached && (
                              <p className="text-xs text-muted-foreground">
                                This description was AI-generated based on the business website and customer reviews.
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-muted-foreground">
                            {business.description || business.short_description || "Generating AI description..."}
                          </p>
                        )}

                        {business.tags && business.tags.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium mb-2">Tags</h4>
                            <div className="flex flex-wrap gap-2">
                              {business.tags.map((tag: string) => (
                                <Badge key={tag} variant="outline">
                                  {tag}
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
                    {/* Write Review */}
                    {user && (
                      <Card>
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
                            <CaptchaWidget
                              onVerify={handleCaptchaVerify}
                              action="review"
                            />
                            <Button
                              onClick={handleSubmitReview}
                              disabled={isSubmittingReview || !captchaToken}
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
                              {(() => {
                                const syncStatus = getSyncStatus({
                                  last_synced_at: business.last_synced_at,
                                  sync_status: business.sync_status,
                                });
                                return (
                                  <Badge
                                    variant={syncStatus.isStale ? "secondary" : "outline"}
                                    className="text-xs"
                                  >
                                    {syncStatus.isStale ? "Needs Sync" : "Up to date"}
                                  </Badge>
                                );
                              })()}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {(() => {
                                const syncStatus = getSyncStatus({
                                  last_synced_at: business.last_synced_at,
                                  sync_status: business.sync_status,
                                });
                                return syncStatus.lastSyncedText;
                              })()}
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
                    {business.reviews && business.reviews.length > 0 ? (
                      business.reviews.map((review: ReviewWithUser, index: number) => (
                        <AnimatedSection
                          key={review.id}
                          animation="fade-up"
                          delay={0.1 * index}
                        >
                          <Card className={cn(
                            "border-l-4",
                            review.rating >= 4 ? "border-l-chart-2" : review.rating >= 3 ? "border-l-chart-5" : "border-l-destructive"
                          )}>
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  {review.source === 'google' && review.external_author_photo ? (
                                    <img
                                      src={review.external_author_photo}
                                      alt={review.external_author_name || 'Reviewer'}
                                      className="h-10 w-10 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                      <span className="font-medium">
                                        {(review.source === 'google'
                                          ? review.external_author_name?.[0]
                                          : review.user?.full_name?.[0]) || "U"}
                                      </span>
                                    </div>
                                  )}
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium">
                                        {review.source === 'google'
                                          ? review.external_author_name
                                          : (review.user?.full_name || "Anonymous")}
                                      </p>
                                      {review.source === 'google' && (
                                        <Badge variant="outline" className="text-xs">
                                          From Google
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(review.external_time || review.created_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 fill-chart-5 text-chart-5" />
                                  <span>{review.rating}</span>
                                </div>
                              </div>
                              <p className="text-muted-foreground">{review.content}</p>
                            </CardContent>
                          </Card>
                        </AnimatedSection>
                      ))
                    ) : business.review_count > 0 ? (
                      <Card>
                        <CardContent className="p-6 text-center">
                          {isSyncingReviews ? (
                            <>
                              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-muted-foreground" />
                              <p className="text-muted-foreground">Syncing Google reviews...</p>
                            </>
                          ) : (
                            <>
                              <p className="text-muted-foreground">
                                {business.review_count} reviews available on Google
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Click Refresh above to load the latest reviews
                              </p>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    ) : (
                      <Card>
                        <CardContent className="p-6 text-center">
                          <p className="text-muted-foreground">No reviews yet</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Be the first to share your experience!
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="deals" className="mt-6 space-y-6">
                    {business.deals && business.deals.length > 0 ? (
                      business.deals.map((deal, index: number) => (
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
                                  {claimedDeals[deal.id] ? (
                                    <div className="mt-2">
                                      <Badge className="bg-chart-2 text-white mb-1">
                                        Claimed
                                      </Badge>
                                      <div className="text-xs text-muted-foreground">
                                        Code: {claimedDeals[deal.id]}
                                      </div>
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm"
                                      className="mt-2"
                                      onClick={() => handleClaimDeal(deal)}
                                      disabled={claimDeal.isPending}
                                    >
                                      {claimDeal.isPending ? (
                                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                      ) : (
                                        <DollarSign className="h-4 w-4 mr-1" />
                                      )}
                                      {claimDeal.isPending ? "Claiming..." : "Claim"}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </AnimatedSection>
                      ))
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
            <div className="space-y-6">
              <AnimatedSection animation="fade-up" delay={0.2}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="text-base">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button className="w-full" onClick={handleGetDirections}>
                      <Navigation className="h-4 w-4 mr-2" />
                      Get Directions
                    </Button>
                    <Button
                      variant={hasCheckedIn ? "secondary" : "outline"}
                      className="w-full"
                      onClick={handleCheckIn}
                      disabled={isCheckingIn || hasCheckedIn}
                    >
                      {isCheckingIn ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : hasCheckedIn ? (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      ) : (
                        <MapPinned className="h-4 w-4 mr-2" />
                      )}
                      {hasCheckedIn ? "Checked In Today" : "Check In"}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleBookmark}
                      disabled={toggleBookmark.isPending}
                    >
                      <Heart
                        className={`h-4 w-4 mr-2 ${
                          isBookmarked ? "fill-chart-5 text-chart-5" : ""
                        }`}
                      />
                      {isBookmarked ? "Bookmarked" : "Bookmark"}
                    </Button>
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
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Bookmarked by</span>
                      <span className="font-medium">
                        {business.bookmark_count} people
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total reviews</span>
                      <span className="font-medium">
                        {business.review_count}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Average rating</span>
                      <span className="font-medium flex items-center gap-1">
                        <Star className="h-3 w-3 fill-chart-5 text-chart-5" />
                        {business.average_rating}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </AnimatedSection>

              {/* Map Card */}
              {business.latitude && business.longitude && (
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
                        src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}&q=${encodeURIComponent(business.name)}&center=${business.latitude},${business.longitude}&zoom=15`}
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
    </div>
  );
}
