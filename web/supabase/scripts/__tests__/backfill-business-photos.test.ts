import { describe, expect, it } from "vitest";
import {
  entryToReference,
  firstUsablePhoto,
  hasNoUsablePhotos,
  squaredDistance,
} from "../backfill-business-photos";

describe("backfill-business-photos helpers", () => {
  describe("entryToReference", () => {
    it("returns a non-empty string entry (untrimmed; callers normalize later)", () => {
      expect(entryToReference("https://x.com/a.jpg")).toBe("https://x.com/a.jpg");
      expect(entryToReference("  pad  ")).toBe("  pad  ");
    });

    it("returns null for empty/whitespace strings", () => {
      expect(entryToReference("")).toBeNull();
      expect(entryToReference("   ")).toBeNull();
    });

    it("extracts photo_reference from an object", () => {
      expect(entryToReference({ photo_reference: "places/abc/photos/p1" })).toBe(
        "places/abc/photos/p1"
      );
    });

    it("returns null when photo_reference is missing or empty", () => {
      expect(entryToReference({})).toBeNull();
      expect(entryToReference({ photo_reference: "" })).toBeNull();
      expect(entryToReference({ photo_reference: null })).toBeNull();
      expect(entryToReference(null)).toBeNull();
      expect(entryToReference(undefined)).toBeNull();
      expect(entryToReference(42)).toBeNull();
    });
  });

  describe("firstUsablePhoto", () => {
    it("returns the first entry with a usable reference", () => {
      const photos = [
        { photo_reference: "" },
        "  ",
        { photo_reference: "places/x/photos/y" },
        "https://cdn/img.jpg",
      ];
      expect(firstUsablePhoto(photos)).toEqual({ photo_reference: "places/x/photos/y" });
    });

    it("returns null when nothing is usable", () => {
      expect(firstUsablePhoto([{ photo_reference: "" }, ""])).toBeNull();
      expect(firstUsablePhoto([])).toBeNull();
      expect(firstUsablePhoto(null)).toBeNull();
      expect(firstUsablePhoto(undefined)).toBeNull();
    });
  });

  describe("hasNoUsablePhotos", () => {
    it("is true for empty/non-array photos", () => {
      expect(hasNoUsablePhotos([])).toBe(true);
      expect(hasNoUsablePhotos(null)).toBe(true);
      expect(hasNoUsablePhotos(undefined)).toBe(true);
      expect(hasNoUsablePhotos({})).toBe(true);
    });

    it("is true when all entries are unusable", () => {
      expect(hasNoUsablePhotos([{ photo_reference: "" }, "   "])).toBe(true);
    });

    it("is false when at least one entry is usable", () => {
      expect(hasNoUsablePhotos([{ photo_reference: "" }, "https://cdn/x.jpg"])).toBe(false);
    });
  });

  describe("squaredDistance", () => {
    it("is zero for identical points", () => {
      expect(squaredDistance(1, 2, 1, 2)).toBe(0);
    });

    it("computes squared euclidean distance", () => {
      expect(squaredDistance(0, 0, 3, 4)).toBe(25); // 3-4-5 triangle
      expect(squaredDistance(2, 2, 5, 6)).toBe(25); // dx=3, dy=4
    });

    it("preserves relative ordering for nearest-neighbor ranking", () => {
      const nearer = squaredDistance(0, 0, 1, 0);
      const farther = squaredDistance(0, 0, 2, 0);
      expect(nearer).toBeLessThan(farther);
    });
  });
});
