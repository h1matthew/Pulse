"use client";

import { useState, useEffect } from "react";
import { Search, SlidersHorizontal, MapPin, Star, Heart, Loader2, LocateFixed, Navigation, MapPinned } from "lucide-react";
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

  const getPriceRange = (level: number | null) => {
    if (!level) return "";
    return "$".repeat(level);
  };

  // Calculate distance if user location is available
  const getDistance = () => {
    if (!userLocation || !business.latitude || !business.longitude) return null;
    const distance = calculateDistance(
      { lat: userLocation.lat, lng: userLocation.lng },
      { lat: business.latitude, lng: business.longitude }
    );
    return formatDistance(distance);
  };

  const distance = getDistance();

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
    } catch (error) {
      toast.error("Error", {
        description: "Failed to update bookmark",
      });
    }
  };

  return (
    <AnimatedSection animation="fade-up" delay={0.1 * (index + 3)}>
      <NavLink href={`/business/${business.id}`}>
        <Card className="h-full card-lift cursor-pointer group">
          <CardContent className="p-0">
            {/* Image Placeholder */}
            <div className="h-40 bg-gradient-to-br from-primary/10 to-chart-2/10 flex items-center justify-center text-6xl relative">
              {business.category?.icon || "🏪"}
              {business.is_featured && (
                <Badge className="absolute top-3 left-3 bg-chart-2 text-white">
                  Featured
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 bg-background/80 hover:bg-background"
                onClick={handleBookmark}
                disabled={toggleBookmark.isPending}
              >
                <Heart
                  className={`h-4 w-4 ${
                    isBookmarked ? "fill-chart-5 text-chart-5" : ""
                  }`}
                />
              </Button>
            </div>

            {/* Content */}
            <div className="p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                    {business.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {business.category?.name}
                  </p>
                </div>
                {business.is_verified && (
                  <Badge variant="secondary" className="text-xs">
                    ✓ Verified
                  </Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground mb-3">
                {business.short_description || business.description}
              </p>

              <div className="flex items-center gap-1 mb-3">
                <Star className="h-4 w-4 fill-chart-5 text-chart-5" />
                <span className="font-medium">{business.average_rating}</span>
                <span className="text-muted-foreground">
                  ({business.review_count} reviews)
                </span>
                {business.price_range && (
                  <>
                    <span className="text-muted-foreground mx-1">•</span>
                    <span className="text-muted-foreground">
                      {getPriceRange(business.price_range)}
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                <MapPin className="h-3 w-3" />
                {business.address}
              </div>

              {distance && (
                <div className="flex items-center gap-1 text-sm text-primary mb-3">
                  <Navigation className="h-3 w-3" />
                  {distance} away
                </div>
              )}

              {business.tags && business.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {business.tags.slice(0, 3).map((tag: string) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {business.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{business.tags.length - 3}
                    </Badge>
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
      <Header />

      {/* Hero Section */}
      <section className="relative px-6 pt-24 pb-8">
        <div className="mx-auto max-w-6xl">
          <AnimatedSection animation="fade-up">
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              {nearbyMode ? 'Businesses Near You' : 'Discover Local Businesses'}
            </h1>
            <p className="text-muted-foreground mb-6">
              {nearbyMode
                ? 'Real businesses from Google Places in your area'
                : 'Find and support amazing local businesses in your community'}
            </p>
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
