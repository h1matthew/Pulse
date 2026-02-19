import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { CaptchaWidget } from "../CaptchaWidget";

describe("CaptchaWidget", () => {
  it("auto-verifies silently", async () => {
    const onVerify = vi.fn();
    const { container } = render(<CaptchaWidget onVerify={onVerify} />);
    expect(container).toBeEmptyDOMElement();

    await waitFor(() => {
      expect(onVerify).toHaveBeenCalledWith("demo-local-token");
    });
  });
});
