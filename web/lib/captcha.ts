/**
 * ============================================================================
 * CAPTCHA Verification — Bot Prevention
 * ============================================================================
 *
 * USER JOURNEY:
 *   1. User fills out a review form → CaptchaWidget renders an invisible
 *      challenge (Cloudflare Turnstile in production, auto-pass in dev)
 *   2. On form submit, the CAPTCHA token is sent alongside the review payload
 *   3. Server calls verifyCaptcha() → validates token with Turnstile API
 *   4. If verification fails → 400 response; client shows "CAPTCHA failed" toast
 *   5. If verification passes → review creation continues normally
 *
 * DESIGN RATIONALE:
 *   - Invisible challenge (Turnstile managed mode) avoids friction for real users
 *   - Demo bypass tokens allow local development without a Turnstile site key
 *   - Provider auto-detection: "local" in NODE_ENV=development, "turnstile" in prod
 *   - withCaptchaVerification() HOF allows any API route to add CAPTCHA in one line
 *
 * ACCESSIBILITY:
 *   - Turnstile widget is accessible by default (keyboard-navigable, screen-reader labels)
 *   - Error messages are descriptive ("CAPTCHA verification failed") for aria-live regions
 *
 * INPUT VALIDATION:
 *   - Token must be a non-empty string (captchaTokenSchema in validation.ts)
 *   - Server-side only — token is never trusted from the client without verification
 * ============================================================================
 */

interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

/**
 * Get Turnstile secret key (read dynamically for testability)
 */
function getTurnstileSecretKey(): string | undefined {
  return process.env.TURNSTILE_SECRET_KEY;
}

function getCaptchaProvider(): "local" | "mcaptcha" | "turnstile" {
  const provider = process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER?.toLowerCase();
  if (provider === "local" || provider === "mcaptcha" || provider === "turnstile") {
    return provider;
  }
  return process.env.NODE_ENV === "development" ? "local" : "turnstile";
}

/**
 * Verify a Turnstile CAPTCHA token
 * @param token The token from the client-side widget
 * @returns Object with success boolean and optional error message
 */
export async function verifyCaptcha(
  token: string
): Promise<{ success: boolean; error?: string }> {
  const provider = getCaptchaProvider();
  const isDemoToken =
    token === "dev-mode-token" ||
    token === "demo-bypass-token" ||
    token === "demo-local-token";

  if (provider !== "turnstile") {
    if (!token || token.trim().length === 0) {
      return { success: false, error: "Please complete the CAPTCHA" };
    }
    return { success: true };
  }

  // In development, allow demo/local tokens even when turnstile provider is configured.
  if (process.env.NODE_ENV === "development" && isDemoToken) {
    return { success: true };
  }

  const secretKey = getTurnstileSecretKey();

  if (!secretKey) {
    console.warn("Turnstile secret key not configured");
    // Fail open in development for testing
    if (process.env.NODE_ENV === "development") {
      return { success: true };
    }
    return { success: false, error: "CAPTCHA not configured" };
  }

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret: secretKey,
          response: token,
        }),
      }
    );

    if (!response.ok) {
      return { success: false, error: "Failed to verify CAPTCHA" };
    }

    const data: TurnstileVerifyResponse = await response.json();

    if (data.success) {
      return { success: true };
    }

    const errorCode = data["error-codes"]?.[0] || "unknown-error";
    const errorMessages: Record<string, string> = {
      "missing-input-secret": "CAPTCHA configuration error",
      "invalid-input-secret": "CAPTCHA configuration error",
      "missing-input-response": "Please complete the CAPTCHA",
      "invalid-input-response": "CAPTCHA verification failed",
      "bad-request": "Invalid CAPTCHA request",
      "timeout-or-duplicate": "CAPTCHA expired, please try again",
      "internal-error": "CAPTCHA service error",
    };

    return {
      success: false,
      error: errorMessages[errorCode] || "CAPTCHA verification failed",
    };
  } catch (error) {
    console.error("CAPTCHA verification error:", error);
    return { success: false, error: "Failed to verify CAPTCHA" };
  }
}

/**
 * Higher-order function to add CAPTCHA verification to API routes
 * @param handler The original route handler
 * @returns Wrapped handler with CAPTCHA verification
 */
export function withCaptchaVerification<
  T extends (req: Request, ...args: unknown[]) => Promise<Response>
>(handler: T): T {
  return (async (req: Request, ...args: unknown[]) => {
    // Only verify for POST, PUT, PATCH, DELETE methods
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      return handler(req, ...args);
    }

    try {
      const body = await req.clone().json();

      if (!body.captchaToken) {
        return new Response(
          JSON.stringify({ error: "CAPTCHA token required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const { success, error } = await verifyCaptcha(body.captchaToken);

      if (!success) {
        return new Response(
          JSON.stringify({ error: error || "CAPTCHA verification failed" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Remove captchaToken from body before passing to handler
      const { captchaToken, ...restBody } = body;
      const modifiedReq = new Request(req.url, {
        method: req.method,
        headers: req.headers,
        body: JSON.stringify(restBody),
      });

      return handler(modifiedReq, ...args);
    } catch {
      // If body parsing fails, continue to handler
      return handler(req, ...args);
    }
  }) as T;
}

/**
 * Rate limiting key generator for CAPTCHA-protected endpoints
 * Combines IP address with user ID if available
 */
export function getRateLimitKey(
  request: Request,
  userId?: string
): string {
  // Get IP from various headers (works with most hosting providers)
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (userId) {
    return `${ip}:${userId}`;
  }

  return ip;
}
