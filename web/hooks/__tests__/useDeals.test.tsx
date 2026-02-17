/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useAvailableDeals,
  useClaimDeal,
  useUserClaims,
} from "../useDeals";

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

describe("useDeals", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("returns available deals array from API payload", async () => {
    const deals = [
      {
        id: "deal-1",
        title: "Flash Lunch",
        deal_type: "flash",
      },
    ];

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ deals }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { result } = renderHook(() => useAvailableDeals(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch).toHaveBeenCalledWith("/api/deals");
    expect(result.current.data).toEqual(deals);
  });

  it("returns user claims array from API payload", async () => {
    const claims = [
      {
        id: "claim-1",
        deal_id: "deal-1",
      },
    ];

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ claims }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { result } = renderHook(() => useUserClaims("user-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch).toHaveBeenCalledWith("/api/deals/claims");
    expect(result.current.data).toEqual(claims);
  });

  it("uses API error message when claim fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "You have already claimed this deal" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { result } = renderHook(() => useClaimDeal(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync("deal-1")).rejects.toThrow(
      "You have already claimed this deal"
    );
  });
});
