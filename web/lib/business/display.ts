import {
  isChainBusiness,
  LARGE_FORMAT_PLACE_TYPES,
  SMALL_BUSINESS_REVIEW_CEILING,
} from "./classify";

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
  is_chain?: boolean | null;
  review_count?: number | null;
}

export interface BusinessPhotoOptions {
  maxWidth?: number;
  maxHeight?: number;
}

export interface BusinessFallbackImageInput {
  name: string;
  categoryName?: string | null;
  /** Render this exact text instead of derived initials (e.g. "Demo"). */
  label?: string;
  /** Drop the decorative grid + circles, keeping just the gradient and text. */
  plain?: boolean;
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
  "hair_salon",
  "nail_salon",
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
  "pharmacy",
  "pet_store",
  "veterinary_care",
  "florist",
  "jewelry_store",
  "laundry",
  "dry_cleaner",
  "insurance_agency",
  "real_estate_agency",
  "travel_agency",
  "accounting",
  "lawyer",
  "locksmith",
  "moving_company",
  "painter",
  "plumber",
  "electrician",
  "roofing_contractor",
  "tattoo_parlor",
  "tailor",
  "shoe_repair",
  "print_shop",
  "photography_studio",
  "auto_parts_store",
  "tire_shop",
  "towing_company",
  "cell_phone_store",
  "furniture_store",
  "home_goods_store",
  "hardware_store",
  "garden_center",
  "liquor_store",
  "wine_bar",
  "brewery",
  "coffee_shop",
  "ice_cream_shop",
  "juice_bar",
  "fast_food_restaurant",
  "pizza_restaurant",
  "sandwich_shop",
  "sushi_restaurant",
  "mexican_restaurant",
  "chinese_restaurant",
  "indian_restaurant",
  "italian_restaurant",
  "thai_restaurant",
  "japanese_restaurant",
  "korean_restaurant",
  "vietnamese_restaurant",
  "mediterranean_restaurant",
  "seafood_restaurant",
  "steak_house",
  "barbecue_restaurant",
  "breakfast_restaurant",
  "brunch_restaurant",
  "vegetarian_restaurant",
  "vegan_restaurant",
  "food_court",
  "catering_service",
  "deli",
  "donut_shop",
  "bagel_shop",
  "frozen_yogurt_shop",
  "bowling_alley",
  "amusement_park",
  "aquarium",
  "zoo",
  "tourist_attraction",
  "performing_arts_theater",
  "concert_hall",
  "event_venue",
  "convention_center",
  "yoga_studio",
  "pilates_studio",
  "martial_arts_school",
  "dance_studio",
  "fitness_center",
  "swimming_pool",
  "physiotherapist",
  "chiropractor",
  "optometrist",
  "optician",
  "medical_lab",
  "urgent_care",
  "child_care_agency",
  "pet_grooming",
  "dog_park",
  "kennel",
  "market",
  "farmers_market",
  "supermarket",
  "food_store",
  "grocery_store",
  "convenience_store",
  "thrift_store",
  "pawn_shop",
  "bicycle_store",
  "sporting_goods_store",
  "toy_store",
  "music_store",
  "book_store",
  "gift_shop",
  "stationery_store",
  "art_supply_store",
  "craft_store",
  "smoke_shop",
  "hookah_bar",
  "karaoke",
  "escape_room",
  "golf_course",
  "skating_rink",
  "trampoline_park",
  "laser_tag",
  "arcade",
  "climbing_gym",
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

/** Format a snake_case tag like "fast_food_restaurant" to "Fast Food Restaurant" */
export function formatTagLabel(tag: string): string {
  return tag.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
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
      type.endsWith("_shop") ||
      type.endsWith("_restaurant") ||
      type.endsWith("_salon") ||
      type.endsWith("_studio") ||
      type.endsWith("_agency") ||
      type.endsWith("_center") ||
      type.endsWith("_service") ||
      type.endsWith("_repair") ||
      type.endsWith("_dealer") ||
      type.endsWith("_contractor")
  );
}

export function isRealBusinessRecord(input: RealBusinessRecordInput): boolean {
  // Pulse only surfaces independent small businesses — exclude chains and
  // franchises regardless of where the record came from.
  if (input.is_chain === true) {
    return false;
  }
  // Re-derive chain status from the name on every read. We deliberately do NOT
  // let a stored is_chain=false short-circuit this: the sync/seed pipeline writes
  // is_chain=false on every row it inserts, so a stale false (written before a
  // brand was added to the chain list) must never be allowed to resurface a
  // chain. The stored flag can force-exclude (is_chain=true) but cannot force-include.
  if (input.name && isChainBusiness({ name: input.name, tags: input.tags ?? undefined })) {
    return false;
  }

  // Reject big-box / large-format operations (car dealers, supermarkets, malls,
  // warehouse clubs, gas stations…) by place type, regardless of data source.
  // The sync pipeline applies this via isLikelySmallBusiness, but historical or
  // seeded rows can predate that filter — so enforce it again at display time.
  if (normalizePlaceTypes(input.tags).some((type) => LARGE_FORMAT_PLACE_TYPES.has(type))) {
    return false;
  }

  // High review volume signals a large, high-traffic, or touristy operation, not
  // a neighborhood independent. The sync pipeline applies this via
  // isLikelySmallBusiness, but seeded/historical rows can predate that filter —
  // so enforce the same ceiling again at display time.
  if ((input.review_count ?? 0) > SMALL_BUSINESS_REVIEW_CEILING) {
    return false;
  }

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
  const rawReference =
    typeof photo === "string"
      ? normalizeText(photo)
      : normalizeText(photo?.photo_reference || undefined);

  if (!rawReference) return null;

  // Direct CDN URLs (e.g. from OpenWeb Ninja) — use as-is, no proxy needed.
  // Only Google Places URLs need to go through our proxy for API key injection.
  if (rawReference.startsWith("http://") || rawReference.startsWith("https://")) {
    const isGooglePlacesUrl =
      rawReference.includes("places.googleapis.com") ||
      rawReference.includes("maps.googleapis.com");
    if (!isGooglePlacesUrl) {
      return rawReference;
    }
  }

  // Google Places reference — route through our proxy
  const photoReference = normalizeBusinessPhotoReference(rawReference);
  if (!photoReference) return null;

  const maxWidth = options.maxWidth ?? 400;
  const maxHeight = options.maxHeight ?? 300;
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

  // Decorative only: the card/hero overlays the business name and category, so
  // baking them into the cover too produced doubled, overlapping text. Keep just
  // the centered initials on a branded gradient.
  const key = `${normalizeText(input.name)}-${normalizeText(input.categoryName)}`;
  const palette = palettes[hashString(key) % palettes.length];
  // A `label` (e.g. "Demo") is shown verbatim; otherwise fall back to initials.
  // A full word needs a smaller size than 1-2 initials to stay on the canvas.
  const text = escapeSvgText(input.label ?? buildInitials(input.name));
  const fontSize = input.label && input.label.length > 2 ? 180 : 220;

  // `plain` covers omit the decorative grid + accent circles (used by the
  // onboarding tour's demo business); everything else keeps them.
  const decorations = input.plain
    ? ""
    : `<rect width="1200" height="720" fill="url(#grid)" />
  <circle cx="1040" cy="120" r="210" fill="${palette.accent}" fill-opacity="0.20" />
  <circle cx="170" cy="600" r="230" fill="${palette.accent}" fill-opacity="0.16" />`;

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
  ${decorations}
  <text x="600" y="360" text-anchor="middle" dominant-baseline="central" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif" font-size="${fontSize}" font-weight="700" fill="rgba(255,255,255,0.92)">${text}</text>
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
