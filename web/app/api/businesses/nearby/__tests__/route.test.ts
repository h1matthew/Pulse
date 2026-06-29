import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

// Build a chainable query-builder mock backed by `dataset`. The route resolves
// rows two ways: the initial bounding-box query uses `.limit(n)`, and the final
// fetch pages through results with `.range(from, to)`. Both are honored here so
// the mock behaves like a real (small) table. Category lookups call `.single()`,
// which resolves to null (no category filter) in these tests.
function makeQuery(dataset: unknown[]) {
  return {
    select: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    limit: vi.fn((n: number) =>
      Promise.resolve({ data: dataset.slice(0, n), error: null })
    ),
    range: vi.fn((from: number, to: number) =>
      Promise.resolve({ data: dataset.slice(from, to + 1), error: null })
    ),
  };
}

describe("GET /api/businesses/nearby", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Keep external backfill (Overpass/Google) deterministic and offline: a
    // non-ok response makes both fetchers bail to [], so the route returns only
    // what the mocked DB provides.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "",
        json: async () => ({}),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("filters out school/institution entries from results", async () => {
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

    const dataset = [...validBusinesses, school];
    mockFrom.mockImplementation(() => makeQuery(dataset));

    const request = new NextRequest(
      "http://localhost/api/businesses/nearby?lat=37.77&lng=-122.42&radius=2000"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toHaveLength(10);
    expect(json.some((b: { name: string }) => b.name.includes("School"))).toBe(false);
  });

  it("excludes businesses outside the requested radius (box corners reach past the circle)", async () => {
    const near = Array.from({ length: 5 }).map((_, i) => ({
      id: `near-${i}`,
      name: `Near Spot ${i}`,
      latitude: 37.77 + i * 0.0005, // < 0.3 km
      longitude: -122.42,
      data_source: "google",
      tags: ["restaurant"],
      category: { slug: "food-drink", name: "Food & Drink" },
    }));
    // ~8.9 km north — inside the lat/lng box used by the DB query, but well
    // outside a 2 km radius, so the great-circle filter must drop these.
    const far = Array.from({ length: 3 }).map((_, i) => ({
      id: `far-${i}`,
      name: `Far Spot ${i}`,
      latitude: 37.85 + i * 0.001,
      longitude: -122.42,
      data_source: "google",
      tags: ["restaurant"],
      category: { slug: "food-drink", name: "Food & Drink" },
    }));

    const dataset = [...near, ...far];
    mockFrom.mockImplementation(() => makeQuery(dataset));

    const request = new NextRequest(
      "http://localhost/api/businesses/nearby?lat=37.77&lng=-122.42&radius=2000"
    );
    const response = await GET(request);
    const json = await response.json();

    expect(json).toHaveLength(5);
    expect(json.every((b: { id: string }) => b.id.startsWith("near-"))).toBe(true);
  });

  it("returns the nearest results first and caps the count at 250", async () => {
    // 600 businesses at strictly increasing distance from the center.
    const dataset = Array.from({ length: 600 }).map((_, i) => ({
      id: `biz-${i}`,
      name: `Spot ${i}`,
      latitude: 37.77 + i * 0.00005, // monotonic distance, all within radius
      longitude: -122.42,
      data_source: "google",
      tags: ["restaurant"],
      category: { slug: "food-drink", name: "Food & Drink" },
    }));
    mockFrom.mockImplementation(() => makeQuery(dataset));

    const request = new NextRequest(
      "http://localhost/api/businesses/nearby?lat=37.77&lng=-122.42&radius=50000"
    );
    const response = await GET(request);
    const json = await response.json();

    // Capped at MAX_NEARBY_RESULTS.
    expect(json).toHaveLength(250);
    // Nearest first.
    expect(json[0].id).toBe("biz-0");
    // The farther results were dropped by distance, not an arbitrary slice.
    const ids = new Set(json.map((b: { id: string }) => b.id));
    expect(ids.has("biz-249")).toBe(true);
    expect(ids.has("biz-250")).toBe(false);
    expect(ids.has("biz-599")).toBe(false);
  });

  it("requests meat-market place types when refreshing food and drink results", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "test-google-key");

    mockFrom.mockImplementation(() => makeQuery([]));

    let googleRequestBody: { includedTypes?: string[] } | null = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
        const urlString = String(url);

        if (urlString.includes("places.googleapis.com")) {
          googleRequestBody = JSON.parse(String(init?.body));
          return {
            ok: true,
            json: async () => ({ places: [] }),
            text: async () => "",
          };
        }

        return {
          ok: true,
          json: async () => ({ elements: [] }),
          text: async () => "",
        };
      })
    );

    const request = new NextRequest(
      "http://localhost/api/businesses/nearby?lat=29.4252&lng=-98.4946&radius=16093&category=food-drink&refresh=true"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(googleRequestBody?.includedTypes).toEqual(
      expect.arrayContaining(["butcher_shop", "food_store", "farmers_market", "market"])
    );
  });
});
