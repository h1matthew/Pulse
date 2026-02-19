"use client";

import { useEffect } from "react";

interface CaptchaWidgetProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  action?: string;
  className?: string;
}

/**
 * Backwards-compatible no-op widget:
 * old pages may still mount this component and expect an onVerify token.
 * We auto-verify silently and render nothing.
 */
export function CaptchaWidget({ onVerify }: CaptchaWidgetProps) {
  useEffect(() => {
    onVerify("demo-local-token");
  }, [onVerify]);

  return null;
}
