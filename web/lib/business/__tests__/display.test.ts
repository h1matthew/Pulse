import { describe, expect, it } from "vitest";
import {
  buildBusinessFallbackImageUrl,
  buildBusinessPhotoUrl,
  buildBusinessSummary,
  getBusinessReviewLabel,
  getGoogleMapsReviewUrl,
  isRealBusinessPlaceTypes,
  isRealBusinessRecord,
  normalizeBusinessPhotoReference,
  isPlaceholderBusinessDescription,
  shouldShowGoogleReviewHint,
} from "../display";

describe("business display helpers", () => {
  describe("isPlaceholderBusinessDescription", () => {
    it("detects generic placeholder copy", () => {
      expect(isPlaceholderBusinessDescription("Local Retail Store")).toBe(true);
      expect(
        isPlaceholderBusinessDescription(
          "A local business proudly serving the community"
        )
      ).toBe(true);
    });

    it("keeps meaningful descriptions", () => {
      expect(
        isPlaceholderBusinessDescription(
          "Independent coffee bar with rotating seasonal roasts."
        )
      ).toBe(false);
    });
  });

  describe("buildBusinessSummary", () => {
    it("prefers a quality short description", () => {
      const summary = buildBusinessSummary({
        name: "Northside Coffee",
        short_description: "Cozy espresso bar with pastries and late-night hours.",
        description: "Local Retail Store",
        categoryName: "Food & Drink",
        city: "Austin",
        state: "TX",
        tags: ["coffee", "pastries"],
      });

      expect(summary).toBe(
        "Cozy espresso bar with pastries and late-night hours."
      );
    });

    it("generates fallback copy when stored descriptions are placeholders", () => {
      const summary = buildBusinessSummary({
        name: "Paper Trail Books",
        short_description: "Local Retail Store",
        description: "Local Retail Store",
        categoryName: "Retail",
        city: "Austin",
        state: "TX",
        tags: ["books", "stationery", "gifts"],
      });

      expect(summary.toLowerCase()).toContain("paper trail books");
      expect(summary.toLowerCase()).toContain("retail");
      expect(summary).not.toBe("Local Retail Store");
    });
  });

  describe("getBusinessReviewLabel", () => {
    it("labels google counts as ratings", () => {
      expect(
        getBusinessReviewLabel({
          data_source: "google",
          review_count: 126,
        })
      ).toBe("126 Google ratings");
    });

    it("labels local counts as reviews", () => {
      expect(
        getBusinessReviewLabel({
          data_source: "user_added",
          review_count: 12,
        })
      ).toBe("12 reviews");
    });

    it("returns empty-state copy for zero count", () => {
      expect(
        getBusinessReviewLabel({
          data_source: "google",
          review_count: 0,
        })
      ).toBe("No reviews yet");
    });
  });

  describe("shouldShowGoogleReviewHint", () => {
    it("shows hint when there are google ratings but no local written reviews", () => {
      expect(
        shouldShowGoogleReviewHint({
          data_source: "google",
          review_count: 80,
          local_review_count: 0,
        })
      ).toBe(true);
    });

    it("hides hint when local reviews exist", () => {
      expect(
        shouldShowGoogleReviewHint({
          data_source: "google",
          review_count: 80,
          local_review_count: 2,
        })
      ).toBe(false);
    });
  });

  describe("getGoogleMapsReviewUrl", () => {
    it("includes place id when provided", () => {
      const url = getGoogleMapsReviewUrl({
        name: "Northside Coffee",
        address: "123 Main St, Austin, TX",
        place_id: "abc123",
      });

      expect(url).toContain("query_place_id=abc123");
      expect(url).toContain("google.com/maps/search");
    });

    it("falls back to query-only url when place id is missing", () => {
      const url = getGoogleMapsReviewUrl({
        name: "Paper Trail Books",
        address: "456 Oak Ave, Austin, TX",
        place_id: null,
      });

      expect(url).toContain("google.com/maps/search");
      expect(url).not.toContain("query_place_id=");
    });
  });

  describe("isRealBusinessPlaceTypes", () => {
    it("allows commercial place types", () => {
      expect(isRealBusinessPlaceTypes(["restaurant", "food", "point_of_interest"])).toBe(
        true
      );
      expect(isRealBusinessPlaceTypes(["clothing_store", "store"])).toBe(true);
    });

    it("filters out schools and institutions", () => {
      expect(isRealBusinessPlaceTypes(["school", "point_of_interest"])).toBe(false);
      expect(isRealBusinessPlaceTypes(["primary_school", "establishment"])).toBe(false);
      expect(isRealBusinessPlaceTypes(["university"])).toBe(false);
    });
  });

  describe("isRealBusinessRecord", () => {
    it("filters google records with school tags", () => {
      expect(
        isRealBusinessRecord({
          data_source: "google",
          tags: ["school", "point_of_interest"],
          name: "Lincoln High School",
        })
      ).toBe(false);
    });

    it("keeps google businesses synced with legacy category tags", () => {
      expect(
        isRealBusinessRecord({
          data_source: "google",
          tags: ["service"],
          name: "Costco Gas Station",
        })
      ).toBe(true);
    });

    it("filters parks from google synced records", () => {
      expect(
        isRealBusinessRecord({
          data_source: "google",
          tags: ["park"],
          name: "Peter F. Schabarum Regional Park",
        })
      ).toBe(false);
    });

    it("keeps local user-added businesses", () => {
      expect(
        isRealBusinessRecord({
          data_source: "user_added",
          tags: [],
          name: "River Walk Coffee",
        })
      ).toBe(true);
    });
  });

  describe("buildBusinessPhotoUrl", () => {
    it("builds photo proxy url from string reference", () => {
      expect(
        buildBusinessPhotoUrl("places/abc123/photos/p1", {
          maxWidth: 400,
          maxHeight: 300,
        })
      ).toBe(
        "/api/businesses/photo?reference=places%2Fabc123%2Fphotos%2Fp1&maxWidth=400&maxHeight=300"
      );
    });

    it("builds photo proxy url from photo object", () => {
      expect(
        buildBusinessPhotoUrl(
          { photo_reference: "legacy_photo_reference" },
          { maxWidth: 800, maxHeight: 500 }
        )
      ).toBe(
        "/api/businesses/photo?reference=legacy_photo_reference&maxWidth=800&maxHeight=500"
      );
    });

    it("normalizes full Google media URLs into photo references", () => {
      expect(
        buildBusinessPhotoUrl(
          "https://places.googleapis.com/v1/places/abc123/photos/photo1/media?key=old-key&maxWidthPx=800",
          { maxWidth: 400, maxHeight: 300 }
        )
      ).toBe(
        "/api/businesses/photo?reference=places%2Fabc123%2Fphotos%2Fphoto1&maxWidth=400&maxHeight=300"
      );
    });

    it("returns null when no photo reference exists", () => {
      expect(buildBusinessPhotoUrl(undefined)).toBeNull();
      expect(buildBusinessPhotoUrl({})).toBeNull();
    });
  });

  describe("normalizeBusinessPhotoReference", () => {
    it("extracts places photo references from full media URLs", () => {
      expect(
        normalizeBusinessPhotoReference(
          "https://places.googleapis.com/v1/places/abc123/photos/photo1/media?key=old-key"
        )
      ).toBe("places/abc123/photos/photo1");
    });

    it("extracts legacy photo_reference query values", () => {
      expect(
        normalizeBusinessPhotoReference(
          "https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=legacy_ref&key=old-key"
        )
      ).toBe("legacy_ref");
    });
  });

  describe("buildBusinessFallbackImageUrl", () => {
    it("returns an SVG data URI", () => {
      const url = buildBusinessFallbackImageUrl({
        name: "Northside Coffee",
        categoryName: "Food & Drink",
      });

      expect(url.startsWith("data:image/svg+xml")).toBe(true);
      expect(url).toContain("Northside%20Coffee");
      expect(url).toContain("Food%20%26amp%3B%20Drink");
    });

    it("is deterministic for identical input", () => {
      const first = buildBusinessFallbackImageUrl({
        name: "Paper Trail Books",
        categoryName: "Retail",
      });
      const second = buildBusinessFallbackImageUrl({
        name: "Paper Trail Books",
        categoryName: "Retail",
      });

      expect(first).toBe(second);
    });
  });
});
