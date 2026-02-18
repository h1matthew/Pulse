export interface BusinessSummaryInput {
  name: string;
  short_description?: string | null;
  description?: string | null;
  categoryName?: string | null;
  city?: string | null;
  state?: string | null;
  tags?: string[] | null;
}

export interface BusinessReviewLabelInput {
  data_source?: "google" | "osm" | "user_added" | null;
  review_count?: number | null;
}

export interface GoogleReviewHintInput extends BusinessReviewLabelInput {
  local_review_count?: number | null;
}

export interface GoogleMapsUrlInput {
  name: string;
  address?: string | null;
  place_id?: string | null;
}

export interface RealBusinessRecordInput {
  data_source?: "google" | "osm" | "user_added" | null;
  tags?: string[] | null;
  name?: string | null;
}

export interface BusinessPhotoOptions {
  maxWidth?: number;
  maxHeight?: number;
}

export interface BusinessFallbackImageInput {
  name: string;
  categoryName?: string | null;
}

type BusinessPhotoReference =
  | string
  | {
      photo_reference?: string | null;
    }
  | null
  | undefined;

const PLACEHOLDER_DESCRIPTION_PATTERNS = [
  /^local\s+[a-z\s]+store\.?$/i,
  /^local\s+[a-z\s]+business\.?$/i,
  /^a\s+local\s+business\s+proudly\s+serving\s+the\s+community\.?$/i,
  /^no\s+description\s+available\.?$/i,
  /^description\s+coming\s+soon\.?$/i,
  /^business\s+description\s+not\s+available\.?$/i,
];

const BLOCKED_PLACE_TYPES = new Set([
  "school",
  "primary_school",
  "secondary_school",
  "preschool",
  "kindergarten",
  "university",
  "college",
  "school_district",
  "library",
  "courthouse",
  "city_hall",
  "local_government_office",
  "embassy",
  "police",
  "fire_station",
  "post_office",
  "church",
  "mosque",
  "synagogue",
  "hindu_temple",
  "place_of_worship",
  "park",
  "campground",
]);

const BUSINESS_PLACE_TYPE_HINTS = new Set([
  "restaurant",
  "cafe",
  "bakery",
  "bar",
  "meal_delivery",
  "meal_takeaway",
  "store",
  "shopping_mall",
  "hair_care",
  "beauty_salon",
  "spa",
  "gym",
  "doctor",
  "dentist",
  "hospital",
  "bank",
  "atm",
  "car_repair",
  "car_wash",
  "gas_station",
  "lodging",
  "movie_theater",
  "museum",
  "art_gallery",
  "night_club",
  "food",
]);

const INSTITUTION_NAME_PATTERN =
  /\b(school|university|college|academy|district school|elementary|middle school|high school)\b/i;

const ADULT_BUSINESS_PATTERN =
  /\b(adult\s+store|adult\s+shop|sex\s+shop|adult\s+entertainment|adult\s+novelty|adult\s+video|adult\s+bookstore|adult\s+superstore)\b/i;

function normalizeText(value?: string | null): string {
  return (value || "").trim().replace(/\s+/g, " ");
}

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function buildInitials(name: string): string {
  const parts = normalizeText(name).split(" ").filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "LB";
  return parts.map((part) => part[0]?.toUpperCase() || "").join("");
}

function extractPlacesPhotoReference(pathname: string): string | null {
  const match = pathname.match(
    /(?:^|\/)v1\/(places\/[^/]+\/photos\/[^/]+)(?:\/media)?$/i
  );

  if (!match?.[1]) {
    return null;
  }

  return match[1];
}

function normalizePlaceTypes(types?: string[] | null): string[] {
  return (types || [])
    .map((type) => type.trim().toLowerCase())
    .filter(Boolean);
}

function formatTags(tags: string[]): string {
  if (tags.length === 0) return "";
  if (tags.length === 1) return tags[0];
  if (tags.length === 2) return `${tags[0]} and ${tags[1]}`;
  return `${tags[0]}, ${tags[1]}, and ${tags[2]}`;
}

export function isRealBusinessPlaceTypes(types?: string[] | null): boolean {
  const normalizedTypes = normalizePlaceTypes(types).filter(
    (type) => type !== "establishment" && type !== "point_of_interest"
  );

  if (normalizedTypes.length === 0) {
    return false;
  }

  for (const type of normalizedTypes) {
    if (
      BLOCKED_PLACE_TYPES.has(type) ||
      type.includes("school") ||
      type.includes("university") ||
      type.includes("college")
    ) {
      return false;
    }
  }

  return normalizedTypes.some(
    (type) =>
      BUSINESS_PLACE_TYPE_HINTS.has(type) ||
      type.endsWith("_store") ||
      type.endsWith("_shop")
  );
}

export function isRealBusinessRecord(input: RealBusinessRecordInput): boolean {
  if (input.data_source !== "google") {
    return true;
  }

  if (INSTITUTION_NAME_PATTERN.test(normalizeText(input.name))) {
    return false;
  }

  if (ADULT_BUSINESS_PATTERN.test(normalizeText(input.name))) {
    return false;
  }

  const normalizedTypes = normalizePlaceTypes(input.tags);
  if (normalizedTypes.length > 0) {
    for (const type of normalizedTypes) {
      if (
        BLOCKED_PLACE_TYPES.has(type) ||
        type.includes("school") ||
        type.includes("university") ||
        type.includes("college")
      ) {
        return false;
      }
    }

    // Historical synced rows can contain broad category tags (e.g. "service")
    // instead of full Google place types. Treat these as real unless blocked.
    return true;
  }

  return true;
}

export function buildBusinessPhotoUrl(
  photo: BusinessPhotoReference,
  options: BusinessPhotoOptions = {}
): string | null {
  const maxWidth = options.maxWidth ?? 400;
  const maxHeight = options.maxHeight ?? 300;

  const rawReference =
    typeof photo === "string"
      ? normalizeText(photo)
      : normalizeText(photo?.photo_reference || undefined);

  const photoReference = normalizeBusinessPhotoReference(rawReference);

  if (!photoReference) {
    return null;
  }

  const params = new URLSearchParams({
    reference: photoReference,
    maxWidth: String(maxWidth),
    maxHeight: String(maxHeight),
  });

  return `/api/businesses/photo?${params.toString()}`;
}

export function buildBusinessFallbackImageUrl(
  input: BusinessFallbackImageInput
): string {
  const palettes = [
    { start: "#0f172a", end: "#334155", accent: "#22d3ee" },
    { start: "#111827", end: "#1f2937", accent: "#34d399" },
    { start: "#1e1b4b", end: "#312e81", accent: "#f59e0b" },
    { start: "#3f1d2e", end: "#5b2e48", accent: "#fb7185" },
    { start: "#1f2937", end: "#334155", accent: "#a78bfa" },
  ];

  const key = `${normalizeText(input.name)}-${normalizeText(input.categoryName)}`;
  const palette = palettes[hashString(key) % palettes.length];
  const initials = escapeSvgText(buildInitials(input.name));
  const categoryName = escapeSvgText(
    normalizeText(input.categoryName) || "Local Business"
  );
  const businessName = escapeSvgText(normalizeText(input.name) || "Neighborhood Spot");

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.start}" />
      <stop offset="100%" stop-color="${palette.end}" />
    </linearGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
    </pattern>
  </defs>
  <rect width="1200" height="720" fill="url(#g)" />
  <rect width="1200" height="720" fill="url(#grid)" />
  <circle cx="1030" cy="100" r="180" fill="${palette.accent}" fill-opacity="0.22" />
  <circle cx="160" cy="620" r="220" fill="${palette.accent}" fill-opacity="0.18" />
  <rect x="120" y="100" width="220" height="220" rx="32" fill="rgba(255,255,255,0.12)" />
  <text x="230" y="245" text-anchor="middle" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif" font-size="96" font-weight="700" fill="white">${initials}</text>
  <text x="120" y="420" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif" font-size="44" font-weight="700" fill="white">${businessName}</text>
  <text x="120" y="472" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif" font-size="28" fill="rgba(255,255,255,0.85)">${categoryName}</text>
</svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function normalizeBusinessPhotoReference(
  reference?: string | null
): string | null {
  const normalized = normalizeText(reference);
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("places/")) {
    return normalized.replace(/\/media$/i, "");
  }

  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://")
  ) {
    try {
      const parsed = new URL(normalized);
      const placesReference = extractPlacesPhotoReference(parsed.pathname);
      if (placesReference) {
        return placesReference;
      }

      const legacyPhotoReference = normalizeText(
        parsed.searchParams.get("photo_reference")
      );
      if (legacyPhotoReference) {
        return legacyPhotoReference;
      }
    } catch {
      // Fall through to generic extraction.
    }
  }

  const fromPath = extractPlacesPhotoReference(normalized);
  if (fromPath) {
    return fromPath;
  }

  return normalized;
}

export function isPlaceholderBusinessDescription(
  description?: string | null
): boolean {
  const normalized = normalizeText(description);
  if (!normalized) return true;

  return PLACEHOLDER_DESCRIPTION_PATTERNS.some((pattern) =>
    pattern.test(normalized)
  );
}

export function buildBusinessSummary(input: BusinessSummaryInput): string {
  const shortDescription = normalizeText(input.short_description);
  if (!isPlaceholderBusinessDescription(shortDescription)) {
    return shortDescription;
  }

  const fullDescription = normalizeText(input.description);
  if (!isPlaceholderBusinessDescription(fullDescription)) {
    return fullDescription;
  }

  const category =
    normalizeText(input.categoryName).toLowerCase() || "local business";
  const location = [normalizeText(input.city), normalizeText(input.state)]
    .filter(Boolean)
    .join(", ");
  const cleanTags = (input.tags || [])
    .map((tag) => normalizeText(tag))
    .filter(Boolean)
    .slice(0, 3);

  let summary = `${input.name} is a ${category} spot`;
  if (location) {
    summary += ` in ${location}`;
  }
  summary += ".";

  if (cleanTags.length > 0) {
    summary += ` Popular for ${formatTags(cleanTags)}.`;
  }

  return summary;
}

export function getBusinessReviewLabel(input: BusinessReviewLabelInput): string {
  const reviewCount = input.review_count || 0;
  if (reviewCount <= 0) {
    return "No reviews yet";
  }

  if (input.data_source === "google") {
    return `${reviewCount} Google ratings`;
  }

  return `${reviewCount} reviews`;
}

export function shouldShowGoogleReviewHint(input: GoogleReviewHintInput): boolean {
  const reviewCount = input.review_count || 0;
  const localReviewCount = input.local_review_count || 0;

  return input.data_source === "google" && reviewCount > 0 && localReviewCount === 0;
}

export function getGoogleMapsReviewUrl(input: GoogleMapsUrlInput): string {
  const queryParts = [normalizeText(input.name), normalizeText(input.address)].filter(
    Boolean
  );
  const query = encodeURIComponent(queryParts.join(" "));
  const base = `https://www.google.com/maps/search/?api=1&query=${query}`;

  if (input.place_id) {
    return `${base}&query_place_id=${encodeURIComponent(input.place_id)}`;
  }

  return base;
}
