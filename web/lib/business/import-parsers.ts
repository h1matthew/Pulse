/**
 * Pure parsing helpers for business data imports (no IO).
 *
 * Used by:
 * - supabase/scripts/import-scraper-csv.ts (gosom/google-maps-scraper CSV output)
 * - supabase/scripts/import-sba-csv.ts (search.certifications.sba.gov exports)
 */

export interface ScrapedBusinessRow {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  reviewCount?: number;
  phone?: string;
  website?: string;
  categoryHint?: string;
  placeId?: string;
}

export interface SbaBusinessRow {
  name: string;
  city?: string;
  state?: string;
  certifications?: string[];
}

/**
 * Split raw CSV text into logical records, respecting newlines inside
 * quoted fields. A record left with an unterminated quote at EOF is
 * returned as-is and will be rejected by parseCsvRecord.
 */
function splitCsvRecords(csv: string): string[] {
  const records: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && csv[i + 1] === "\n") i++;
      records.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current.length > 0) records.push(current);
  return records.filter((record) => record.trim().length > 0);
}

/**
 * Parse a single CSV record into fields. Handles quoted fields containing
 * commas and escaped quotes (""). Returns null for malformed records
 * (unterminated quote, or junk after a closing quote) instead of throwing.
 */
function parseCsvRecord(record: string): string[] | null {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < record.length) {
    const char = record[i];
    if (inQuotes) {
      if (char === '"') {
        if (record[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        // After a closing quote only a comma or end-of-record is valid.
        if (i < record.length && record[i] !== ",") return null;
        continue;
      }
      current += char;
      i++;
    } else if (char === '"') {
      // Opening quote is only valid at the start of a field.
      if (current.length > 0) return null;
      inQuotes = true;
      i++;
    } else if (char === ",") {
      fields.push(current);
      current = "";
      i++;
    } else {
      current += char;
      i++;
    }
  }

  if (inQuotes) return null;
  fields.push(current);
  return fields;
}

function normalizeHeader(header: string): string {
  return header
    .replace(/^﻿/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildHeaderIndex(headers: string[]): Map<string, number> {
  const index = new Map<string, number>();
  headers.forEach((header, i) => {
    const key = normalizeHeader(header);
    if (key && !index.has(key)) index.set(key, i);
  });
  return index;
}

function pickField(
  fields: string[],
  headerIndex: Map<string, number>,
  candidates: string[]
): string | undefined {
  for (const candidate of candidates) {
    const idx = headerIndex.get(candidate);
    if (idx !== undefined && idx < fields.length) {
      const value = fields[idx].trim();
      if (value.length > 0) return value;
    }
  }
  return undefined;
}

function parseNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const cleaned = value.replace(/,/g, "").trim();
  if (cleaned.length === 0) return undefined;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Extract a Google place id from a raw value that may be either a place id
 * itself or a Google Maps link containing one.
 */
export function extractPlaceId(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;

  // Already a bare place id (typical "ChIJ..." format).
  if (/^ChIJ[A-Za-z0-9_-]+$/.test(trimmed)) return trimmed;

  // Maps links: ?place_id=..., ?q=place_id:..., or query_place_id=...
  const paramMatch = trimmed.match(
    /(?:query_place_id=|place_id=|place_id:)([A-Za-z0-9_-]+)/
  );
  if (paramMatch) return paramMatch[1];

  // Maps data links embed a hex feature id pair: ...!1s0x...:0x...
  const hexMatch = trimmed.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i);
  if (hexMatch) return hexMatch[1];

  // Not a link at all — treat a plausible opaque id as a place id.
  if (!/[/?:=\s]/.test(trimmed) && trimmed.length >= 10) return trimmed;

  return undefined;
}

interface AddressParts {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

/**
 * Split a formatted US address like
 * "1234 Grand Ave, Diamond Bar, CA 91765" (optionally with a trailing
 * country) into street/city/state/zip. Falls back to returning the whole
 * string as `address` when the pattern does not match.
 */
export function splitUsAddress(raw: string | undefined): AddressParts {
  if (!raw) return {};
  let value = raw.trim().replace(/^address:\s*/i, "");
  if (value.length === 0) return {};

  // Strip a trailing country segment.
  value = value.replace(/,\s*(?:USA|United States(?: of America)?)\s*$/i, "");

  const match = value.match(
    /^(.*?),\s*([^,]+?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/
  );
  if (match) {
    return {
      address: match[1].trim(),
      city: match[2].trim(),
      state: match[3],
      zip: match[4],
    };
  }

  // "City, ST 91765" without a street portion.
  const short = value.match(/^([^,]+?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  if (short) {
    return { city: short[1].trim(), state: short[2], zip: short[3] };
  }

  return { address: value };
}

/**
 * Parse CSV output from gosom/google-maps-scraper
 * (https://github.com/gosom/google-maps-scraper).
 *
 * Column mapping (header-name based, all columns optional):
 *   title -> name, address -> address/city/state/zip, latitude/longitude,
 *   review_rating -> rating, review_count -> reviewCount, phone, website,
 *   category -> categoryHint, place_id/link -> placeId.
 *
 * Rows without a name and malformed records are skipped; never throws.
 */
export function parseScraperCsv(csv: string): ScrapedBusinessRow[] {
  const records = splitCsvRecords(csv);
  if (records.length < 2) return [];

  const headerFields = parseCsvRecord(records[0]);
  if (!headerFields) return [];
  const headerIndex = buildHeaderIndex(headerFields);

  const rows: ScrapedBusinessRow[] = [];

  for (let i = 1; i < records.length; i++) {
    const fields = parseCsvRecord(records[i]);
    if (!fields) continue;

    const name = pickField(fields, headerIndex, ["title", "name"]);
    if (!name) continue;

    const addressParts = splitUsAddress(
      pickField(fields, headerIndex, ["address", "complete_address"])
    );

    const placeId = extractPlaceId(
      pickField(fields, headerIndex, ["place_id"]) ??
        pickField(fields, headerIndex, ["link", "url"])
    );

    const row: ScrapedBusinessRow = { name };
    if (addressParts.address) row.address = addressParts.address;
    if (addressParts.city) row.city = addressParts.city;
    if (addressParts.state) row.state = addressParts.state;
    if (addressParts.zip) row.zip = addressParts.zip;

    const latitude = parseNumber(pickField(fields, headerIndex, ["latitude", "lat"]));
    const longitude = parseNumber(
      pickField(fields, headerIndex, ["longitude", "lng", "lon"])
    );
    if (latitude !== undefined) row.latitude = latitude;
    if (longitude !== undefined) row.longitude = longitude;

    const rating = parseNumber(
      pickField(fields, headerIndex, ["review_rating", "rating"])
    );
    if (rating !== undefined) row.rating = rating;

    const reviewCount = parseNumber(
      pickField(fields, headerIndex, ["review_count", "reviews", "reviews_count"])
    );
    if (reviewCount !== undefined) row.reviewCount = Math.round(reviewCount);

    const phone = pickField(fields, headerIndex, ["phone", "phone_number"]);
    if (phone) row.phone = phone;

    const website = pickField(fields, headerIndex, ["website", "web_site"]);
    if (website) row.website = website;

    const categoryHint = pickField(fields, headerIndex, [
      "category",
      "categories",
      "main_category",
    ]);
    if (categoryHint) row.categoryHint = categoryHint;

    if (placeId) row.placeId = placeId;

    rows.push(row);
  }

  return rows;
}

/**
 * Parse a CSV exported from search.certifications.sba.gov. SBA export
 * headers vary, so names are matched against several known variants.
 * Rows without a business name and malformed records are skipped.
 */
export function parseSbaCsv(csv: string): SbaBusinessRow[] {
  const records = splitCsvRecords(csv);
  if (records.length < 2) return [];

  const headerFields = parseCsvRecord(records[0]);
  if (!headerFields) return [];
  const headerIndex = buildHeaderIndex(headerFields);

  const rows: SbaBusinessRow[] = [];

  for (let i = 1; i < records.length; i++) {
    const fields = parseCsvRecord(records[i]);
    if (!fields) continue;

    const name = pickField(fields, headerIndex, [
      "legal_business_name",
      "firm_name",
      "business_name",
      "company_name",
      "name",
    ]);
    if (!name) continue;

    const row: SbaBusinessRow = { name };

    const city = pickField(fields, headerIndex, [
      "city",
      "firm_city",
      "physical_city",
      "physical_address_city",
    ]);
    if (city) row.city = city;

    const state = pickField(fields, headerIndex, [
      "state",
      "firm_state",
      "physical_state",
      "physical_address_state",
      "st",
    ]);
    if (state) row.state = state;

    const certificationsRaw = pickField(fields, headerIndex, [
      "certifications",
      "certification",
      "certification_s",
      "active_certifications",
      "sba_certifications",
      "certification_type",
    ]);
    if (certificationsRaw) {
      const certifications = certificationsRaw
        .split(/[,;|]/)
        .map((cert) => cert.trim())
        .filter((cert) => cert.length > 0);
      if (certifications.length > 0) row.certifications = certifications;
    }

    rows.push(row);
  }

  return rows;
}

/**
 * Normalize a business name for fuzzy matching: lowercase, "&" -> "and",
 * strip punctuation, collapse whitespace.
 */
export function normalizeBusinessName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Build a URL-safe slug from name (+ optional city), used as the upsert
 * key for scraped businesses without a place_id.
 */
export function slugifyBusiness(name: string, city?: string): string {
  return [name, city]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const CATEGORY_KEYWORDS: [slug: string, keywords: string[]][] = [
  [
    "food-drink",
    [
      "restaurant", "cafe", "coffee", "bakery", "bar", "pub", "brewery",
      "winery", "deli", "diner", "grill", "pizza", "taco", "sushi", "burger",
      "sandwich", "noodle", "ramen", "pho", "boba", "tea house", "bubble tea",
      "juice", "smoothie", "ice cream", "dessert", "donut", "bagel", "bbq",
      "barbecue", "steak", "seafood", "kitchen", "eatery", "food", "bistro",
      "brunch", "breakfast", "catering", "taqueria",
    ],
  ],
  [
    "health-wellness",
    [
      "gym", "fitness", "spa", "salon", "yoga", "pilates", "barber", "nail",
      "hair", "massage", "dental", "dentist", "doctor", "medical", "clinic",
      "chiropract", "acupunctur", "optometr", "pharmacy", "wellness",
      "health", "veterinar", "therap", "dermatolog", "urgent care",
    ],
  ],
  [
    "arts-culture",
    [
      "art galler", "gallery", "museum", "theater", "theatre", "art studio",
      "dance studio", "music school", "pottery", "craft studio", "cultural",
      "performing arts", "art center", "art centre",
    ],
  ],
  [
    "entertainment",
    [
      "arcade", "bowling", "cinema", "movie", "karaoke", "amusement",
      "casino", "billiard", "escape room", "laser tag", "mini golf",
      "golf course", "night club", "nightclub", "entertainment", "venue",
      "trampoline", "axe throwing", "paintball",
    ],
  ],
  [
    "retail",
    [
      "store", "shop", "boutique", "market", "retail", "grocery",
      "supermarket", "book", "clothing", "apparel", "shoe", "jewel",
      "florist", "flower", "gift", "furniture", "hardware", "antique",
      "thrift", "toy", "record", "vape", "liquor", "convenience",
      "dispensary", "nursery", "outlet", "mall",
    ],
  ],
  [
    "services",
    [
      "service", "repair", "plumb", "electric", "lawyer", "attorney",
      "legal", "bank", "insurance", "real estate", "realtor", "agency",
      "accounting", "tax", "auto", "mechanic", "car wash", "detailing",
      "cleaner", "cleaning", "laundry", "locksmith", "contractor",
      "landscap", "tutor", "school", "daycare", "child care", "photograph",
      "printing", "storage", "moving", "notary", "tailor", "consult",
    ],
  ],
];

/**
 * Fuzzy-match a scraped category hint (e.g. "Coffee shop",
 * "fast_food_restaurant") against the six Pulse category slugs.
 * Returns null when nothing matches.
 */
export function matchCategorySlug(hint: string | undefined): string | null {
  if (!hint) return null;
  const normalized = hint.toLowerCase().replace(/[_-]+/g, " ").trim();
  if (normalized.length === 0) return null;

  // Exact slug (e.g. "food-drink" normalized to "food drink").
  for (const [slug] of CATEGORY_KEYWORDS) {
    if (slug.replace(/-/g, " ") === normalized) return slug;
  }

  // Longest keyword match wins, so "auto repair shop" prefers
  // services ("repair") over retail ("shop").
  let best: string | null = null;
  let bestLength = 0;
  for (const [slug, keywords] of CATEGORY_KEYWORDS) {
    for (const keyword of keywords) {
      if (keyword.length > bestLength && normalized.includes(keyword)) {
        best = slug;
        bestLength = keyword.length;
      }
    }
  }
  return best;
}
