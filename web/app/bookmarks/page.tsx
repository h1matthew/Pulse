"use client";

import {
  Heart,
  MapPin,
  Star,
  Trash2,
  ExternalLink,
  Loader2,
  Info,
  Lock,
  Store,
  Bookmark,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useHydrationSafeQuery } from "@/hooks/useHydrationSafeQuery";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedSection } from "@/components/features/home/AnimatedSection";
import { NavLink } from "@/components/ui/nav-link";
import { useUserBookmarks, useDeleteBookmark } from "@/hooks/useBookmarks";
import { useAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import {
  getLocalBookmarkIds,
  toggleLocalBookmark,
} from "@/lib/bookmarks/local";
import { toast } from "sonner";
import type { BusinessWithCategory } from "@/types/business";

interface BookmarkCardProps {
  business: BusinessWithCategory;
  index: number;
  /** Owner's note — server bookmarks only; local bookmarks have none */
  note?: string | null;
  /** ISO date the bookmark was created — server bookmarks only */
  savedAt?: string | null;
  onRemove: () => void;
}

function BookmarkCard({
  business,
  index,
  note,
  savedAt,
  onRemove,
}: BookmarkCardProps) {
  const getPriceRange = (level: number | null) => {
    if (!level) return "";
    return "$".repeat(level);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <AnimatedSection animation="fade-up" delay={0.1 * (index + 2)}>
      <Card className="h-full group">
        <CardContent className="p-0">
          {/* Image Placeholder */}
          <div className="h-40 bg-secondary flex items-center justify-center relative">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
              <Store className="h-7 w-7 text-primary" aria-hidden="true" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove ${business.name} from bookmarks`}
              className="absolute top-3 right-3 bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4" />
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

            {note && (
              <div className="p-3 bg-muted rounded-lg mb-3">
                <p className="text-sm text-muted-foreground italic">
                  &ldquo;{note}&rdquo;
                </p>
              </div>
            )}

            {business.tags && business.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {business.tags.slice(0, 3).map((tag: string) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              {savedAt ? (
                <span className="text-xs text-muted-foreground">
                  Saved {formatDate(savedAt)}
                </span>
              ) : (
                <span />
              )}
              <NavLink href={`/business/${business.id}`}>
                <Button size="sm" variant="outline" className="gap-1">
                  View
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </NavLink>
            </div>
          </div>
        </CardContent>
      </Card>
    </AnimatedSection>
  );
}

function BookmarkCardSkeleton() {
  return (
    <Card className="h-full">
      <CardContent className="p-0">
        <Skeleton className="h-40 w-full" />
        <div className="p-5 space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex gap-1">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="flex justify-between pt-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BookmarksPage() {
  const { user, loading: authLoading } = useAuth();
  const { data, isLoading } = useUserBookmarks(user?.id || "");
  const deleteBookmark = useDeleteBookmark();
  const queryClient = useQueryClient();

  const bookmarks = data?.bookmarks || [];
  const isGuest = !authLoading && !user;

  // Guest: on-device bookmark ids (same key + fn as useBookmarkedIds' guest scope)
  const localIdsQuery = useHydrationSafeQuery({
    queryKey: ["bookmarks", "ids", "local"],
    queryFn: () => getLocalBookmarkIds(),
    enabled: isGuest,
    staleTime: 0,
  });
  const localIds = isGuest ? localIdsQuery.data ?? [] : [];
  const hasLocalBookmarks = localIds.length > 0;

  // Guest: fetch the bookmarked businesses directly (public read RLS allows anon)
  const guestBusinessesQuery = useHydrationSafeQuery({
    queryKey: ["bookmarks", "local", "businesses"],
    queryFn: async (): Promise<BusinessWithCategory[]> => {
      const ids = getLocalBookmarkIds();
      if (ids.length === 0) return [];
      const supabase = createClient();
      const { data: rows, error } = await supabase
        .from("businesses")
        .select("*, category:categories(*)")
        .in("id", ids);
      if (error) throw error;
      return (rows ?? []) as BusinessWithCategory[];
    },
    enabled: isGuest && hasLocalBookmarks,
  });

  // Filter against the live id list so removals disappear without a refetch
  const guestBusinesses = (guestBusinessesQuery.data ?? []).filter((business) =>
    localIds.includes(business.id)
  );

  const handleDelete = async (bookmarkId: string) => {
    try {
      await deleteBookmark.mutateAsync(bookmarkId);
      toast.success("Bookmark removed", {
        description: "Business removed from your bookmarks",
      });
    } catch {
      toast.error("Error", {
        description: "Failed to remove bookmark",
      });
    }
  };

  const handleRemoveLocal = (businessId: string) => {
    toggleLocalBookmark(businessId);
    queryClient.invalidateQueries({ queryKey: ["bookmarks", "ids", "local"] });
    toast.success("Removed from this device", {
      description: "Sign in to sync bookmarks across devices.",
    });
  };

  // Calculate stats
  const averageRating =
    bookmarks.length > 0
      ? (
          bookmarks.reduce(
            (acc, b) => acc + (b.business.average_rating || 0),
            0
          ) / bookmarks.length
        ).toFixed(1)
      : "0";

  const uniqueNeighborhoods = new Set(
    bookmarks.map((b) => b.business.city)
  ).size;

  if (authLoading || (isGuest && localIdsQuery.isPending)) {
    return (
      <div className="relative min-h-screen">
        <Header />
        <div className="pt-28 pb-12 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user && !hasLocalBookmarks) {
    return (
      <div className="relative min-h-screen">
        <Header />
        <div className="pt-28 pb-12">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Lock className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Sign in required</h1>
            <p className="text-muted-foreground mb-2">
              Please sign in to view your bookmarks
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Bookmarks you save while signed out are kept on this device.
            </p>
            <NavLink href="/login">
              <Button>Sign In</Button>
            </NavLink>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative min-h-screen">
        <Header />

        <div className="pt-28 pb-12">
          <div className="mx-auto max-w-6xl px-6">
            {/* Header */}
            <AnimatedSection animation="fade-up">
              <div className="mb-8 border-b border-border pb-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Saved places
                </p>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Your Bookmarks
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
                  Businesses you&apos;ve saved to support later
                </p>
              </div>
            </AnimatedSection>

            {/* Device-only banner */}
            <AnimatedSection animation="fade-up" delay={0.1}>
              <div
                role="status"
                className="mb-8 flex flex-col gap-3 rounded-lg border border-border bg-secondary p-4 sm:flex-row sm:items-center"
              >
                <div className="flex flex-1 items-start gap-3">
                  <Info
                    className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-medium text-foreground">
                      Saved on this device
                    </p>
                    <p className="text-sm text-muted-foreground">
                      These bookmarks live only in this browser. Sign in to
                      keep them on your account and across devices.
                    </p>
                  </div>
                </div>
                <NavLink href="/login" className="shrink-0">
                  <Button size="sm" variant="outline">
                    Sign in
                  </Button>
                </NavLink>
              </div>
            </AnimatedSection>

            {/* Local bookmarks grid */}
            <AnimatedSection animation="fade-up" delay={0.15}>
              {guestBusinessesQuery.isLoading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <BookmarkCardSkeleton key={i} />
                  ))}
                </div>
              ) : guestBusinesses.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {guestBusinesses.map((business, index) => (
                    <BookmarkCard
                      key={business.id}
                      business={business}
                      index={index}
                      onRemove={() => handleRemoveLocal(business.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Bookmark className="h-6 w-6 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    No bookmarks yet
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Start exploring and save businesses you want to support
                  </p>
                  <NavLink href="/discover">
                    <Button>Discover Businesses</Button>
                  </NavLink>
                </div>
              )}
            </AnimatedSection>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <Header />

      <div className="pt-28 pb-12">
        <div className="mx-auto max-w-6xl px-6">
          {/* Header */}
          <AnimatedSection animation="fade-up">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="h-6 w-6 text-chart-5" />
                <h1 className="text-3xl font-bold tracking-tight">
                  Your Bookmarks
                </h1>
              </div>
              <p className="text-muted-foreground">
                Businesses you&apos;ve saved to support later
              </p>
            </div>
          </AnimatedSection>

          {/* Stats */}
          <AnimatedSection animation="fade-up" delay={0.1}>
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-chart-5/10 flex items-center justify-center">
                    <Heart className="h-6 w-6 text-chart-5" />
                  </div>
                  <div suppressHydrationWarning>
                    {isLoading ? (
                      <Skeleton className="h-8 w-12" />
                    ) : (
                      <div className="text-2xl font-bold">{bookmarks.length}</div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Saved Businesses
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Star className="h-6 w-6 text-primary" />
                  </div>
                  <div suppressHydrationWarning>
                    {isLoading ? (
                      <Skeleton className="h-8 w-12" />
                    ) : (
                      <div className="text-2xl font-bold">{averageRating}</div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Avg. Rating
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-chart-2/10 flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-chart-2" />
                  </div>
                  <div suppressHydrationWarning>
                    {isLoading ? (
                      <Skeleton className="h-8 w-12" />
                    ) : (
                      <div className="text-2xl font-bold">
                        {uniqueNeighborhoods}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Neighborhoods
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </AnimatedSection>

          {/* Bookmarks Grid */}
          <AnimatedSection animation="fade-up" delay={0.15}>
            {isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <BookmarkCardSkeleton key={i} />
                ))}
              </div>
            ) : bookmarks.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bookmarks.map((bookmark, index) => (
                  <BookmarkCard
                    key={bookmark.id}
                    business={bookmark.business}
                    index={index}
                    note={bookmark.note}
                    savedAt={bookmark.created_at}
                    onRemove={() => handleDelete(bookmark.id)}
                  />
                ))}
              </div>
            ) : (
              <AnimatedSection animation="fade-up" delay={0.2}>
                <div className="text-center py-16">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Bookmark className="h-6 w-6 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    No bookmarks yet
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Start exploring and save businesses you want to support
                  </p>
                  <NavLink href="/discover">
                    <Button>Discover Businesses</Button>
                  </NavLink>
                </div>
              </AnimatedSection>
            )}
          </AnimatedSection>
        </div>
      </div>
    </div>
  );
}
