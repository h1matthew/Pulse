import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "user-1" } } })),
      },
      from: mockFrom,
    })
  ),
}));

describe("GET /api/deals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns deals with per-user claim status", async () => {
    const deals = [
      { id: "deal-1", title: "Lunch deal" },
      { id: "deal-2", title: "Coffee deal" },
    ];

    const dealsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: deals, error: null, count: 2 }),
    };

    const claimsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [{ deal_id: "deal-2" }] }),
    };

    mockFrom.mockReturnValueOnce(dealsQuery).mockReturnValueOnce(claimsQuery);

    const request = new NextRequest("http://localhost/api/deals");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.deals).toEqual([
      { id: "deal-1", title: "Lunch deal", isClaimed: false },
      { id: "deal-2", title: "Coffee deal", isClaimed: true },
    ]);
    expect(json.total).toBe(2);
    expect(json.hasMore).toBe(false);
  });

  it("returns unclaimed deals when user is signed out", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: null } })),
      },
      from: mockFrom,
    } as never);

    const dealsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [{ id: "deal-1", title: "Lunch deal" }],
        error: null,
        count: 1,
      }),
    };

    mockFrom.mockReturnValueOnce(dealsQuery);

    const request = new NextRequest("http://localhost/api/deals");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.deals).toEqual([{ id: "deal-1", title: "Lunch deal", isClaimed: false }]);
  });

  it("returns 500 when deal query fails", async () => {
    const dealsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: "db error" }, count: null }),
    };

    mockFrom.mockReturnValueOnce(dealsQuery);

    const request = new NextRequest("http://localhost/api/deals");
    const response = await GET(request);

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toBe("Failed to fetch deals");
  });

  it("returns fallback demo deals when no real deals exist", async () => {
    const dealsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
    };

    const businessesQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      data: [
        {
          id: "biz-hmart",
          name: "H Mart Diamond Bar",
          category_id: "cat-food",
          average_rating: 4.3,
          review_count: 1956,
          category: { name: "Food & Drink", icon: "🍽️" },
        },
      ],
      error: null,
    };

    const claimsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [] }),
    };

    mockFrom
      .mockReturnValueOnce(dealsQuery)
      .mockReturnValueOnce(businessesQuery)
      .mockReturnValueOnce(claimsQuery);

    const request = new NextRequest("http://localhost/api/deals");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.deals.length).toBeGreaterThan(0);
    expect(json.deals[0].id).toContain("demo-");
    expect(json.deals[0].business.id).toBe("biz-hmart");
    expect(json.deals[0].isClaimed).toBe(false);
  });
});
