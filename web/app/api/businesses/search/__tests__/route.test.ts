import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

const mockFrom = vi.fn();
const mockSearchBusinesses = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: mockFrom,
    })
  ),
}));

vi.mock("@/lib/google-places", () => ({
  searchBusinesses: (...args: unknown[]) => mockSearchBusinesses(...args),
}));

describe("GET /api/businesses/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filters institution-like results from local and google data", async () => {
    const localBusinesses = [
      {
        id: "local-school",
        name: "Lincoln High School",
        place_id: "school-place",
        data_source: "google",
        tags: ["school", "point_of_interest"],
      },
      {
        id: "local-biz",
        name: "River Walk Coffee",
        place_id: "coffee-place",
        data_source: "user_added",
        tags: [],
      },
    ];

    const query = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: localBusinesses, error: null }),
    };
    mockFrom.mockReturnValueOnce(query);

    mockSearchBusinesses.mockResolvedValueOnce({
      places: [
        {
          place_id: "uni-1",
          name: "State University",
          formatted_address: "1 Campus Dr",
          geometry: { location: { lat: 37.77, lng: -122.41 } },
          types: ["university"],
          photos: [],
        },
        {
          place_id: "bakery-1",
          name: "Main Street Bakery",
          formatted_address: "42 Main St",
          geometry: { location: { lat: 37.78, lng: -122.42 } },
          types: ["bakery", "food"],
          photos: [],
        },
      ],
      fromCache: false,
    });

    const request = new NextRequest(
      "http://localhost/api/businesses/search?q=coffee&lat=37.77&lng=-122.42"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.localCount).toBe(1);
    expect(json.googleCount).toBe(1);
    expect(json.businesses).toHaveLength(2);
    expect(
      json.businesses.some((business: { name: string }) =>
        business.name.includes("School") || business.name.includes("University")
      )
    ).toBe(false);
  });
});
