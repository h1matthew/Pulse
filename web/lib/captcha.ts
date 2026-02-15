/**
 * CAPTCHA verification utilities
 * Uses Cloudflare Turnstile for bot protection
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

/**
 * Verify a Turnstile CAPTCHA token
 * @param token The token from the client-side widget
 * @returns Object with success boolean and optional error message
 */
export async function verifyCaptcha(
  token: string
): Promise<{ success: boolean; error?: string }> {
  // In development, allow dev mode token
  if (process.env.NODE_ENV === "development" && token === "dev-mode-token") {
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
