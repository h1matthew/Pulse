"use client";

import { Trash2, Loader2, Info, Lock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useHydrationSafeQuery } from "@/hooks/useHydrationSafeQuery";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
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

interface BookmarkRowProps {
  business: BusinessWithCategory;
  /** Owner's note — server bookmarks only; local bookmarks have none */
  note?: string | null;
  /** ISO date the bookmark was created — server bookmarks only */
  savedAt?: string | null;
  onRemove: () => void;
}

function formatSavedDate(dateString: string): string {
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
}

function BookmarkRow({ business, note, savedAt, onRemove }: BookmarkRowProps) {
  const priceLabel = business.price_range ? "$".repeat(business.price_range) : "";
  const locationLine = [business.city, business.state].filter(Boolean).join(", ");

  return (
    <article className="card-lift flex gap-4 px-2 py-4">
      {/* Rating column — largest numeral, leftmost */}
      <div className="w-11 shrink-0 pt-0.5">
        <p className="font-mono text-h3 leading-none tabular-nums">
          {business.average_rating ? business.average_rating.toFixed(1) : "—"}
        </p>
        <p className="mt-1.5 font-mono text-meta tabular-nums text-text-tertiary">
          {business.review_count ?? 0}
        </p>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-3">
          <h3 className="min-w-0 flex-1 truncate text-body font-medium">
            <NavLink href={`/business/${business.id}`} className="hover:text-primary">
              {business.name}
            </NavLink>
          </h3>
          {savedAt && (
            <span className="shrink-0 font-mono text-meta text-text-tertiary">
              Saved {formatSavedDate(savedAt)}
            </span>
          )}
        </div>

        {/* Fixed slot order: category · neighborhood · price · address */}
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 font-mono text-meta uppercase tracking-[0.02em] text-text-tertiary">
          <span>{business.category?.name ?? "Local business"}</span>
          {locationLine && (
            <>
              <span aria-hidden="true">&middot;</span>
              <span>{locationLine}</span>
            </>
          )}
          {priceLabel && (
            <>
              <span aria-hidden="true">&middot;</span>
              <span>{priceLabel}</span>
            </>
          )}
          {business.address && (
            <>
              <span aria-hidden="true">&middot;</span>
              <span>{business.address}</span>
            </>
          )}
          {business.is_verified && (
            <>
              <span aria-hidden="true">&middot;</span>
              <span>Verified</span>
            </>
          )}
        </p>

        <p className="mt-1.5 line-clamp-2 text-small text-muted-foreground">
          {business.short_description || business.description}
        </p>

        {note && (
          <p className="mt-1.5 border-l border-border pl-3 text-small text-muted-foreground">
            &ldquo;{note}&rdquo;
          </p>
        )}

        <div className="mt-2.5 flex items-center gap-4 text-meta">
          <NavLink href={`/business/${business.id}`} className="text-text-tertiary hover:text-primary">
            View
          </NavLink>
          <button
            type="button"
            aria-label={`Remove ${business.name} from bookmarks`}
            className="inline-flex items-center gap-1 text-text-tertiary hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="h-3 w-3" aria-hidden="true" />
            Remove
          </button>
        </div>
      </div>
    </article>
  );
}

function BookmarkRowSkeleton() {
  return (
    <div className="flex gap-4 px-2 py-4">
      <Skeleton className="h-6 w-11 shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
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

  // Summary figures, shown as one mono line under the heading
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
          <div className="mx-auto max-w-5xl px-6">
            <Lock className="mb-4 h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <h1 className="text-h2 font-medium">Sign in required</h1>
            <p className="mt-1.5 text-small text-muted-foreground">
              Please sign in to view your bookmarks
            </p>
            <p className="mt-1 text-small text-muted-foreground">
              Bookmarks you save while signed out are kept on this device.
            </p>
            <NavLink href="/login" className="mt-5 inline-block">
              <Button size="sm">Sign in</Button>
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
          <div className="mx-auto max-w-5xl px-6">
            <AnimatedSection animation="fade-up">
              <div className="mb-5 border-b border-border pb-5">
                <h1 className="text-h2 font-medium">Your Bookmarks</h1>
                <p className="mt-1.5 text-small text-muted-foreground">
                  Businesses you&apos;ve saved to support later.
                </p>
              </div>
            </AnimatedSection>

            {/* Device-only banner */}
            <AnimatedSection animation="fade-up" delay={0.1}>
              <div
                role="status"
                className="mb-5 flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center"
              >
                <div className="flex flex-1 items-start gap-3">
                  <Info
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-small font-medium text-foreground">
                      Saved on this device
                    </p>
                    <p className="text-small text-muted-foreground">
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

            {/* Local bookmarks feed */}
            <AnimatedSection animation="fade-up" delay={0.15}>
              {guestBusinessesQuery.isLoading ? (
                <div className="divide-y divide-border border-t border-border">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <BookmarkRowSkeleton key={i} />
                  ))}
                </div>
              ) : guestBusinesses.length > 0 ? (
                <div className="divide-y divide-border border-t border-border">
                  {guestBusinesses.map((business) => (
                    <BookmarkRow
                      key={business.id}
                      business={business}
                      onRemove={() => handleRemoveLocal(business.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="border-t border-border py-10">
                  <h3 className="text-body font-medium">No bookmarks yet</h3>
                  <p className="mt-1 text-small text-muted-foreground">
                    Save a business from Discover and it lands here.
                  </p>
                  <NavLink href="/discover" className="mt-4 inline-block">
                    <Button size="sm">Browse businesses</Button>
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
        <div className="mx-auto max-w-5xl px-6">
          <AnimatedSection animation="fade-up">
            <div className="mb-5 border-b border-border pb-5">
              <h1 className="text-h2 font-medium">Your Bookmarks</h1>
              <p className="mt-1.5 text-small text-muted-foreground">
                Businesses you&apos;ve saved to support later.
              </p>
              {!isLoading && (
                <p
                  className="mt-3 flex flex-wrap items-baseline gap-x-1.5 font-mono text-meta tabular-nums text-text-tertiary"
                  suppressHydrationWarning
                >
                  <span>{bookmarks.length} saved</span>
                  <span aria-hidden="true">&middot;</span>
                  <span>{averageRating} avg</span>
                  <span aria-hidden="true">&middot;</span>
                  <span>
                    {uniqueNeighborhoods}{" "}
                    {uniqueNeighborhoods === 1 ? "neighborhood" : "neighborhoods"}
                  </span>
                </p>
              )}
            </div>
          </AnimatedSection>

          {/* Bookmarks feed */}
          <AnimatedSection animation="fade-up" delay={0.15}>
            {isLoading ? (
              <div className="divide-y divide-border border-t border-border">
                {Array.from({ length: 5 }).map((_, i) => (
                  <BookmarkRowSkeleton key={i} />
                ))}
              </div>
            ) : bookmarks.length > 0 ? (
              <div className="divide-y divide-border border-t border-border">
                {bookmarks.map((bookmark) => (
                  <BookmarkRow
                    key={bookmark.id}
                    business={bookmark.business}
                    note={bookmark.note}
                    savedAt={bookmark.created_at}
                    onRemove={() => handleDelete(bookmark.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="border-t border-border py-10">
                <h3 className="text-body font-medium">No bookmarks yet</h3>
                <p className="mt-1 text-small text-muted-foreground">
                  Save a business from Discover and it lands here.
                </p>
                <NavLink href="/discover" className="mt-4 inline-block">
                  <Button size="sm">Browse businesses</Button>
                </NavLink>
              </div>
            )}
          </AnimatedSection>
        </div>
      </div>
    </div>
  );
}
