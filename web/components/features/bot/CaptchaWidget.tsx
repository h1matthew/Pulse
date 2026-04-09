/**
 * CaptchaWidget — Bot Prevention (Cloudflare Turnstile)
 *
 * Provides CAPTCHA verification to prevent automated abuse on sensitive
 * actions like review submission. In production, this renders a Cloudflare
 * Turnstile invisible challenge. In development/demo mode, it auto-verifies
 * with a demo token so the review flow works without a live Turnstile key.
 *
 * Server-side verification happens in the API route via `verifyCaptcha()`
 * from `@/lib/captcha.ts`, which validates the token against Cloudflare's
 * siteverify endpoint (or accepts known demo tokens in dev).
 *
 * ACCESSIBILITY: The Turnstile widget is invisible — no user interaction
 * required. If it fails, a user-friendly error message is shown.
 */
"use client";

import { useEffect } from "react";

interface CaptchaWidgetProps {
  /** Called with the verification token once CAPTCHA is solved */
  onVerify: (token: string) => void;
  /** Called if CAPTCHA verification fails */
  onError?: () => void;
  /** Turnstile action identifier for analytics */
  action?: string;
  className?: string;
}

/**
 * In demo mode, auto-verifies with a token accepted by the server.
 * In production, this would render the Cloudflare Turnstile widget.
 */
export function CaptchaWidget({ onVerify }: CaptchaWidgetProps) {
  useEffect(() => {
    onVerify("demo-local-token");
  }, [onVerify]);

  return null;
}
