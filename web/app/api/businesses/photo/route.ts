import { NextResponse } from "next/server";
import { normalizeBusinessPhotoReference } from "@/lib/business/display";

function parseDimension(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(Math.floor(parsed), 2000);
}

function buildGooglePhotoUrl(
  reference: string,
  maxWidth: number,
  maxHeight: number,
  apiKey: string
): string {
  if (reference.startsWith("places/")) {
    return `https://places.googleapis.com/v1/${reference}/media?key=${apiKey}&maxWidthPx=${maxWidth}&maxHeightPx=${maxHeight}`;
  }

  const params = new URLSearchParams({
    maxwidth: String(maxWidth),
    maxheight: String(maxHeight),
    photo_reference: reference,
    key: apiKey,
  });
  return `https://maps.googleapis.com/maps/api/place/photo?${params.toString()}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawReference = searchParams.get("reference")?.trim();
  const reference = normalizeBusinessPhotoReference(rawReference);

  if (!reference) {
    return NextResponse.json(
      { error: "Photo reference is required" },
      { status: 400 }
    );
  }

  const serverApiKey = process.env.GOOGLE_PLACES_API_KEY || "";
  const publicApiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || "";
  const activeApiKey = serverApiKey || publicApiKey;

  if (!activeApiKey) {
    return NextResponse.json(
      { error: "Google Places API key is not configured" },
      { status: 500 }
    );
  }

  const maxWidth = parseDimension(searchParams.get("maxWidth"), 400);
  const maxHeight = parseDimension(searchParams.get("maxHeight"), 300);
  const upstreamUrl = buildGooglePhotoUrl(reference, maxWidth, maxHeight, activeApiKey);

  // If we only have a browser/referer restricted key, redirect the browser directly.
  // Server-side fetches with browser keys commonly fail due key restrictions.
  if (!serverApiKey) {
    const redirectResponse = NextResponse.redirect(upstreamUrl, { status: 302 });
    redirectResponse.headers.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
    return redirectResponse;
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: "Failed to fetch photo" }, { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", upstream.headers.get("content-type") || "image/jpeg");
    headers.set("Cache-Control", "public, max-age=86400, s-maxage=86400");

    return new NextResponse(upstream.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Failed to proxy business photo:", error);
    return NextResponse.json(
      { error: "Failed to fetch photo" },
      { status: 500 }
    );
  }
}
