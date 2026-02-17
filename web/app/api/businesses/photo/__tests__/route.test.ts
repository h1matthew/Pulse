import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

describe("GET /api/businesses/photo", () => {
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

  it("returns 400 when reference is missing", async () => {
    const request = new NextRequest("http://localhost/api/businesses/photo");
    const response = await GET(request);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("Photo reference is required");
  });

  it("proxies google places v1 media photo requests", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("image-bytes", {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      })
    );

    const request = new NextRequest(
      "http://localhost/api/businesses/photo?reference=places%2Fabc123%2Fphotos%2Fphoto1&maxWidth=400&maxHeight=300"
    );
    const response = await GET(request);

    expect(fetch).toHaveBeenCalledWith(
      "https://places.googleapis.com/v1/places/abc123/photos/photo1/media?key=test-google-key&maxWidthPx=400&maxHeightPx=300",
      expect.any(Object)
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
  });

  it("proxies legacy google place photo references", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("image-bytes", {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      })
    );

    const request = new NextRequest(
      "http://localhost/api/businesses/photo?reference=legacy_photo_ref&maxWidth=800&maxHeight=500"
    );
    const response = await GET(request);

    expect(fetch).toHaveBeenCalledWith(
      "https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&maxheight=500&photo_reference=legacy_photo_ref&key=test-google-key",
      expect.any(Object)
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
  });

  it("normalizes full google places media urls before proxying", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("image-bytes", {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      })
    );

    const request = new NextRequest(
      "http://localhost/api/businesses/photo?reference=https%3A%2F%2Fplaces.googleapis.com%2Fv1%2Fplaces%2Fabc123%2Fphotos%2Fphoto1%2Fmedia%3Fkey%3Dold-key%26maxWidthPx%3D800&maxWidth=400&maxHeight=300"
    );
    const response = await GET(request);

    expect(fetch).toHaveBeenCalledWith(
      "https://places.googleapis.com/v1/places/abc123/photos/photo1/media?key=test-google-key&maxWidthPx=400&maxHeightPx=300",
      expect.any(Object)
    );
    expect(response.status).toBe(200);
  });

  it("redirects to Google media URL when only browser key is available", async () => {
    process.env.GOOGLE_PLACES_API_KEY = "";
    process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY = "public-browser-key";

    const request = new NextRequest(
      "http://localhost/api/businesses/photo?reference=places%2Fabc123%2Fphotos%2Fphoto1&maxWidth=400&maxHeight=300"
    );
    const response = await GET(request);

    expect(fetch).not.toHaveBeenCalled();
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://places.googleapis.com/v1/places/abc123/photos/photo1/media?key=public-browser-key&maxWidthPx=400&maxHeightPx=300"
    );
  });
});
