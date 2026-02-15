import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { CaptchaWidget } from "../CaptchaWidget";

// Mock environment variables
const originalEnv = process.env;

describe("CaptchaWidget", () => {
  const mockOnVerify = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should show loading state initially", () => {
    render(
      <CaptchaWidget onVerify={mockOnVerify} action="test-action" />
    );

    expect(screen.getByText("Verifying...")).toBeInTheDocument();
  });

  it("should call onVerify in development mode without site key", async () => {
    process.env.NODE_ENV = "development";
    delete (process as { env: Record<string, string> }).env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

    render(
      <CaptchaWidget onVerify={mockOnVerify} action="test-action" />
    );

    await waitFor(() => {
      expect(mockOnVerify).toHaveBeenCalledWith("dev-mode-token");
    });
  });

  it("should render widget container when site key is configured", () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "test-site-key";

    // Mock turnstile
    (window as unknown as { turnstile?: { render: ReturnType<typeof vi.fn> } }).turnstile = {
      render: vi.fn().mockReturnValue("widget-id"),
    };

    render(
      <CaptchaWidget onVerify={mockOnVerify} action="test-action" />
    );

    expect(screen.getByTestId("turnstile-widget")).toBeInTheDocument();
  });

  it("should call onError when verification fails", async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "test-site-key";

    // Mock turnstile to trigger error immediately
    (window as unknown as { turnstile: { render: ReturnType<typeof vi.fn> } }).turnstile = {
      render: vi.fn().mockImplementation((_, options) => {
        // Trigger error callback synchronously
        options["error-callback"]?.();
        return "widget-id";
      }),
    };

    render(
      <CaptchaWidget
        onVerify={mockOnVerify}
        onError={mockOnError}
        action="test-action"
      />
    );

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalled();
    });

    expect(screen.getByText("Verification failed. Please try again.")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });
});
