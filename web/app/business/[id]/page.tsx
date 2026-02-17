"use client";

import { use, useEffect, useState } from "react";
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
} from "lucide-react";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { AnimatedSection } from "@/components/features/home/AnimatedSection";
import { useBusiness } from "@/hooks/useBusinesses";
import { useClaimDeal } from "@/hooks/useDeals";
import {
  useIsBookmarked,
  useToggleBookmark,
} from "@/hooks/useBookmarks";
import { useAuth } from "@/components/providers/AuthProvider";
import { toast } from "sonner";
import { NavLink } from "@/components/ui/nav-link";
import {
  buildBusinessFallbackImageUrl,
  buildBusinessPhotoUrl,
  buildBusinessSummary,
  getBusinessReviewLabel,
  getGoogleMapsReviewUrl,
  shouldShowGoogleReviewHint,
} from "@/lib/business/display";
import {
  buildCombinedReviewFeed,
  buildReviewPageNumbers,
  paginateCombinedReviewFeed,
} from "@/lib/business/review-feed";

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

  const { data: business, isLoading } = useBusiness(id);
  const canonicalBusinessId = business?.id || id;
  const { data: isBookmarked } = useIsBookmarked(canonicalBusinessId);
  const toggleBookmark = useToggleBookmark();
  const claimDeal = useClaimDeal();

  useEffect(() => {
    setHeroPhotoFailed(false);
  }, [business?.id]);

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
    if (!user) {
      toast.error("Sign in required", {
        description: "Please sign in to leave a review",
      });
      return;
    }

    if (!reviewText.trim()) {
      toast.error("Review required", {
        description: "Please write a review before submitting",
      });
      return;
    }

    if (!business?.id) {
      toast.error("Business unavailable", {
        description: "Could not resolve this business. Please refresh and try again.",
      });
      return;
    }

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: business.id,
          rating: reviewRating,
          content: reviewText,
        }),
      });

      if (!response.ok) throw new Error("Failed to submit review");

      toast.success("Review submitted", {
        description: "Thank you for sharing your experience!",
      });
      setReviewText("");
      setReviewRating(5);
      queryClient.invalidateQueries({ queryKey: ["businesses", "detail"] });
    } catch {
      toast.error("Error", {
        description: "Failed to submit review. Please try again.",
      });
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

  if (isLoading) {
    return (
      <div className="relative min-h-screen bg-background">
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
  const fallbackHeroImageUrl = buildBusinessFallbackImageUrl({
    name: business.name,
    categoryName: business.category?.name,
  });
  const googleReviewsUrl = getGoogleMapsReviewUrl({
    name: business.name,
    address: [business.address, business.city, business.state]
      .filter(Boolean)
      .join(", "),
    place_id: business.place_id,
  });

  return (
    <div className="relative min-h-screen bg-background">
      <Header />

      <div className="pt-20 pb-12">
        <div className="mx-auto max-w-6xl px-6">
          {/* Hero Image */}
          <AnimatedSection animation="fade-up">
            <div className="h-64 md:h-80 rounded-2xl mb-6 relative overflow-hidden">
              {(() => {
                const photoUrl = buildBusinessPhotoUrl(business.photos?.[0], {
                  maxWidth: 800,
                  maxHeight: 500,
                });
                const showPhoto = !!photoUrl && !heroPhotoFailed;
                return showPhoto ? (
                  <>
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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  </>
                ) : (
                  <>
                    <Image
                      src={fallbackHeroImageUrl}
                      alt={`${business.name} default cover`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1200px) 100vw, 1152px"
                      priority
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                  </>
                );
              })()}
              {business.is_featured && (
                <Badge className="absolute top-4 left-4 bg-chart-2 text-white border-0 shadow-lg">
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
                    <Star className="h-4 w-4 fill-chart-5 text-chart-5" />
                    <span className="font-medium text-foreground">
                      {business.average_rating}
                    </span>
                    <span>({reviewLabel})</span>
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
                >
                  <Heart
                    className={`h-4 w-4 ${
                      isBookmarked ? "fill-chart-5 text-chart-5" : ""
                    }`}
                  />
                </Button>
                <Button variant="outline" size="icon" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button onClick={handleGetDirections}>
                  <Navigation className="h-4 w-4 mr-2" />
                  Directions
                </Button>
              </div>
            </div>
          </AnimatedSection>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <AnimatedSection animation="fade-up" delay={0.15}>
                <Tabs defaultValue={defaultTab} className="w-full">
                  <TabsList className="w-full justify-start">
                    <TabsTrigger value="about">About</TabsTrigger>
                    <TabsTrigger value="reviews">
                      Reviews ({reviewTabCount})
                    </TabsTrigger>
                    <TabsTrigger value="deals">
                      Deals ({business.deals?.length || 0})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="about" className="mt-6 space-y-6">
                    {/* Description */}
                    <Card>
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
                      <Card>
                        <CardContent className="p-6">
                          <h3 className="font-semibold mb-4">Write a Review</h3>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium mb-2 block">
                                Rating
                              </label>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    onClick={() => setReviewRating(star)}
                                    className="p-1"
                                  >
                                    <Star
                                      className={`h-6 w-6 ${
                                        star <= reviewRating
                                          ? "fill-chart-5 text-chart-5"
                                          : "text-muted-foreground"
                                      }`}
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-2 block">
                                Your Review
                              </label>
                              <Textarea
                                placeholder="Share your experience..."
                                value={reviewText}
                                onChange={(e) => setReviewText(e.target.value)}
                                rows={4}
                              />
                            </div>
                            <Button onClick={handleSubmitReview}>
                              <Send className="h-4 w-4 mr-2" />
                              Submit Review
                            </Button>
                          </div>
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
                      <Card>
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
                                  <Button
                                    size="sm"
                                    className="mt-2"
                                    disabled={claimDeal.isPending}
                                    onClick={() => handleClaimDeal(deal.id)}
                                  >
                                    <DollarSign className="h-4 w-4 mr-1" />
                                    {claimDeal.isPending ? "Claiming..." : "Claim"}
                                  </Button>
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
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button className="w-full" onClick={handleGetDirections}>
                      <Navigation className="h-4 w-4 mr-2" />
                      Get Directions
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
                <Card>
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
                      <span className="text-muted-foreground">
                        {business.data_source === "google" ? "Total ratings" : "Total reviews"}
                      </span>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
