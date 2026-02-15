import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verifyCaptcha, withCaptchaVerification, getRateLimitKey } from "../captcha";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const originalEnv = process.env;

describe("verifyCaptcha", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return success for dev mode token in development", async () => {
    process.env.NODE_ENV = "development";

    const result = await verifyCaptcha("dev-mode-token");

    expect(result.success).toBe(true);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should return error when secret key is not configured in production", async () => {
    process.env.NODE_ENV = "production";
    delete (process as { env: Record<string, string> }).env.TURNSTILE_SECRET_KEY;

    const result = await verifyCaptcha("some-token");

    expect(result.success).toBe(false);
    expect(result.error).toBe("CAPTCHA not configured");
  });

  it("should verify token successfully with Turnstile API", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const result = await verifyCaptcha("valid-token");

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: "test-secret",
          response: "valid-token",
        }),
      })
    );
  });

  it("should handle failed verification", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        "error-codes": ["invalid-input-response"],
      }),
    });

    const result = await verifyCaptcha("invalid-token");

    expect(result.success).toBe(false);
    expect(result.error).toBe("CAPTCHA verification failed");
  });

  it("should handle missing input response error", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        "error-codes": ["missing-input-response"],
      }),
    });

    const result = await verifyCaptcha("");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Please complete the CAPTCHA");
  });

  it("should handle API error", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
    mockFetch.mockResolvedValueOnce({
      ok: false,
    });

    const result = await verifyCaptcha("token");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to verify CAPTCHA");
  });

  it("should handle network error", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await verifyCaptcha("token");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to verify CAPTCHA");
  });
});

describe("withCaptchaVerification", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should skip verification for GET requests", async () => {
    const mockHandler = vi.fn().mockResolvedValue(new Response("OK"));
    const wrappedHandler = withCaptchaVerification(mockHandler);

    const request = new Request("http://localhost/api/test", { method: "GET" });
    await wrappedHandler(request);

    expect(mockHandler).toHaveBeenCalledWith(request);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should require captcha token for POST requests", async () => {
    const mockHandler = vi.fn().mockResolvedValue(new Response("OK"));
    const wrappedHandler = withCaptchaVerification(mockHandler);

    const request = new Request("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({ data: "test" }),
    });

    const response = await wrappedHandler(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("CAPTCHA token required");
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("should pass request to handler after successful verification", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const mockHandler = vi.fn().mockResolvedValue(new Response("OK"));
    const wrappedHandler = withCaptchaVerification(mockHandler);

    const request = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: "test", captchaToken: "valid-token" }),
    });

    await wrappedHandler(request);

    expect(mockHandler).toHaveBeenCalled();
    // Verify captchaToken was stripped from the request
    const calledRequest = mockHandler.mock.calls[0][0] as Request;
    const calledBody = await calledRequest.json();
    expect(calledBody).not.toHaveProperty("captchaToken");
    expect(calledBody).toHaveProperty("data", "test");
  });

  it("should reject request with invalid captcha", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        "error-codes": ["invalid-input-response"],
      }),
    });

    const mockHandler = vi.fn().mockResolvedValue(new Response("OK"));
    const wrappedHandler = withCaptchaVerification(mockHandler);

    const request = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: "test", captchaToken: "invalid-token" }),
    });

    const response = await wrappedHandler(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("CAPTCHA verification failed");
    expect(mockHandler).not.toHaveBeenCalled();
  });
});

describe("getRateLimitKey", () => {
  it("should return IP only when no user ID", () => {
    const request = new Request("http://localhost/api/test", {
      headers: { "x-forwarded-for": "192.168.1.1" },
    });

    const key = getRateLimitKey(request);

    expect(key).toBe("192.168.1.1");
  });

  it("should combine IP and user ID when user ID provided", () => {
    const request = new Request("http://localhost/api/test", {
      headers: { "x-forwarded-for": "192.168.1.1" },
    });

    const key = getRateLimitKey(request, "user-123");

    expect(key).toBe("192.168.1.1:user-123");
  });

  it("should fallback to cf-connecting-ip header", () => {
    const request = new Request("http://localhost/api/test", {
      headers: { "cf-connecting-ip": "10.0.0.1" },
    });

    const key = getRateLimitKey(request);

    expect(key).toBe("10.0.0.1");
  });

  it("should fallback to x-real-ip header", () => {
    const request = new Request("http://localhost/api/test", {
      headers: { "x-real-ip": "172.16.0.1" },
    });

    const key = getRateLimitKey(request);

    expect(key).toBe("172.16.0.1");
  });

  it("should return 'unknown' when no IP headers present", () => {
    const request = new Request("http://localhost/api/test");

    const key = getRateLimitKey(request);

    expect(key).toBe("unknown");
  });
});
