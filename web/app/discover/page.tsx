"use client";

import { useState, useEffect } from "react";
import { Search, SlidersHorizontal, MapPin, Star, Heart, Loader2, LocateFixed, Navigation, MapPinned, Clock, TrendingUp } from "lucide-react";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORY_FILTERS } from "@/lib/constants/navigation";
import { AnimatedSection } from "@/components/features/home/AnimatedSection";
import { NavLink } from "@/components/ui/nav-link";
import { useBusinesses, useNearbyBusinesses } from "@/hooks/useBusinesses";
import {
  useIsBookmarked,
  useToggleBookmark,
} from "@/hooks/useBookmarks";
import { useAuth } from "@/components/providers/AuthProvider";
import { useLocation, formatDistance, calculateDistance } from "@/hooks/useLocation";
import { toast } from "sonner";
import {
  buildBusinessFallbackImageUrl,
  buildBusinessPhotoUrl,
  buildBusinessSummary,
  getBusinessReviewLabel,
} from "@/lib/business/display";
import type { BusinessWithCategory } from "@/types/business";
import type { LatLng } from "@/types/business";

function BusinessCard({
  business,
  index,
  userLocation,
}: {
  business: BusinessWithCategory;
  index: number;
  userLocation?: LatLng | null;
}) {
  const { user } = useAuth();
  const { data: isBookmarked } = useIsBookmarked(business.id);
  const toggleBookmark = useToggleBookmark();
  const [photoLoadFailed, setPhotoLoadFailed] = useState(false);

  const getPriceRange = (level: number | null) => {
    if (!level) return "";
    return "$".repeat(level);
  };

  const getDistance = () => {
    if (!userLocation || !business.latitude || !business.longitude) return null;
    const distance = calculateDistance(
      { lat: userLocation.lat, lng: userLocation.lng },
      { lat: business.latitude, lng: business.longitude }
    );
    return formatDistance(distance);
  };

  const distance = getDistance();
  const photoUrl = buildBusinessPhotoUrl(business.photos?.[0], {
    maxWidth: 400,
    maxHeight: 300,
  });
  const fallbackImageUrl = buildBusinessFallbackImageUrl({
    name: business.name,
    categoryName: business.category?.name,
  });
  const showPhoto = !!photoUrl && !photoLoadFailed;
  const reviewLabel = getBusinessReviewLabel({
    data_source: business.data_source,
    review_count: business.review_count,
  });
  const summary = buildBusinessSummary({
    name: business.name,
    short_description: business.short_description,
    description: business.description,
    categoryName: business.category?.name,
    city: business.city,
    state: business.state,
    tags: business.tags,
  });

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error("Sign in required", {
        description: "Please sign in to bookmark businesses",
      });
      return;
    }

    try {
      await toggleBookmark.mutateAsync({
        businessId: business.id,
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

  return (
    <AnimatedSection animation="fade-up" delay={0.05 * (index % 6)}>
      <NavLink href={`/business/${business.id}`}>
        <Card className="h-full cursor-pointer group overflow-hidden border border-border/60 bg-card/90 backdrop-blur-sm shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <CardContent className="p-0">
            {/* Image / Hero */}
            <div className="relative h-48 overflow-hidden">
              {showPhoto ? (
                <>
                  <Image
                    src={photoUrl}
                    alt={business.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    unoptimized
                    onError={() => setPhotoLoadFailed(true)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                </>
              ) : (
                <>
                  <Image
                    src={fallbackImageUrl}
                    alt={`${business.name} default cover`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />
                </>
              )}

              {/* Overlaid badges */}
              <div className="absolute top-3 left-3 flex gap-2">
                {business.is_featured && (
                  <Badge className="bg-chart-2 text-white border-0 shadow-lg text-xs font-semibold">
                    Featured
                  </Badge>
                )}
                {business.is_verified && (
                  <Badge className="bg-primary text-primary-foreground border-0 shadow-lg text-xs font-semibold">
                    Verified
                  </Badge>
                )}
              </div>

              {/* Bookmark button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white border-0 h-8 w-8"
                onClick={handleBookmark}
                disabled={toggleBookmark.isPending}
              >
                <Heart
                  className={`h-4 w-4 ${
                    isBookmarked ? "fill-red-400 text-red-400" : "text-white"
                  }`}
                />
              </Button>

              {/* Bottom overlay info (on photo cards) */}
              {showPhoto && (
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="font-bold text-lg text-white drop-shadow-md leading-tight">
                    {business.name}
                  </h3>
                  <p className="text-white/80 text-sm drop-shadow-md">
                    {business.category?.name}
                  </p>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-4">
              {/* Name + category (only when no photo) */}
              {!showPhoto && (
                <div className="mb-2">
                  <h3 className="font-bold text-lg group-hover:text-primary transition-colors leading-tight">
                    {business.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {business.category?.name}
                  </p>
                </div>
              )}

              {/* Rating row */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1 bg-chart-5/10 px-2 py-0.5 rounded-full">
                  <Star className="h-3.5 w-3.5 fill-chart-5 text-chart-5" />
                  <span className="font-semibold text-sm">{business.average_rating || "New"}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {reviewLabel}
                </span>
                {business.data_source === "google" && business.review_count > 0 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/40 text-primary">
                    Google
                  </Badge>
                )}
                {business.price_range && (
                  <>
                    <span className="text-muted-foreground text-xs">·</span>
                    <span className="text-sm font-medium text-muted-foreground">
                      {getPriceRange(business.price_range)}
                    </span>
                  </>
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-foreground/80 line-clamp-2 mb-3 leading-relaxed">
                {summary}
              </p>

              {/* Location + distance */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{business.address}</span>
                </span>
                {distance && (
                  <span className="flex items-center gap-1 text-primary font-medium whitespace-nowrap">
                    <Navigation className="h-3 w-3" />
                    {distance}
                  </span>
                )}
              </div>

              {/* Tags */}
              {business.tags && business.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2 border-t border-border/50">
                  {business.tags.slice(0, 3).map((tag: string) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                  {business.tags.length > 3 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      +{business.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </NavLink>
    </AnimatedSection>
  );
}

function BusinessCardSkeleton() {
  return (
    <Card className="h-full">
      <CardContent className="p-0">
        <Skeleton className="h-40 w-full" />
        <div className="p-5 space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-1">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DiscoverPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"rating" | "name" | "review_count" | "distance">("rating");
  const [searchQuery, setSearchQuery] = useState("");
  const [nearbyMode, setNearbyMode] = useState(false);

  const { location, loading: locationLoading, error: locationError, requestLocation, permission } = useLocation();

  // Use nearby businesses hook when in nearby mode
  const { data: nearbyData, isLoading: nearbyLoading } = useNearbyBusinesses(
    nearbyMode && location ? { lat: location.lat, lng: location.lng } : undefined,
    5000 // 5km radius
  );

  // Use regular businesses hook when not in nearby mode
  const { data, isLoading: regularLoading } = useBusinesses(
    nearbyMode
      ? {}
      : {
          category: selectedCategory === "all" ? undefined : selectedCategory,
          sortBy: sortBy === "distance" ? "rating" : sortBy,
        },
    1,
    50
  );

  const isLoading = nearbyMode ? nearbyLoading || locationLoading : regularLoading;
  const businesses = nearbyMode ? (nearbyData || []) : (data?.businesses || []);

  // Filter by search query and category on client side
  const filteredBusinesses = businesses.filter((business) => {
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        business.name.toLowerCase().includes(query) ||
        (business.description?.toLowerCase().includes(query) ?? false) ||
        (business.short_description?.toLowerCase().includes(query) ?? false);
      if (!matchesSearch) return false;
    }

    // Filter by category in nearby mode
    if (nearbyMode && selectedCategory !== "all") {
      return business.category?.slug === selectedCategory;
    }

    return true;
  });

  // Sort by distance when in nearby mode
  const sortedBusinesses = [...filteredBusinesses].sort((a, b) => {
    if (nearbyMode && location) {
      const distA = a.latitude && a.longitude
        ? calculateDistance(
            { lat: location.lat, lng: location.lng },
            { lat: a.latitude, lng: a.longitude }
          )
        : Infinity;
      const distB = b.latitude && b.longitude
        ? calculateDistance(
            { lat: location.lat, lng: location.lng },
            { lat: b.latitude, lng: b.longitude }
          )
        : Infinity;
      return distA - distB;
    }
    return 0;
  });
  const averageVisibleRating =
    sortedBusinesses.length > 0
      ? (
          sortedBusinesses.reduce((total, business) => {
            if (!business.average_rating) return total;
            return total + business.average_rating;
          }, 0) / sortedBusinesses.length
        ).toFixed(1)
      : "0.0";
  const featuredCount = sortedBusinesses.filter((business) => business.is_featured).length;
  const googleCount = sortedBusinesses.filter((business) => business.data_source === "google").length;

  const handleNearbyClick = async () => {
    if (!nearbyMode) {
      // Turning on nearby mode
      if (!location && permission !== 'denied') {
        toast.info("Requesting location...", {
          description: "Please allow location access to find businesses near you.",
        });
        requestLocation();
      }
      setNearbyMode(true);
    } else {
      // Turning off nearby mode
      setNearbyMode(false);
    }
  };

  // Effect to handle location errors
  useEffect(() => {
    if (nearbyMode && locationError) {
      toast.error("Location Error", {
        description: locationError,
      });
    }
  }, [nearbyMode, locationError]);

  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-primary/10 via-chart-2/5 to-transparent" />
      <div className="pointer-events-none absolute -top-20 right-4 h-72 w-72 rounded-full bg-chart-2/10 blur-3xl" />
      <div className="pointer-events-none absolute top-10 -left-16 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
      <Header />

      {/* Hero Section */}
      <section className="relative px-6 pt-24 pb-8">
        <div className="mx-auto max-w-6xl">
          <AnimatedSection animation="fade-up">
            <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/85 backdrop-blur-sm p-6 md:p-8 shadow-xl shadow-primary/5">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-chart-2/8" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold tracking-tight">
                    {nearbyMode ? "Businesses Near You" : "Discover Local Businesses"}
                  </h1>
                  {nearbyMode && (
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground mb-6 text-lg">
                  {nearbyMode
                    ? "Live places pulled from Google around your current location."
                    : "Find standout neighborhood spots with real rating signals and community feedback."}
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border/50 bg-background/70 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      Businesses
                    </div>
                    <p className="text-2xl font-semibold mt-1">{sortedBusinesses.length}</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/70 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                      <Star className="h-3.5 w-3.5" />
                      Avg Rating
                    </div>
                    <p className="text-2xl font-semibold mt-1">{averageVisibleRating}</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/70 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                      {nearbyMode ? <Clock className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
                      {nearbyMode ? "Google Sources" : "Featured Picks"}
                    </div>
                    <p className="text-2xl font-semibold mt-1">{nearbyMode ? googleCount : featuredCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Search and Filters */}
          <AnimatedSection animation="fade-up" delay={0.1}>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search businesses..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={nearbyMode ? "default" : "outline"}
                  size="sm"
                  onClick={handleNearbyClick}
                  disabled={locationLoading && !nearbyMode}
                  className={`gap-2 ${!nearbyMode ? 'border-primary/50 hover:border-primary' : ''}`}
                >
                  {locationLoading && !nearbyMode ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Getting location...
                    </>
                  ) : (
                    <>
                      <LocateFixed className="h-4 w-4" />
                      {nearbyMode ? 'Near Me ✓' : 'Near Me'}
                    </>
                  )}
                </Button>
                <Select
                  value={sortBy}
                  onValueChange={(v) => setSortBy(v as typeof sortBy)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                    <SelectItem value="review_count">Most Reviewed</SelectItem>
                    {nearbyMode && (
                      <SelectItem value="distance">Nearest</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {nearbyMode && location && (
              <div className="mb-4 p-3 bg-primary/5 rounded-lg flex items-center gap-2 text-sm border border-primary/20">
                <Navigation className="h-4 w-4 text-primary" />
                <span>Showing real businesses near your location from Google Places</span>
                <button
                  onClick={() => setNearbyMode(false)}
                  className="ml-auto text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
            )}

            {nearbyMode && !location && permission === 'denied' && (
              <div className="mb-4 p-4 bg-destructive/10 rounded-lg text-sm text-destructive border border-destructive/20">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4" />
                  <span className="font-medium">Location access denied</span>
                </div>
                <p className="mb-2">Please enable location access in your browser settings:</p>
                <ul className="list-disc list-inside text-xs space-y-1 ml-1">
                  <li><strong>Chrome:</strong> Click the lock icon in the address bar → Site settings → Location → Allow</li>
                  <li><strong>Safari:</strong> Preferences → Websites → Location → Allow for this site</li>
                  <li><strong>Firefox:</strong> Click the shield icon → Permissions → Location → Allow</li>
                </ul>
                <p className="mt-2 text-xs">After enabling, click the button below to retry.</p>
              </div>
            )}
          </AnimatedSection>

          {/* Category Filters */}
          <AnimatedSection animation="fade-up" delay={0.15}>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
              {CATEGORY_FILTERS.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="whitespace-nowrap"
                >
                  <span className="mr-1">{category.icon}</span>
                  {category.name}
                </Button>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Business Grid */}
      <section className="relative px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <AnimatedSection animation="fade-up" delay={0.2}>
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm text-muted-foreground">
                {isLoading ? (
                  <span className="inline-block">
                    <Skeleton className="h-4 w-32" />
                  </span>
                ) : (
                  <>Showing {sortedBusinesses.length} businesses</>
                )}
              </div>
            </div>
          </AnimatedSection>

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <BusinessCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedBusinesses.map((business, index) => (
                  <BusinessCard
                    key={business.id}
                    business={business}
                    index={index}
                    userLocation={location}
                  />
                ))}
              </div>

              {sortedBusinesses.length === 0 && !isLoading && (
                <>
                  {nearbyMode && !location ? (
                    <div className="text-center py-16">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                        <MapPinned className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">
                        {permission === 'denied' ? 'Location Access Required' : 'Enable Location Access'}
                      </h3>
                      <p className="text-muted-foreground max-w-md mx-auto mb-6">
                        {permission === 'denied'
                          ? 'Your browser is blocking location access. Please enable it in your browser settings and try again.'
                          : 'Allow access to your location to discover real businesses near you. We use Google Places to find the best local spots.'}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button onClick={() => requestLocation(true)} disabled={locationLoading}>
                          {locationLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Getting location...
                            </>
                          ) : (
                            <>
                              <LocateFixed className="h-4 w-4 mr-2" />
                              {permission === 'denied' ? 'Retry Location Access' : 'Allow Location Access'}
                            </>
                          )}
                        </Button>
                        <Button variant="outline" onClick={() => setNearbyMode(false)}>
                          Browse All Businesses
                        </Button>
                      </div>
                      {permission === 'denied' && (
                        <p className="text-sm text-muted-foreground mt-4 max-w-md">
                          If you&apos;ve already allowed location in your browser settings, click &quot;Retry Location Access&quot;.
                          You may need to refresh the page after changing browser settings.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="text-4xl mb-4">🔍</div>
                      <h3 className="text-lg font-semibold mb-2">No businesses found</h3>
                      <p className="text-muted-foreground">
                        {nearbyMode
                          ? "No businesses found in this area. Try expanding your search radius or browsing all businesses."
                          : "Try adjusting your search or filters"}
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
