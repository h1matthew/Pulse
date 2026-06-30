/**
 * @vitest-environment jsdom
 */
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockUseNearby = vi.fn();
const mockGetCachedLocation = vi.fn();
const mockMutateAsync = vi.fn();
const mockIsBookmarked = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

// NavLink relies on the Next router, which isn't mounted in unit tests.
vi.mock("@/components/ui/nav-link", () => ({
  NavLink: ({
    children,
    href,
    ...props
  }: { children: ReactNode; href: string } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/hooks/useBusinesses", () => ({
  useNearbyBusinesses: (...args: unknown[]) => mockUseNearby(...args),
}));

vi.mock("@/hooks/useLocation", () => ({
  // Deterministic distance/format helpers
  calculateDistance: () => 1.2,
  formatDistance: (mi: number) => `${mi} mi`,
}));

vi.mock("@/lib/location", () => ({
  getCachedLocation: () => mockGetCachedLocation(),
}));

// Deterministic open-now: businesses tagged "OPEN" in their hours are open.
vi.mock("@/lib/business/hours", () => ({
  isOpenNow: (hours: unknown) =>
    Array.isArray(hours) && hours.includes("OPEN") ? true : false,
}));

vi.mock("@/hooks/useBookmarks", () => ({
  useIsBookmarked: (businessId: string) => ({ data: mockIsBookmarked(businessId) }),
  useToggleBookmark: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

import { FeatureTabs } from "../FeatureTabs";

interface Row {
  id: string;
  name: string;
  average_rating: number;
  review_count: number;
  latitude: number;
  longitude: number;
  hours: string[];
  category: { name: string; slug: string };
}

function biz(overrides: Partial<Row>): Row {
  return {
    id: Math.random().toString(36),
    name: "Test",
    average_rating: 4.5,
    review_count: 100,
    latitude: 34.03,
    longitude: -117.81,
    hours: ["OPEN"],
    category: { name: "Food & Drink", slug: "food-drink" },
    ...overrides,
  };
}

const ROWS: Row[] = [
  // Highest rated of all, but currently CLOSED — open places must outrank it
  biz({ id: "closed-gem", name: "Closed Gem", average_rating: 4.9, review_count: 900, hours: [] }),
  biz({ id: "open-a", name: "Open Coffee", average_rating: 4.8, review_count: 120 }),
  biz({ id: "open-b", name: "Open Bakery", average_rating: 4.6, review_count: 80 }),
  biz({ id: "open-c", name: "Open Books", average_rating: 4.5, review_count: 40 }),
];

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCachedLocation.mockReturnValue(null);
  mockUseNearby.mockReturnValue({ data: ROWS, isLoading: false });
  mockIsBookmarked.mockReturnValue(false);
  mockMutateAsync.mockResolvedValue({ bookmarked: true, local: true });
});

describe("FeatureTabs", () => {
  it("renders a concise local snapshot with simple actions", async () => {
    render(<FeatureTabs />);

    expect(screen.getByText("Today nearby")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Find" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deals" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Impact" })).toBeInTheDocument();
    expect(screen.getByText("Open now, well reviewed, close by.")).toBeInTheDocument();
  });

  it("does not use AI-style explanatory copy", () => {
    render(<FeatureTabs />);

    expect(screen.queryByText(/let AI match/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/recommendation engine/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/CAPTCHA/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Boost Missions/i)).not.toBeInTheDocument();
  });

  it("shows skeleton rows while nearby businesses load", () => {
    mockUseNearby.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<FeatureTabs />);

    expect(screen.getByTestId("find-rows-skeleton")).toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders real nearby businesses, open ones first by rating", async () => {
    render(<FeatureTabs />);

    await waitFor(() => expect(screen.getByText("Open Coffee")).toBeInTheDocument());
    expect(screen.getByText("Open Bakery")).toBeInTheDocument();
    expect(screen.getByText("Open Books")).toBeInTheDocument();
    // Highest rated overall, but closed — three open places outrank it
    expect(screen.queryByText("Closed Gem")).not.toBeInTheDocument();

    // Meta line: category + distance against the effective location
    expect(screen.getAllByText("Food & Drink · 1.2 mi").length).toBe(3);
    // Rating value rendered
    expect(screen.getByText("4.8")).toBeInTheDocument();
  });

  it("fills with the highest-rated remaining places when fewer than 3 are open", async () => {
    mockUseNearby.mockReturnValue({
      data: [
        biz({ id: "only-open", name: "Only Open", average_rating: 4.0 }),
        biz({ id: "closed-1", name: "Closed High", average_rating: 4.9, hours: [] }),
        biz({ id: "closed-2", name: "Closed Mid", average_rating: 4.4, hours: [] }),
        biz({ id: "closed-3", name: "Closed Low", average_rating: 3.2, hours: [] }),
      ],
      isLoading: false,
    });
    render(<FeatureTabs />);

    await waitFor(() => expect(screen.getByText("Only Open")).toBeInTheDocument());
    expect(screen.getByText("Closed High")).toBeInTheDocument();
    expect(screen.getByText("Closed Mid")).toBeInTheDocument();
    expect(screen.queryByText("Closed Low")).not.toBeInTheDocument();
  });

  it("links each row to its business detail page", async () => {
    render(<FeatureTabs />);

    await waitFor(() => expect(screen.getByText("Open Coffee")).toBeInTheDocument());
    const link = screen.getByText("Open Coffee").closest("a");
    expect(link).toHaveAttribute("href", "/business/open-a");
  });

  it("saves a guest bookmark on-device and shows the on-device toast", async () => {
    render(<FeatureTabs />);

    await waitFor(() => expect(screen.getByText("Open Coffee")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Bookmark Open Coffee" }));

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith({
        businessId: "open-a",
        isBookmarked: false,
      })
    );
    await waitFor(() =>
      expect(mockToastSuccess).toHaveBeenCalledWith("Saved on this device", {
        description: "Sign in to sync bookmarks across devices.",
      })
    );
  });

  it("shows the on-device removal toast when a guest un-bookmarks", async () => {
    mockIsBookmarked.mockImplementation((id: string) => id === "open-a");
    mockMutateAsync.mockResolvedValue({ bookmarked: false, local: true });
    render(<FeatureTabs />);

    await waitFor(() => expect(screen.getByText("Open Coffee")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Remove bookmark for Open Coffee" }));

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith({
        businessId: "open-a",
        isBookmarked: true,
      })
    );
    await waitFor(() =>
      expect(mockToastSuccess).toHaveBeenCalledWith("Removed from this device", {
        description: "Sign in to sync bookmarks across devices.",
      })
    );
  });

  it("shows the server toast for signed-in bookmarks", async () => {
    mockMutateAsync.mockResolvedValue({ bookmarked: true, local: false });
    render(<FeatureTabs />);

    await waitFor(() => expect(screen.getByText("Open Coffee")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Bookmark Open Coffee" }));

    await waitFor(() =>
      expect(mockToastSuccess).toHaveBeenCalledWith("Business bookmarked")
    );
  });

  it("shows an error toast when the bookmark toggle fails", async () => {
    mockMutateAsync.mockRejectedValue(new Error("nope"));
    render(<FeatureTabs />);

    await waitFor(() => expect(screen.getByText("Open Coffee")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Bookmark Open Coffee" }));

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith("Failed to update bookmark")
    );
  });

  it("renders a filled bookmark icon for bookmarked rows", async () => {
    mockIsBookmarked.mockImplementation((id: string) => id === "open-a");
    render(<FeatureTabs />);

    await waitFor(() => expect(screen.getByText("Open Coffee")).toBeInTheDocument());

    const bookmarkedButton = screen.getByRole("button", {
      name: "Remove bookmark for Open Coffee",
    });
    expect(bookmarkedButton.querySelector("svg")).toHaveClass("fill-primary");

    const plainButton = screen.getByRole("button", { name: "Bookmark Open Bakery" });
    expect(plainButton.querySelector("svg")).not.toHaveClass("fill-primary");
    expect(plainButton.querySelector("svg")).toHaveClass("text-muted-foreground");
  });

  it("links the header bookmark icon to the bookmarks page", () => {
    render(<FeatureTabs />);

    const headerLink = screen.getByRole("link", { name: "View saved places" });
    expect(headerLink).toHaveAttribute("href", "/bookmarks");
  });

  it("keeps the Deals and Impact tabs as static explainers", async () => {
    render(<FeatureTabs />);

    fireEvent.click(screen.getByRole("button", { name: "Deals" }));
    expect(screen.getByText("Deals without the hunt.")).toBeInTheDocument();
    expect(screen.getByText("Weeknight bento")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Impact" }));
    expect(screen.getByText("A simple local record.")).toBeInTheDocument();
    expect(screen.getByText("Kept local")).toBeInTheDocument();

    // Back to Find: live rows return
    fireEvent.click(screen.getByRole("button", { name: "Find" }));
    await waitFor(() => expect(screen.getByText("Open Coffee")).toBeInTheDocument());
  });
});
