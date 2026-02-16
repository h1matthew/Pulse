"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface CaptchaWidgetProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  action?: string;
  className?: string;
}

// Cloudflare Turnstile site key
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

// Track if script is loading/loaded
let scriptLoading = false;
let scriptLoaded = false;
const callbacks: (() => void)[] = [];

/**
 * Lazily load the Cloudflare Turnstile script into the document head.
 * Deduplicates concurrent calls — only one script tag is ever created.
 * Resolves once the script's onload event fires.
 */
function loadTurnstileScript(): Promise<void> {
  return new Promise((resolve) => {
    if (scriptLoaded) {
      resolve();
      return;
    }

    callbacks.push(resolve);

    if (scriptLoading) {
      return;
    }

    scriptLoading = true;

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      scriptLoaded = true;
      callbacks.forEach((cb) => cb());
      callbacks.length = 0;
    };

    document.head.appendChild(script);
  });
}

/**
 * Cloudflare Turnstile CAPTCHA Widget
 * Invisible by default - most users won't see a challenge
 */
export function CaptchaWidget({
  onVerify,
  onError,
  action = "default",
  className,
}: CaptchaWidgetProps) {
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) {
      console.warn("Turnstile site key not configured");
      // In development, auto-verify if no key is set
      if (process.env.NODE_ENV === "development") {
        onVerify("dev-mode-token");
        setIsLoading(false);
      } else {
        setHasError(true);
        onError?.();
      }
      return;
    }

    const initTurnstile = async () => {
      try {
        await loadTurnstileScript();

        if (!widgetRef.current || !(window as unknown as { turnstile?: TurnstileAPI }).turnstile) {
          return;
        }

        const turnstile = (window as unknown as { turnstile: TurnstileAPI }).turnstile;

        widgetIdRef.current = turnstile.render(widgetRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          action,
          callback: (token: string) => {
            setIsLoading(false);
            onVerify(token);
          },
          "error-callback": () => {
            setIsLoading(false);
            setHasError(true);
            onError?.();
          },
          "expired-callback": () => {
            // Token expired, reset
            setIsLoading(true);
          },
        });
      } catch {
        setIsLoading(false);
        setHasError(true);
        onError?.();
      }
    };

    initTurnstile();

    return () => {
      if (widgetIdRef.current && (window as unknown as { turnstile?: TurnstileAPI }).turnstile) {
        (window as unknown as { turnstile: TurnstileAPI }).turnstile.remove(widgetIdRef.current);
      }
    };
  }, [action, onVerify, onError]);

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    if (widgetIdRef.current && (window as unknown as { turnstile?: TurnstileAPI }).turnstile) {
      (window as unknown as { turnstile: TurnstileAPI }).turnstile.reset(widgetIdRef.current);
    }
  };

  return (
    <div className={className}>
      {isLoading && (
        <div className="flex items-center justify-center py-4 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Verifying...</span>
        </div>
      )}

      {hasError && (
        <div className="text-center py-4">
          <p className="text-sm text-destructive mb-2">
            Verification failed. Please try again.
          </p>
          <button
            onClick={handleRetry}
            className="text-sm text-primary hover:underline"
            type="button"
          >
            Retry
          </button>
        </div>
      )}

      <div
        ref={widgetRef}
        className={isLoading || hasError ? "hidden" : ""}
        data-testid="turnstile-widget"
      />
    </div>
  );
}

// Type definitions for Turnstile
type TurnstileAPI = {
  render: (
    container: HTMLElement,
    options: TurnstileOptions
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

interface TurnstileOptions {
  sitekey: string;
  action?: string;
  callback?: (token: string) => void;
  "error-callback"?: () => void;
  "expired-callback"?: () => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact";
}
