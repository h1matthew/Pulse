import { describe, it, expect } from "vitest";
import {
  createBusinessSchema,
  updateBusinessSchema,
  createReviewSchema,
  updateReviewSchema,
  createBookmarkSchema,
  updateBookmarkSchema,
  loginSchema,
  registerSchema,
  createCheckInSchema,
  userPreferencesSchema,
  notificationPreferencesSchema,
  privacySettingsSchema,
  contactFormSchema,
  reportReviewSchema,
  claimDealSchema,
  createCollectionSchema,
  captchaTokenSchema,
  validateRequest,
  formatZodError,
} from "../../validation";

describe("createBusinessSchema", () => {
  const validBusiness = {
    name: "Test Business",
    description: "A great place to visit",
    address: "123 Main St",
    city: "Seattle",
    state: "WA",
    zip_code: "98101",
  };

  it("should validate a valid business", () => {
    const result = createBusinessSchema.safeParse(validBusiness);
    expect(result.success).toBe(true);
  });

  it("should reject name that is too short", () => {
    const result = createBusinessSchema.safeParse({
      ...validBusiness,
      name: "A",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("at least 2 characters");
    }
  });

  it("should reject name that is too long", () => {
    const result = createBusinessSchema.safeParse({
      ...validBusiness,
      name: "A".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid email", () => {
    const result = createBusinessSchema.safeParse({
      ...validBusiness,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid website URL", () => {
    const result = createBusinessSchema.safeParse({
      ...validBusiness,
      website: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid category_id", () => {
    const result = createBusinessSchema.safeParse({
      ...validBusiness,
      category_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });
});

describe("createReviewSchema", () => {
  const validReview = {
    business_id: "550e8400-e29b-41d4-a716-446655440000",
    rating: 5,
    content: "This is a great place! I really enjoyed my visit.",
  };

  it("should validate a valid review", () => {
    const result = createReviewSchema.safeParse(validReview);
    expect(result.success).toBe(true);
  });

  it("should reject rating below 1", () => {
    const result = createReviewSchema.safeParse({
      ...validReview,
      rating: 0,
    });
    expect(result.success).toBe(false);
  });

  it("should reject rating above 5", () => {
    const result = createReviewSchema.safeParse({
      ...validReview,
      rating: 6,
    });
    expect(result.success).toBe(false);
  });

  it("should reject content that is too short", () => {
    const result = createReviewSchema.safeParse({
      ...validReview,
      content: "Hi",
    });
    expect(result.success).toBe(false);
  });

  it("should reject content that is too long", () => {
    const result = createReviewSchema.safeParse({
      ...validReview,
      content: "A".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("should reject more than 5 photos", () => {
    const result = createReviewSchema.safeParse({
      ...validReview,
      photos: Array(6).fill("https://example.com/photo.jpg"),
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid photo URLs", () => {
    const result = createReviewSchema.safeParse({
      ...validReview,
      photos: ["not-a-url"],
    });
    expect(result.success).toBe(false);
  });
});

describe("createBookmarkSchema", () => {
  it("should validate a valid bookmark", () => {
    const result = createBookmarkSchema.safeParse({
      business_id: "550e8400-e29b-41d4-a716-446655440000",
      note: "Want to try this place",
    });
    expect(result.success).toBe(true);
  });

  it("should reject note that is too long", () => {
    const result = createBookmarkSchema.safeParse({
      business_id: "550e8400-e29b-41d4-a716-446655440000",
      note: "A".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("should allow bookmark without note", () => {
    const result = createBookmarkSchema.safeParse({
      business_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });
});

describe("loginSchema", () => {
  it("should validate valid login credentials", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("should reject short password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "123",
    });
    expect(result.success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("should validate valid registration", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "password123",
      full_name: "John Doe",
    });
    expect(result.success).toBe(true);
  });

  it("should reject short full name", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "password123",
      full_name: "J",
    });
    expect(result.success).toBe(false);
  });
});

describe("createCheckInSchema", () => {
  it("should validate valid check-in", () => {
    const result = createCheckInSchema.safeParse({
      business_id: "550e8400-e29b-41d4-a716-446655440000",
      latitude: 47.6062,
      longitude: -122.3321,
      spend_amount: 50,
      notes: "Great experience!",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid latitude", () => {
    const result = createCheckInSchema.safeParse({
      business_id: "550e8400-e29b-41d4-a716-446655440000",
      latitude: 91,
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid longitude", () => {
    const result = createCheckInSchema.safeParse({
      business_id: "550e8400-e29b-41d4-a716-446655440000",
      longitude: -181,
    });
    expect(result.success).toBe(false);
  });

  it("should reject excessive spend amount", () => {
    const result = createCheckInSchema.safeParse({
      business_id: "550e8400-e29b-41d4-a716-446655440000",
      spend_amount: 10001,
    });
    expect(result.success).toBe(false);
  });
});

describe("userPreferencesSchema", () => {
  it("should validate valid preferences", () => {
    const result = userPreferencesSchema.safeParse({
      preferred_categories: ["550e8400-e29b-41d4-a716-446655440000"],
      price_range: [1, 2, 3],
      max_distance: 10,
      theme: "dark",
      accent_color: "blue",
    });
    expect(result.success).toBe(true);
  });

  it("should reject too many categories", () => {
    const result = userPreferencesSchema.safeParse({
      preferred_categories: Array(11).fill("550e8400-e29b-41d4-a716-446655440000"),
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid theme", () => {
    const result = userPreferencesSchema.safeParse({
      theme: "purple", // not a valid theme
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid max_distance", () => {
    const result = userPreferencesSchema.safeParse({
      max_distance: 101,
    });
    expect(result.success).toBe(false);
  });
});

describe("contactFormSchema", () => {
  const validContact = {
    name: "John Doe",
    email: "john@example.com",
    subject: "Question about the app",
    message: "I have a question about how to use the app...",
  };

  it("should validate valid contact form", () => {
    const result = contactFormSchema.safeParse(validContact);
    expect(result.success).toBe(true);
  });

  it("should reject honeypot field", () => {
    const result = contactFormSchema.safeParse({
      ...validContact,
      honeypot: "spam value",
    });
    expect(result.success).toBe(false);
  });

  it("should reject short subject", () => {
    const result = contactFormSchema.safeParse({
      ...validContact,
      subject: "Hi",
    });
    expect(result.success).toBe(false);
  });

  it("should reject short message", () => {
    const result = contactFormSchema.safeParse({
      ...validContact,
      message: "Hi",
    });
    expect(result.success).toBe(false);
  });
});

describe("validateRequest", () => {
  it("should return success for valid data", () => {
    const result = validateRequest(loginSchema, {
      email: "user@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("user@example.com");
    }
  });

  it("should return error for invalid data", () => {
    const result = validateRequest(loginSchema, {
      email: "invalid",
      password: "123",
    });
    expect(result.success).toBe(false);
  });
});

describe("formatZodError", () => {
  it("should format error message", () => {
    const result = loginSchema.safeParse({
      email: "invalid",
      password: "123",
    });
    if (!result.success) {
      const formatted = formatZodError(result.error);
      expect(typeof formatted).toBe("string");
      expect(formatted.length).toBeGreaterThan(0);
    }
  });
});

describe("claimDealSchema", () => {
  it("should validate valid deal claim", () => {
    const result = claimDealSchema.safeParse({
      deal_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid deal_id", () => {
    const result = claimDealSchema.safeParse({
      deal_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });
});

describe("createCollectionSchema", () => {
  it("should validate valid collection", () => {
    const result = createCollectionSchema.safeParse({
      name: "My Favorites",
      description: "Places I want to visit",
      is_public: true,
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty name", () => {
    const result = createCollectionSchema.safeParse({
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("should reject description that is too long", () => {
    const result = createCollectionSchema.safeParse({
      name: "My Collection",
      description: "A".repeat(201),
    });
    expect(result.success).toBe(false);
  });
});

describe("captchaTokenSchema", () => {
  it("should validate valid token", () => {
    const result = captchaTokenSchema.safeParse({
      token: "valid-token-string",
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty token", () => {
    const result = captchaTokenSchema.safeParse({
      token: "",
    });
    expect(result.success).toBe(false);
  });
});
