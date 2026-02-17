import type { ExternalReview, ReviewWithUser } from "@/types/business";

export const REVIEW_PAGE_SIZE = 5;

export type CombinedReviewFeedItem =
  | {
      id: string;
      source: "pulse";
      review: ReviewWithUser;
    }
  | {
      id: string;
      source: "google";
      review: ExternalReview;
    };

export interface PaginatedCombinedReviewFeed {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  items: CombinedReviewFeedItem[];
}

function toPositiveInteger(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : fallback;
}

export function buildCombinedReviewFeed(
  localReviews: ReviewWithUser[] = [],
  externalReviews: ExternalReview[] = []
): CombinedReviewFeedItem[] {
  return [
    ...localReviews.map((review) => ({
      id: `pulse:${review.id}`,
      source: "pulse" as const,
      review,
    })),
    ...externalReviews.map((review) => ({
      id: `google:${review.id}`,
      source: "google" as const,
      review,
    })),
  ];
}

export function paginateCombinedReviewFeed(
  feed: CombinedReviewFeedItem[],
  page: number,
  pageSize = REVIEW_PAGE_SIZE
): PaginatedCombinedReviewFeed {
  const safePageSize = toPositiveInteger(pageSize, REVIEW_PAGE_SIZE);
  const totalItems = feed.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const safePage = Math.min(toPositiveInteger(page, 1), totalPages);
  const start = (safePage - 1) * safePageSize;
  const end = start + safePageSize;

  return {
    page: safePage,
    pageSize: safePageSize,
    totalItems,
    totalPages,
    hasPreviousPage: safePage > 1,
    hasNextPage: safePage < totalPages,
    items: feed.slice(start, end),
  };
}

export function buildReviewPageNumbers(totalPages: number): number[] {
  const safeTotalPages = toPositiveInteger(totalPages, 0);
  return Array.from({ length: safeTotalPages }, (_, index) => index + 1);
}
