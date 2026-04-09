import { NextResponse } from "next/server";
import { normalizeBusinessPhotoReference } from "@/lib/business/display";

function parseDimension(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), 2000);
}

function getApiKey(): string {
  return process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || "";
}

/** Extract place_id from a v2 resource name like "places/ChIJxyz/photos/token" */
function extractPlaceId(reference: string): string | null {
  const match = reference.match(/^places\/([^/]+)/);
  return match?.[1] ?? null;
}

/** Fetch a photo via Places API v2 using a photo resource name. Returns the image Response or null. */
async function fetchPhotoV2(
  photoName: string,
  apiKey: string,
  maxWidth: number,
  maxHeight: number
): Promise<Response | null> {
  const url = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&maxHeightPx=${maxHeight}&skipHttpRedirect=true`;
  const res = await fetch(url, {
    headers: { "X-Goog-Api-Key": apiKey },
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!res.ok) return null;
  const meta = await res.json();
  if (!meta.photoUri) return null;
  return fetch(meta.photoUri, { next: { revalidate: 60 * 60 * 24 } });
}

/**
 * Self-healing: when a stale photo token fails, fetch fresh photo names
 * from Places API v2 Place Details, then use the first one.
 */
async function fetchFreshPhoto(
  placeId: string,
  apiKey: string,
  maxWidth: number,
  maxHeight: number
): Promise<Response | null> {
  const detailsUrl = `https://places.googleapis.com/v1/places/${placeId}`;
  const detailsRes = await fetch(detailsUrl, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "photos",
    },
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!detailsRes.ok) {
    console.error(`[photo] Place Details failed for ${placeId}: ${detailsRes.status}`);
    return null;
  }
  const details = await detailsRes.json();
  const photos: { name?: string }[] = details.photos || [];
  if (photos.length === 0 || !photos[0].name) return null;

  console.log(`[photo] Refreshed photo token for ${placeId}: ${photos[0].name}`);
  return fetchPhotoV2(photos[0].name, apiKey, maxWidth, maxHeight);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawReference = searchParams.get("reference")?.trim();
  const reference = normalizeBusinessPhotoReference(rawReference);

  if (!reference) {
    return NextResponse.json({ error: "Photo reference is required" }, { status: 400 });
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "Google Places API key is not configured" }, { status: 500 });
  }

  const maxWidth = parseDimension(searchParams.get("maxWidth"), 400);
  const maxHeight = parseDimension(searchParams.get("maxHeight"), 300);

  try {
    let imageResponse: Response | null = null;

    if (reference.startsWith("http://") || reference.startsWith("https://")) {
      // Direct CDN URL — fetch directly
      imageResponse = await fetch(reference, { next: { revalidate: 60 * 60 * 24 } });

    } else if (reference.startsWith("places/")) {
      // Try the stored token first
      imageResponse = await fetchPhotoV2(reference, apiKey, maxWidth, maxHeight);

      // If the token is stale/invalid, self-heal by fetching fresh photo names
      if (!imageResponse || !imageResponse.ok) {
        const placeId = extractPlaceId(reference);
        if (placeId) {
          imageResponse = await fetchFreshPhoto(placeId, apiKey, maxWidth, maxHeight);
        }
      }

    } else {
      // Legacy photo_reference token
      const legacyUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&maxheight=${maxHeight}&photo_reference=${reference}&key=${apiKey}`;
      imageResponse = await fetch(legacyUrl, { redirect: "follow", next: { revalidate: 60 * 60 * 24 } });
    }

    if (!imageResponse || !imageResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch photo" }, { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", imageResponse.headers.get("content-type") || "image/jpeg");
    headers.set("Cache-Control", "public, max-age=86400, s-maxage=86400");

    return new NextResponse(imageResponse.body, { status: 200, headers });
  } catch (error) {
    console.error("[photo] Failed to proxy business photo:", error);
    return NextResponse.json({ error: "Failed to fetch photo" }, { status: 500 });
  }
}
