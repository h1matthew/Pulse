/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatMessage, type AssistantChatMessage } from "../ChatMessage";

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <p>{children}</p>,
}));

function makeMessage(
  overrides: Partial<AssistantChatMessage> = {}
): AssistantChatMessage {
  return {
    id: "m1",
    role: "assistant",
    content: "Hello from the assistant",
    timestamp: new Date("2026-06-09T12:00:00Z"),
    ...overrides,
  };
}

describe("ChatMessage", () => {
  it("aligns user messages right in a primary bubble", () => {
    render(
      <ChatMessage
        message={makeMessage({ role: "user", content: "Find pizza" })}
      />
    );

    const bubble = screen.getByText("Find pizza").closest("div");
    expect(bubble).toHaveClass("bg-primary");
    expect(bubble).toHaveClass("text-primary-foreground");
    expect(bubble).toHaveClass("max-w-[85%]");
    expect(bubble?.parentElement).toHaveClass("justify-end");
  });

  it("aligns assistant messages left in a bordered secondary bubble", () => {
    render(<ChatMessage message={makeMessage()} />);

    const bubble = screen
      .getByText("Hello from the assistant")
      .closest("div");
    expect(bubble).toHaveClass("bg-secondary");
    expect(bubble).toHaveClass("border-border");
    expect(bubble?.parentElement).toHaveClass("justify-start");
  });

  it("shows the directory notice on degraded messages", () => {
    render(<ChatMessage message={makeMessage({ degraded: true })} />);

    expect(
      screen.getByText("Quick results from the local directory")
    ).toBeInTheDocument();
  });

  it("hides the directory notice on normal messages", () => {
    render(<ChatMessage message={makeMessage()} />);

    expect(
      screen.queryByText("Quick results from the local directory")
    ).not.toBeInTheDocument();
  });

  it("renders a Try again button on error messages and calls onRetry", () => {
    const onRetry = vi.fn();
    render(
      <ChatMessage
        message={makeMessage({
          error: true,
          content: "I couldn't reach the assistant just now.",
        })}
        onRetry={onRetry}
      />
    );

    const retry = screen.getByRole("button", { name: /Try again/ });
    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("does not render Try again without an onRetry handler", () => {
    render(<ChatMessage message={makeMessage({ error: true })} />);

    expect(
      screen.queryByRole("button", { name: /Try again/ })
    ).not.toBeInTheDocument();
  });
});
