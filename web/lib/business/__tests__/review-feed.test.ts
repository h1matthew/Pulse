import { describe, expect, it } from "vitest";
import type { ExternalReview, ReviewWithUser } from "@/types/business";
import {
  REVIEW_PAGE_SIZE,
  buildCombinedReviewFeed,
  buildReviewPageNumbers,
  paginateCombinedReviewFeed,
} from "../review-feed";

function createLocalReview(index: number): ReviewWithUser {
  return {
    id: `local-${index}`,
    business_id: "biz-1",
    user_id: `user-${index}`,
    rating: 5,
    content: `Local review ${index}`,
    photos: [],
    verified_purchase: false,
    helpful_count: 0,
    is_featured: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    user: {
      id: `user-${index}`,
      full_name: `Local Reviewer ${index}`,
      avatar_url: null,
    },
  };
}

function createExternalReview(index: number): ExternalReview {
  return {
    id: `external-${index}`,
    source: "google",
    rating: 4,
    content: `External review ${index}`,
    author_name: `Google Reviewer ${index}`,
    created_at: "2026-01-01T00:00:00.000Z",
    relative_time: `${index} days ago`,
    maps_url: `https://maps.google.com/review/${index}`,
  };
}

describe("review feed helpers", () => {
  it("combines pulse reviews before google reviews", () => {
    const localReviews = [createLocalReview(1), createLocalReview(2)];
    const externalReviews = [createExternalReview(1), createExternalReview(2)];

    const feed = buildCombinedReviewFeed(localReviews, externalReviews);

    expect(feed.map((item) => `${item.source}:${item.review.id}`)).toEqual([
      "pulse:local-1",
      "pulse:local-2",
      "google:external-1",
      "google:external-2",
    ]);
  });

  it("paginates feed items and exposes navigation flags", () => {
    const feed = buildCombinedReviewFeed(
      [createLocalReview(1), createLocalReview(2), createLocalReview(3)],
      [
        createExternalReview(1),
        createExternalReview(2),
        createExternalReview(3),
        createExternalReview(4),
      ]
    );

    const firstPage = paginateCombinedReviewFeed(feed, 1);
    const secondPage = paginateCombinedReviewFeed(feed, 2);

    expect(firstPage.totalItems).toBe(7);
    expect(firstPage.totalPages).toBe(2);
    expect(firstPage.items).toHaveLength(REVIEW_PAGE_SIZE);
    expect(firstPage.hasPreviousPage).toBe(false);
    expect(firstPage.hasNextPage).toBe(true);

    expect(secondPage.page).toBe(2);
    expect(secondPage.items.map((item) => item.review.id)).toEqual([
      "external-3",
      "external-4",
    ]);
    expect(secondPage.hasPreviousPage).toBe(true);
    expect(secondPage.hasNextPage).toBe(false);
  });

  it("clamps invalid page values", () => {
    const feed = buildCombinedReviewFeed(
      [createLocalReview(1)],
      [createExternalReview(1), createExternalReview(2)]
    );

    expect(paginateCombinedReviewFeed(feed, 0).page).toBe(1);
    expect(paginateCombinedReviewFeed(feed, 999).page).toBe(1);
  });

  it("builds page numbers from total page count", () => {
    expect(buildReviewPageNumbers(1)).toEqual([1]);
    expect(buildReviewPageNumbers(4)).toEqual([1, 2, 3, 4]);
    expect(buildReviewPageNumbers(0)).toEqual([]);
  });
});
