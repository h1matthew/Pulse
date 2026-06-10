/**
 * @vitest-environment jsdom
 */
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ChatWidget } from "../ChatWidget";

interface MotionDivProps {
  children?: ReactNode;
  initial?: unknown;
  animate?: unknown;
  exit?: unknown;
  transition?: unknown;
  className?: string;
}

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, className }: MotionDivProps) => (
      <div className={className}>{children}</div>
    ),
  },
}));

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <p>{children}</p>,
}));

vi.mock("@/hooks/useLocation", () => ({
  useLocation: () => ({
    location: { lat: 34.0286, lng: -117.8103 },
    error: null,
    loading: false,
    permission: "granted",
    requestLocation: vi.fn(),
    watchLocation: vi.fn(),
  }),
}));

function jsonResponse(payload: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => payload,
  } as unknown as Response;
}

const fetchMock = vi.fn();

function openWidget() {
  render(<ChatWidget />);
  fireEvent.click(
    screen.getByRole("button", { name: "Open Pulse Assistant" })
  );
}

function sendMessage(text: string) {
  fireEvent.change(
    screen.getByPlaceholderText("Ask about local businesses..."),
    { target: { value: text } }
  );
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
}

function lastFetchBody(callIndex: number): { message: string } {
  const init = fetchMock.mock.calls[callIndex][1] as RequestInit;
  return JSON.parse(init.body as string);
}

beforeEach(() => {
  vi.clearAllMocks();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe("ChatWidget", () => {
  it("renders the floating button and opens the panel", () => {
    render(<ChatWidget />);

    const openButton = screen.getByRole("button", {
      name: "Open Pulse Assistant",
    });
    expect(openButton).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(openButton);

    expect(
      screen.getByRole("dialog", { name: "Pulse Assistant" })
    ).toBeInTheDocument();
    expect(screen.getByText("Pulse Assistant")).toBeInTheDocument();
    expect(screen.getByText("Local guide")).toBeInTheDocument();
    expect(screen.getByText(/Hi there!/)).toBeInTheDocument();
  });

  it("closes the panel when Escape is pressed", () => {
    openWidget();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("sends a message and renders the assistant reply", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ text: "Here are some great coffee shops nearby." })
    );

    openWidget();
    sendMessage("Find coffee shops");

    expect(screen.getByText("Find coffee shops")).toBeInTheDocument();
    expect(
      await screen.findByText("Here are some great coffee shops nearby.")
    ).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/assistant",
      expect.objectContaining({ method: "POST" })
    );
    expect(lastFetchBody(0).message).toBe("Find coffee shops");
    // Not an error, so no degraded notice and no retry affordance
    expect(
      screen.queryByText("Quick results from the local directory")
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Try again")).not.toBeInTheDocument();
  });

  it("disables the input while a request is in flight", async () => {
    let resolveFetch: (value: Response) => void = () => {};
    fetchMock.mockImplementationOnce(
      () => new Promise<Response>((resolve) => (resolveFetch = resolve))
    );

    openWidget();
    sendMessage("Anything open late?");

    const input = screen.getByPlaceholderText(
      "Ask about local businesses..."
    );
    await waitFor(() => expect(input).toBeDisabled());
    expect(screen.getByText("Thinking...")).toBeInTheDocument();

    resolveFetch(jsonResponse({ text: "A few places are open late." }));

    expect(
      await screen.findByText("A few places are open late.")
    ).toBeInTheDocument();
    expect(input).not.toBeDisabled();
    expect(screen.queryByText("Thinking...")).not.toBeInTheDocument();
  });

  it("shows the directory notice for degraded responses without an error state", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        text: "Top rated: Mil Jugos, Banh Mi Che Cali.",
        degraded: true,
      })
    );

    openWidget();
    sendMessage("Best restaurants?");

    expect(
      await screen.findByText("Quick results from the local directory")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Top rated: Mil Jugos, Banh Mi Che Cali.")
    ).toBeInTheDocument();
    // Degraded is informational, not an error
    expect(screen.queryByText("Try again")).not.toBeInTheDocument();
    expect(screen.queryByText(/couldn't reach the assistant/)).not.toBeInTheDocument();
  });

  it("shows a retry affordance on fetch failure and resends the last message", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(jsonResponse({ text: "Back online. Here you go." }));

    openWidget();
    sendMessage("Find tacos");

    const retryButton = await screen.findByRole("button", {
      name: /Try again/,
    });
    expect(
      screen.getByText(/couldn't reach the assistant/)
    ).toBeInTheDocument();

    fireEvent.click(retryButton);

    expect(
      await screen.findByText("Back online. Here you go.")
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(lastFetchBody(0).message).toBe("Find tacos");
    expect(lastFetchBody(1).message).toBe("Find tacos");
  });

  it("treats a non-ok response as a failure with retry", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "boom" }, false));

    openWidget();
    sendMessage("Hello");

    expect(
      await screen.findByRole("button", { name: /Try again/ })
    ).toBeInTheDocument();
  });

  it("sends a suggestion chip's text directly when clicked", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          text: "I can help with that.",
          suggestions: ["Show me coffee shops", "What deals are active?"],
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({ text: "Here are the coffee shops." })
      );

    openWidget();
    sendMessage("Help me explore");

    const chip = await screen.findByRole("button", {
      name: "Show me coffee shops",
    });
    expect(
      screen.getByRole("button", { name: "What deals are active?" })
    ).toBeInTheDocument();

    fireEvent.click(chip);

    expect(
      await screen.findByText("Here are the coffee shops.")
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(lastFetchBody(1).message).toBe("Show me coffee shops");
  });

  it("clears the conversation back to the welcome message", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ text: "Sure thing." }));

    openWidget();
    sendMessage("Hi");
    expect(await screen.findByText("Sure thing.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(screen.queryByText("Sure thing.")).not.toBeInTheDocument();
    expect(screen.getByText(/Hi there!/)).toBeInTheDocument();
  });
});
