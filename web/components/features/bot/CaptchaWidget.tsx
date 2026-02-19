"use client";

import { useState } from "react";

interface CaptchaWidgetProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  action?: string;
  className?: string;
}

/**
 * Local-only CAPTCHA used for demos/dev.
 * It intentionally avoids external CAPTCHA providers so login cannot fail
 * due to third-party script/network issues.
 */
export function CaptchaWidget({ onVerify, className }: CaptchaWidgetProps) {
  const [checked, setChecked] = useState(false);

  return (
    <div className={className}>
      <div className="rounded-md border border-border bg-muted/30 p-3 space-y-3">
        <p className="text-sm font-medium">Local CAPTCHA</p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          I am not a robot
        </label>
        <button
          type="button"
          disabled={!checked}
          onClick={() => onVerify("demo-local-token")}
          className="w-full rounded-md border border-border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 hover:bg-muted"
        >
          Verify
        </button>
      </div>
    </div>
  );
}
