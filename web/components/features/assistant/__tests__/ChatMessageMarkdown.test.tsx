/**
 * @vitest-environment jsdom
 *
 * Renders ChatMessage with the REAL react-markdown pipeline (unlike
 * ChatMessage.test.tsx, which mocks it) to verify assistant messages render
 * rich formatting: bold names, compact lists, links, and KaTeX math.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatMessage, type AssistantChatMessage } from "../ChatMessage";

function makeMessage(content: string): AssistantChatMessage {
  return {
    id: "m1",
    role: "assistant",
    content,
    timestamp: new Date("2026-06-09T12:00:00Z"),
  };
}

describe("ChatMessage markdown rendering", () => {
  it("renders bold business names and compact bullet lists", () => {
    const { container } = render(
      <ChatMessage
        message={makeMessage(
          "Top picks:\n\n- **Little Skewer** — 4.8★ (212 reviews) · 0.3 mi\n- **Basil And Co** — 4.7★ (673 reviews) · 0.4 mi"
        )}
      />
    );

    const bold = container.querySelectorAll("strong");
    expect(bold).toHaveLength(2);
    expect(bold[0].textContent).toBe("Little Skewer");
    expect(container.querySelectorAll("li")).toHaveLength(2);
  });

  it("renders markdown links with safe attributes", () => {
    render(
      <ChatMessage
        message={makeMessage("More on the [Discover page](/discover).")}
      />
    );

    const link = screen.getByRole("link", { name: "Discover page" });
    expect(link).toHaveAttribute("href", "/discover");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders $$-delimited LaTeX through KaTeX", () => {
    const { container } = render(
      <ChatMessage
        message={makeMessage(
          "The multiplier effect: $$\\$100 \\times 0.68 = \\$68$$ stays in your community."
        )}
      />
    );

    expect(container.querySelectorAll(".katex").length).toBeGreaterThanOrEqual(1);
  });

  it("never parses plain money amounts as math (singleDollarTextMath off)", () => {
    const { container } = render(
      <ChatMessage
        message={makeMessage("Lunch runs $12 here versus $18 at the chain.")}
      />
    );

    expect(container.querySelector(".katex")).toBeNull();
    expect(container.textContent).toContain("$12");
    expect(container.textContent).toContain("$18");
  });

  it("does not crash on malformed LaTeX (throwOnError: false)", () => {
    const { container } = render(
      <ChatMessage message={makeMessage("Broken math $$\\frac{1$$ stays text")} />
    );
    expect(container.textContent).toContain("stays text");
  });

  it("renders user messages as plain text, not markdown", () => {
    const { container } = render(
      <ChatMessage
        message={{
          id: "u1",
          role: "user",
          content: "**not bold** $x$",
          timestamp: new Date("2026-06-09T12:00:00Z"),
        }}
      />
    );
    expect(container.querySelector("strong")).toBeNull();
    expect(container.querySelector(".katex")).toBeNull();
    expect(container.textContent).toContain("**not bold**");
  });
});
