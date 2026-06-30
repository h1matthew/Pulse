/**
 * Amenity derivation helpers.
 *
 * Google Places API v2 exposes amenity booleans (dineIn, takeout, delivery,
 * outdoorSeating, …) which we map to human-readable labels and persist on the
 * `businesses.amenities` column at sync time. For rows that predate that
 * enrichment (or came from OSM, which doesn't provide these fields), we fall
 * back to deriving a best-effort amenity set from the stored place `tags` /
 * OSM keys so the business detail "Amenities" section isn't empty.
 */

export interface GooglePlaceAmenityFlags {
  dineIn?: boolean | null
  takeout?: boolean | null
  delivery?: boolean | null
  curbsidePickup?: boolean | null
  servesBreakfast?: boolean | null
  servesLunch?: boolean | null
  servesDinner?: boolean | null
  servesVegetarianFood?: boolean | null
  servesBeer?: boolean | null
  servesWine?: boolean | null
  outdoorSeating?: boolean | null
  goodForGroups?: boolean | null
  goodForChildren?: boolean | null
  restroom?: boolean | null
  wheelchairAccessibleEntrance?: boolean | null
  reservable?: boolean | null
}

const FLAG_TO_LABEL: Record<keyof GooglePlaceAmenityFlags, string> = {
  dineIn: "Dine-in",
  takeout: "Takeout",
  delivery: "Delivery",
  curbsidePickup: "Curbside Pickup",
  servesBreakfast: "Breakfast",
  servesLunch: "Lunch",
  servesDinner: "Dinner",
  servesVegetarianFood: "Vegetarian Options",
  servesBeer: "Beer Available",
  servesWine: "Wine Available",
  outdoorSeating: "Outdoor Seating",
  goodForGroups: "Good for Groups",
  goodForChildren: "Good for Kids",
  restroom: "Restroom",
  wheelchairAccessibleEntrance: "Wheelchair Accessible",
  reservable: "Reservations",
}

/** Build an amenities string[] from Google Places v2 amenity booleans. */
export function deriveAmenitiesFromGoogleFlags(
  flags: GooglePlaceAmenityFlags
): string[] {
  const amenities: string[] = []
  for (const key of Object.keys(FLAG_TO_LABEL) as (keyof GooglePlaceAmenityFlags)[]) {
    if (flags[key] === true) {
      amenities.push(FLAG_TO_LABEL[key])
    }
  }
  return amenities
}

/** Map of place-type / OSM-tag substrings → amenity label, for legacy rows. */
const TAG_AMENITY_RULES: Array<{ match: string[]; label: string }> = [
  { match: ["meal_takeaway", "meal-takeaway", "takeaway"], label: "Takeout" },
  { match: ["meal_delivery", "meal-delivery", "delivery"], label: "Delivery" },
  { match: ["restaurant", "cafe", "bar", "bakery", "night_club", "brewery", "wine_bar"], label: "Dine-in" },
  { match: ["breakfast_restaurant", "breakfast", "bagel_shop"], label: "Breakfast" },
  { match: ["lunch", "sandwich_shop", "deli"], label: "Lunch" },
  { match: ["dinner", "steak_house", "barbecue_restaurant", "seafood_restaurant"], label: "Dinner" },
  { match: ["vegetarian_restaurant", "vegan_restaurant", "vegetarian", "vegan"], label: "Vegetarian Options" },
  { match: ["outdoor_seating", "outdoor-seating"], label: "Outdoor Seating" },
  { match: ["wheelchair", "wheelchair_accessible"], label: "Wheelchair Accessible" },
]

/** Split a tag into normalized segments on _ or - (e.g. "meal_takeaway" → ["meal","takeaway"]). */
function tagSegments(tag: string): string[] {
  return tag
    .split(/[_-]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

/** A tag matches a keyword when the keyword is a whole segment (or the whole tag). */
function tagMatchesKeyword(tag: string, keyword: string): boolean {
  const k = keyword.toLowerCase()
  if (tag === k) return true
  return tagSegments(tag).includes(k)
}

/**
 * Best-effort amenities from stored tags/place-types. Used for rows that were
 * synced before the amenity booleans were captured, or that came from OSM.
 * Returns an empty array (not a guess) when no rule matches.
 */
export function deriveAmenitiesFromTags(tags?: string[] | null): string[] {
  if (!tags || tags.length === 0) return []

  const normalized = tags.map((t) => t.trim().toLowerCase())
  const amenities: string[] = []
  const seen = new Set<string>()

  for (const rule of TAG_AMENITY_RULES) {
    if (normalized.some((t) => rule.match.some((m) => tagMatchesKeyword(t, m)))) {
      if (!seen.has(rule.label)) {
        seen.add(rule.label)
        amenities.push(rule.label)
      }
    }
  }

  return amenities
}

/**
 * Resolve the amenities to display for a business: prefer stored amenities,
 * fall back to a tag-derived set when the stored list is empty so the
 * "Amenities" section isn't silently missing for legacy rows.
 */
export function resolveAmenities(
  stored: string[] | null | undefined,
  tags?: string[] | null
): string[] {
  if (stored && stored.length > 0) return stored
  return deriveAmenitiesFromTags(tags)
}
