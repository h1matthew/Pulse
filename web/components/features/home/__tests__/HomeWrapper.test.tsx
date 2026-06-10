/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { HomeWrapper } from "../HomeWrapper";

describe("HomeWrapper", () => {
  it("renders the landing surface against the light theme tokens", () => {
    render(
      <HomeWrapper>
        <div>Landing content</div>
      </HomeWrapper>
    );

    const wrapper = screen.getByText("Landing content").parentElement;
    // The homepage follows the app's light theme via semantic tokens — no
    // forced `dark` class, and no opaque background (the root layout's
    // shared AppBackground must show through).
    expect(wrapper).not.toHaveClass("bg-background");
    expect(wrapper).toHaveClass("text-foreground");
    expect(wrapper).not.toHaveClass("dark");
  });
});
