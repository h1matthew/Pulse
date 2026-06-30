import { describe, expect, it } from "vitest";
import {
  deriveAmenitiesFromGoogleFlags,
  deriveAmenitiesFromTags,
  resolveAmenities,
} from "../amenities";

describe("amenities helpers", () => {
  describe("deriveAmenitiesFromGoogleFlags", () => {
    it("maps true flags to labels and ignores false/null/undefined", () => {
      const amenities = deriveAmenitiesFromGoogleFlags({
        dineIn: true,
        takeout: true,
        delivery: false,
        servesBreakfast: null,
        outdoorSeating: true,
      });
      expect(amenities).toEqual(["Dine-in", "Takeout", "Outdoor Seating"]);
    });

    it("returns an empty array when nothing is set", () => {
      expect(deriveAmenitiesFromGoogleFlags({})).toEqual([]);
    });
  });

  describe("deriveAmenitiesFromTags", () => {
    it("derives takeout/delivery from meal_* types", () => {
      expect(
        deriveAmenitiesFromTags(["restaurant", "meal_takeaway", "meal_delivery"])
      ).toEqual(["Takeout", "Delivery", "Dine-in"]);
    });

    it("derives breakfast/lunch/dinner from specialized restaurant types", () => {
      expect(
        deriveAmenitiesFromTags(["breakfast_restaurant", "sandwich_shop"])
      ).toEqual(["Dine-in", "Breakfast", "Lunch"]);
    });

    it("handles OSM-style keys", () => {
      expect(
        deriveAmenitiesFromTags(["cafe", "takeaway", "wheelchair"])
      ).toEqual(["Takeout", "Dine-in", "Wheelchair Accessible"]);
    });

    it("returns empty for unrelated tags", () => {
      expect(deriveAmenitiesFromTags(["atm", "finance"])).toEqual([]);
    });

    it("returns empty for null/empty input", () => {
      expect(deriveAmenitiesFromTags(null)).toEqual([]);
      expect(deriveAmenitiesFromTags([])).toEqual([]);
      expect(deriveAmenitiesFromTags(undefined)).toEqual([]);
    });

    it("dedupes overlapping matches", () => {
      const amenities = deriveAmenitiesFromTags([
        "restaurant",
        "vegetarian_restaurant",
      ]);
      expect(amenities).toContain("Dine-in");
      expect(amenities).toContain("Vegetarian Options");
      // Dine-in should appear only once
      expect(amenities.filter((a) => a === "Dine-in")).toHaveLength(1);
    });
  });

  describe("resolveAmenities", () => {
    it("prefers stored amenities when present", () => {
      expect(resolveAmenities(["WiFi"], ["restaurant"])).toEqual(["WiFi"]);
    });

    it("falls back to tag-derived amenities when stored is empty", () => {
      expect(resolveAmenities([], ["restaurant", "meal_takeaway"])).toEqual([
        "Takeout",
        "Dine-in",
      ]);
      expect(resolveAmenities(null, ["cafe"])).toEqual(["Dine-in"]);
    });

    it("returns empty when neither source yields amenities", () => {
      expect(resolveAmenities([], ["atm"])).toEqual([]);
    });
  });
});
