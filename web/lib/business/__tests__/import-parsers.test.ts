import { describe, it, expect } from "vitest";
import {
  parseScraperCsv,
  parseSbaCsv,
  normalizeBusinessName,
  extractPlaceId,
  splitUsAddress,
  slugifyBusiness,
  matchCategorySlug,
} from "../import-parsers";

describe("parseScraperCsv", () => {
  it("maps gosom google-maps-scraper columns to ScrapedBusinessRow", () => {
    const csv = [
      "title,category,address,website,phone,review_count,review_rating,latitude,longitude,place_id",
      "Joe's Cafe,Coffee shop,\"123 Main St, Diamond Bar, CA 91765\",https://joes.example.com,(909) 555-0100,231,4.6,34.0286,-117.8103,ChIJabc123DEF-_456",
    ].join("\n");

    const rows = parseScraperCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      name: "Joe's Cafe",
      categoryHint: "Coffee shop",
      address: "123 Main St",
      city: "Diamond Bar",
      state: "CA",
      zip: "91765",
      website: "https://joes.example.com",
      phone: "(909) 555-0100",
      reviewCount: 231,
      rating: 4.6,
      latitude: 34.0286,
      longitude: -117.8103,
      placeId: "ChIJabc123DEF-_456",
    });
  });

  it("handles quoted fields containing commas and escaped quotes", () => {
    const csv = [
      "title,address,category",
      '"Burgers, Shakes ""N"" Fries","456 Grand Ave, Walnut, CA 91789",Restaurant',
    ].join("\n");

    const rows = parseScraperCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Burgers, Shakes "N" Fries');
    expect(rows[0].address).toBe("456 Grand Ave");
    expect(rows[0].city).toBe("Walnut");
    expect(rows[0].state).toBe("CA");
    expect(rows[0].zip).toBe("91789");
  });

  it("handles quoted fields containing newlines", () => {
    const csv =
      'title,address\n"Multi\nLine Deli","789 Oak St, Pomona, CA 91766"\nSecond Spot,';
    const rows = parseScraperCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe("Multi\nLine Deli");
    expect(rows[1].name).toBe("Second Spot");
  });

  it("tolerates missing columns", () => {
    const csv = "title\nLonely Business";
    const rows = parseScraperCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ name: "Lonely Business" });
  });

  it("skips rows without a name", () => {
    const csv = "title,phone\n,555-0000\nNamed Business,555-1111";
    const rows = parseScraperCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Named Business");
  });

  it("skips malformed lines without throwing", () => {
    const csv = [
      "title,phone",
      'Good Row,555-0100',
      '"Bad"Row,555-0200', // junk after closing quote
      'Another Good Row,555-0300',
      '"Unterminated quote,555-0400', // unterminated quote at EOF
    ].join("\n");

    let rows: ReturnType<typeof parseScraperCsv> = [];
    expect(() => {
      rows = parseScraperCsv(csv);
    }).not.toThrow();
    expect(rows.map((r) => r.name)).toEqual(["Good Row", "Another Good Row"]);
  });

  it("extracts place id from a google maps link column", () => {
    const csv = [
      "title,link",
      "Linked Biz,https://www.google.com/maps/place/?q=place_id:ChIJN1t_tDeuEmsRUsoyG83frY4",
    ].join("\n");
    const rows = parseScraperCsv(csv);
    expect(rows[0].placeId).toBe("ChIJN1t_tDeuEmsRUsoyG83frY4");
  });

  it("ignores non-numeric rating and review_count values", () => {
    const csv = "title,review_rating,review_count\nOddball,not-a-number,n/a";
    const rows = parseScraperCsv(csv);
    expect(rows[0].rating).toBeUndefined();
    expect(rows[0].reviewCount).toBeUndefined();
  });

  it("returns empty array for empty or header-only input", () => {
    expect(parseScraperCsv("")).toEqual([]);
    expect(parseScraperCsv("title,address")).toEqual([]);
  });
});

describe("extractPlaceId", () => {
  it("passes through bare ChIJ place ids", () => {
    expect(extractPlaceId("ChIJN1t_tDeuEmsRUsoyG83frY4")).toBe(
      "ChIJN1t_tDeuEmsRUsoyG83frY4"
    );
  });

  it("extracts place_id query params from maps links", () => {
    expect(
      extractPlaceId("https://maps.example.com/?query_place_id=ChIJxyz_123")
    ).toBe("ChIJxyz_123");
    expect(extractPlaceId("https://maps.example.com/?place_id=ChIJabc")).toBe(
      "ChIJabc"
    );
  });

  it("extracts the hex feature id pair from maps data links", () => {
    expect(
      extractPlaceId(
        "https://www.google.com/maps/place/Joe's/data=!4m2!3m1!1s0x80c32c5e123abc:0x9f8e7d6c5b4a3210"
      )
    ).toBe("0x80c32c5e123abc:0x9f8e7d6c5b4a3210");
  });

  it("returns undefined for empty values and unparseable links", () => {
    expect(extractPlaceId(undefined)).toBeUndefined();
    expect(extractPlaceId("")).toBeUndefined();
    expect(extractPlaceId("https://example.com/no-place-here")).toBeUndefined();
  });
});

describe("splitUsAddress", () => {
  it("splits street, city, state, zip", () => {
    expect(splitUsAddress("1234 Grand Ave, Diamond Bar, CA 91765")).toEqual({
      address: "1234 Grand Ave",
      city: "Diamond Bar",
      state: "CA",
      zip: "91765",
    });
  });

  it("strips trailing country and handles zip+4", () => {
    expect(
      splitUsAddress("55 S Lemon Ave Ste 100, Walnut, CA 91789-1234, USA")
    ).toEqual({
      address: "55 S Lemon Ave Ste 100",
      city: "Walnut",
      state: "CA",
      zip: "91789-1234",
    });
  });

  it("falls back to raw address when not parseable", () => {
    expect(splitUsAddress("Somewhere in the woods")).toEqual({
      address: "Somewhere in the woods",
    });
    expect(splitUsAddress(undefined)).toEqual({});
  });
});

describe("parseSbaCsv", () => {
  it("parses standard headers", () => {
    const csv = [
      "legal_business_name,city,state,certifications",
      'Acme Plumbing LLC,Diamond Bar,CA,"8(a), WOSB"',
    ].join("\n");

    const rows = parseSbaCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      name: "Acme Plumbing LLC",
      city: "Diamond Bar",
      state: "CA",
      certifications: ["8(a)", "WOSB"],
    });
  });

  it("tolerates SBA header variants (Firm Name / Certification(s))", () => {
    const csv = [
      '"Firm Name","City","State","Certification(s)"',
      '"Best Catering Co","Pomona","CA","HUBZone"',
    ].join("\n");

    const rows = parseSbaCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Best Catering Co");
    expect(rows[0].certifications).toEqual(["HUBZone"]);
  });

  it("tolerates a plain name header and missing optional columns", () => {
    const csv = "Name\nSolo Firm";
    const rows = parseSbaCsv(csv);
    expect(rows).toEqual([{ name: "Solo Firm" }]);
  });

  it("skips rows without a name and malformed rows", () => {
    const csv = [
      "firm_name,state",
      ",CA",
      '"Broken"Row,CA',
      "Valid Firm,CA",
    ].join("\n");
    const rows = parseSbaCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Valid Firm");
  });
});

describe("normalizeBusinessName", () => {
  it("lowercases, trims, and collapses punctuation/whitespace", () => {
    expect(normalizeBusinessName("Joe's Pizza, Inc.")).toBe("joe s pizza inc");
    expect(normalizeBusinessName("  JOE'S   PIZZA -- INC ")).toBe(
      "joe s pizza inc"
    );
  });

  it("matches names that differ only by punctuation and case", () => {
    expect(normalizeBusinessName("ACME PLUMBING, L.L.C.")).toBe(
      normalizeBusinessName("Acme Plumbing LLC".replace("LLC", "L L C"))
    );
    expect(normalizeBusinessName("Smith & Sons")).toBe(
      normalizeBusinessName("Smith and Sons")
    );
  });
});

describe("slugifyBusiness", () => {
  it("builds a url-safe slug from name and city", () => {
    expect(slugifyBusiness("Joe's Café & Bar", "Diamond Bar")).toBe(
      "joe-s-caf-and-bar-diamond-bar"
    );
    expect(slugifyBusiness("Plain Name")).toBe("plain-name");
  });
});

describe("matchCategorySlug", () => {
  it("matches common scraper category hints", () => {
    expect(matchCategorySlug("Coffee shop")).toBe("food-drink");
    expect(matchCategorySlug("fast_food_restaurant")).toBe("food-drink");
    expect(matchCategorySlug("Grocery store")).toBe("retail");
    expect(matchCategorySlug("Hair salon")).toBe("health-wellness");
    expect(matchCategorySlug("Art gallery")).toBe("arts-culture");
    expect(matchCategorySlug("Bowling alley")).toBe("entertainment");
    expect(matchCategorySlug("Auto repair shop")).toBe("services");
  });

  it("matches exact slugs and returns null for unknown hints", () => {
    expect(matchCategorySlug("food-drink")).toBe("food-drink");
    expect(matchCategorySlug("Quantum flux emporium of mystery")).toBeNull();
    expect(matchCategorySlug(undefined)).toBeNull();
    expect(matchCategorySlug("")).toBeNull();
  });
});
