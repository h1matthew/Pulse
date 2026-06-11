import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: null } })),
      },
      from: mockFrom,
    })
  ),
}));

function createParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

function createLookupQuery(result: { data: unknown; error: { code: string } | null }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
}

describe("GET /api/businesses/[id]", () => {
  const originalGooglePlacesKey = process.env.GOOGLE_PLACES_API_KEY;
  const originalPublicGooglePlacesKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    process.env.GOOGLE_PLACES_API_KEY = "test-google-key";
    process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.GOOGLE_PLACES_API_KEY = originalGooglePlacesKey;
    process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY = originalPublicGooglePlacesKey;
  });

  it("returns active deals, all local reviews, and google written reviews", async () => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    const mockBusiness = {
      id: "biz-1",
      name: "Northside Coffee",
      review_count: 42,
      data_source: "google",
      place_id: "abc123",
    };

    const mockReviews = [
      {
        id: "local-review-1",
        rating: 5,
        content: "Excellent coffee.",
        created_at: "2026-01-01T00:00:00.000Z",
        user: { id: "u-1", full_name: "Ada", avatar_url: null },
      },
      {
        id: "local-review-2",
        rating: 4,
        content: "Great staff.",
        created_at: "2026-01-02T00:00:00.000Z",
        user: { id: "u-2", full_name: "Grace", avatar_url: null },
      },
    ];

    const mockDeals = [
      {
        id: "deal-valid",
        is_active: true,
        start_date: new Date(now - oneDay).toISOString(),
        end_date: new Date(now + oneDay).toISOString(),
      },
      {
        id: "deal-expired",
        is_active: true,
        start_date: new Date(now - oneDay).toISOString(),
        end_date: new Date(now - oneDay).toISOString(),
      },
    ];

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          reviews: [
            {
              name: "google-review-1",
              rating: 5,
              publishTime: "2026-01-03T00:00:00.000Z",
              relativePublishTimeDescription: "3 weeks ago",
              text: { text: "Love this place." },
              authorAttribution: { displayName: "Google User" },
              googleMapsUri: "https://maps.google.com/example-review",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const businessQuery = createLookupQuery({ data: mockBusiness, error: null });
    const reviewsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockReviews, error: null }),
    };
    const dealsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockDeals, error: null }),
    };

    mockFrom
      .mockReturnValueOnce(businessQuery)
      .mockReturnValueOnce(reviewsQuery)
      .mockReturnValueOnce(dealsQuery);

    const request = new NextRequest("http://localhost/api/businesses/biz-1");
    const response = await GET(request, createParams("biz-1"));

    expect(response.status).toBe(200);
    const json = await response.json();

    expect(json.local_review_count).toBe(2);
    expect(json.reviews).toHaveLength(2);
    expect(json.external_reviews).toHaveLength(1);
    expect(json.deals).toHaveLength(1);
    expect(json.deals[0].id).toBe("deal-valid");

    expect(fetch).toHaveBeenCalledWith(
      "https://places.googleapis.com/v1/places/abc123",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Goog-Api-Key": "test-google-key",
          "X-Goog-FieldMask": "reviews",
        }),
      })
    );
  });

  it("returns no deals when none exist and demo mode is off", async () => {
    const mockBusiness = {
      id: "biz-demo-1",
      name: "H Mart Diamond Bar",
      review_count: 0,
      data_source: "user_added",
      place_id: null,
    };

    const businessQuery = createLookupQuery({ data: mockBusiness, error: null });
    const reviewsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const dealsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    mockFrom
      .mockReturnValueOnce(businessQuery)
      .mockReturnValueOnce(reviewsQuery)
      .mockReturnValueOnce(dealsQuery);

    const request = new NextRequest("http://localhost/api/businesses/biz-demo-1");
    const response = await GET(request, createParams("biz-demo-1"));

    expect(response.status).toBe(200);
    const json = await response.json();

    expect(json.deals).toEqual([]);
  });

  it("returns demo deals for configured businesses when demo mode is explicitly enabled", async () => {
    process.env.PULSE_ENABLE_DEMO_STATS = "true";
    try {
      const mockBusiness = {
        id: "biz-demo-1",
        name: "H Mart Diamond Bar",
        review_count: 0,
        data_source: "user_added",
        place_id: null,
      };

      const businessQuery = createLookupQuery({ data: mockBusiness, error: null });
      const reviewsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      const dealsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      mockFrom
        .mockReturnValueOnce(businessQuery)
        .mockReturnValueOnce(reviewsQuery)
        .mockReturnValueOnce(dealsQuery);

      const request = new NextRequest("http://localhost/api/businesses/biz-demo-1");
      const response = await GET(request, createParams("biz-demo-1"));

      expect(response.status).toBe(200);
      const json = await response.json();

      expect(json.deals).toHaveLength(1);
      expect(json.deals[0].id).toContain("demo-biz-demo-1");
      expect(json.deals[0].title).toBe("Weeknight Bento Bundle");
      expect(json.deals[0].is_active).toBe(true);
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      delete process.env.PULSE_ENABLE_DEMO_STATS;
    }
  });

  it("returns 404 when business is missing by id and place_id", async () => {
    const missingByIdQuery = createLookupQuery({
      data: null,
      error: { code: "PGRST116" },
    });
    const missingByPlaceIdQuery = createLookupQuery({
      data: null,
      error: { code: "PGRST116" },
    });

    mockFrom
      .mockReturnValueOnce(missingByIdQuery)
      .mockReturnValueOnce(missingByPlaceIdQuery);

    const request = new NextRequest("http://localhost/api/businesses/missing");
    const response = await GET(request, createParams("missing"));

    expect(response.status).toBe(404);
  });

  it("resolves route params by place_id when internal id lookup misses", async () => {
    const byIdQuery = createLookupQuery({
      data: null,
      error: { code: "PGRST116" },
    });
    const byPlaceIdQuery = createLookupQuery({
      data: {
        id: "biz-uuid-123",
        name: "Synced Business",
        data_source: "user_added",
        review_count: 0,
        place_id: "ChIJ123",
      },
      error: null,
    });
    const reviewsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const dealsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    mockFrom
      .mockReturnValueOnce(byIdQuery)
      .mockReturnValueOnce(byPlaceIdQuery)
      .mockReturnValueOnce(reviewsQuery)
      .mockReturnValueOnce(dealsQuery);

    const request = new NextRequest("http://localhost/api/businesses/ChIJ123");
    const response = await GET(request, createParams("ChIJ123"));

    expect(response.status).toBe(200);
    expect(byIdQuery.eq).toHaveBeenCalledWith("id", "ChIJ123");
    expect(byPlaceIdQuery.eq).toHaveBeenCalledWith("place_id", "ChIJ123");
    expect(reviewsQuery.eq).toHaveBeenCalledWith("business_id", "biz-uuid-123");
    expect(fetch).not.toHaveBeenCalled();
  });
});
