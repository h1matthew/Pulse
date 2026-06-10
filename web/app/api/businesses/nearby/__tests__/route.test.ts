import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: mockFrom,
    })
  ),
}));

describe("GET /api/businesses/nearby", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filters out school/institution entries from google nearby results", async () => {
    const validBusinesses = Array.from({ length: 10 }).map((_, index) => ({
      id: `biz-${index + 1}`,
      name: `Local Business ${index + 1}`,
      latitude: 37.77 + index * 0.0001,
      longitude: -122.42 + index * 0.0001,
      data_source: "google",
      tags: ["restaurant", "food"],
      category: { slug: "food-drink", name: "Food & Drink" },
    }));

    const school = {
      id: "school-1",
      name: "Lincoln High School",
      latitude: 37.775,
      longitude: -122.425,
      data_source: "google",
      tags: ["school", "point_of_interest"],
      category: { slug: "services", name: "Services" },
    };

    const existingBusinesses = [...validBusinesses, school];

    // The route runs two bounding-box queries against the `businesses` table:
    // an initial query, then a re-query after attempting to backfill/sync from
    // external APIs. With no API key configured in the test env, no new places
    // are synced, so both queries resolve to the same set. The production
    // `isRealBusinessRecord` filter must strip the school from each result set.
    const makeQuery = () => ({
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      limit: vi
        .fn()
        .mockResolvedValue({ data: existingBusinesses, error: null }),
    });

    mockFrom.mockImplementation(() => makeQuery());

    const request = new NextRequest(
      "http://localhost/api/businesses/nearby?lat=37.77&lng=-122.42&radius=2000"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toHaveLength(10);
    expect(json.some((b: { name: string }) => b.name.includes("School"))).toBe(false);
  });
});
