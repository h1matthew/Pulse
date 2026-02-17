/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useBusinessReviews,
  useCreateReview,
  useUserReviews,
} from "../useReviews";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  function QueryWrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  return QueryWrapper;
}

describe("useReviews", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("fetches business reviews from /api/reviews with businessId", async () => {
    const reviews = [
      {
        id: "review-1",
        business_id: "biz-1",
        user_id: "user-1",
        rating: 5,
        content: "Great coffee and quick service.",
      },
    ];

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ reviews }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { result } = renderHook(() => useBusinessReviews("biz-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch).toHaveBeenCalledWith("/api/reviews?businessId=biz-1&limit=20");
    expect(result.current.data).toEqual(reviews);
  });

  it("fetches user reviews from /api/reviews with userId", async () => {
    const reviews = [
      {
        id: "review-2",
        business_id: "biz-2",
        user_id: "user-9",
        rating: 4,
        content: "Solid neighborhood option.",
      },
    ];

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ reviews }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { result } = renderHook(() => useUserReviews("user-9"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch).toHaveBeenCalledWith("/api/reviews?userId=user-9&limit=20");
    expect(result.current.data).toEqual(reviews);
  });

  it("uses API error.message fallback when creating a review fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "You have already reviewed this business" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { result } = renderHook(() => useCreateReview(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({
        business_id: "biz-1",
        rating: 5,
        content: "Amazing.",
      })
    ).rejects.toThrow("You have already reviewed this business");
  });
});
