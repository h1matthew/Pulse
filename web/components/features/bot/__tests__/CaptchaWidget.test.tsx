import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CaptchaWidget } from "../CaptchaWidget";

describe("CaptchaWidget", () => {
  it("renders local captcha controls", () => {
    render(<CaptchaWidget onVerify={vi.fn()} />);

    expect(screen.getByText("Local CAPTCHA")).toBeInTheDocument();
    expect(screen.getByLabelText("I am not a robot")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verify" })).toBeDisabled();
  });

  it("verifies after checkbox is checked", async () => {
    const onVerify = vi.fn();
    render(<CaptchaWidget onVerify={onVerify} />);

    fireEvent.click(screen.getByLabelText("I am not a robot"));
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    await waitFor(() => {
      expect(onVerify).toHaveBeenCalledWith("demo-local-token");
    });
  });
});
