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

describe("GET /api/businesses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filters non-business google records from the list endpoint", async () => {
    const businesses = [
      {
        id: "school-1",
        name: "Lincoln High School",
        data_source: "google",
        tags: ["school", "point_of_interest"],
      },
      {
        id: "biz-1",
        name: "River Walk Coffee",
        data_source: "user_added",
        tags: [],
      },
      {
        id: "biz-2",
        name: "Main Street Bakery",
        data_source: "google",
        tags: ["bakery", "food"],
      },
    ];

    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: businesses,
        error: null,
        count: 3,
      }),
    };

    mockFrom.mockReturnValueOnce(query);

    const request = new NextRequest("http://localhost/api/businesses?page=1&limit=20");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.businesses).toHaveLength(2);
    expect(
      json.businesses.some((business: { name: string }) =>
        business.name.includes("School")
      )
    ).toBe(false);
  });
});
