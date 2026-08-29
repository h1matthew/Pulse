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
  it("renders the tab strip and a mono data line instead of an eyebrow", async () => {
    render(<FeatureTabs />);

    expect(screen.getByRole("button", { name: "Find" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deals" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Impact" })).toBeInTheDocument();
    // Header line carries data, not a kicker label
    expect(screen.getByText(/San Antonio · Open now first, then best rated/)).toBeInTheDocument();
    expect(screen.queryByText("Local snapshot")).not.toBeInTheDocument();
    expect(screen.queryByText("Nearby places")).not.toBeInTheDocument();
  });

  it("renders no heading above the listing feed", () => {
    render(<FeatureTabs />);

    expect(screen.queryAllByRole("heading")).toHaveLength(0);
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

    // Meta line: category, neighborhood, price, hours — in that fixed order
    expect(screen.getAllByText("Food & Drink · Open now").length).toBe(3);
    // Distance sits on the name line, in mono
    expect(screen.getAllByText("1.2 mi").length).toBe(3);
    // Rating value rendered
    expect(screen.getByText("4.8")).toBeInTheDocument();
  });

  it("leads each row with the rating numeral", async () => {
    const { container } = render(<FeatureTabs />);

    await waitFor(() => expect(screen.getByText("Open Coffee")).toBeInTheDocument());

    const row = screen.getByText("Open Coffee").closest("article");
    expect(row).not.toBeNull();
    expect(row?.firstElementChild).toHaveTextContent("4.8");
    expect(row?.firstElementChild).toHaveClass("font-mono");
    // Actions come last and are the smallest text on the row
    expect(container.querySelectorAll("article a")[1]).toHaveTextContent("Details");
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

  it("marks bookmarked rows with a filled icon and a Saved label", async () => {
    mockIsBookmarked.mockImplementation((id: string) => id === "open-a");
    render(<FeatureTabs />);

    await waitFor(() => expect(screen.getByText("Open Coffee")).toBeInTheDocument());

    const bookmarkedButton = screen.getByRole("button", {
      name: "Remove bookmark for Open Coffee",
    });
    // Accent stays off listing rows — the filled state uses the foreground token
    expect(bookmarkedButton.querySelector("svg")).toHaveClass("fill-foreground");
    expect(bookmarkedButton).toHaveTextContent("Saved");

    const plainButton = screen.getByRole("button", { name: "Bookmark Open Bakery" });
    expect(plainButton.querySelector("svg")).not.toHaveClass("fill-foreground");
    expect(plainButton.querySelector("svg")).toHaveClass("text-muted-foreground");
    expect(plainButton).toHaveTextContent("Save");
  });

  it("links the header bookmark icon to the bookmarks page", () => {
    render(<FeatureTabs />);

    const headerLink = screen.getByRole("link", { name: "View saved places" });
    expect(headerLink).toHaveAttribute("href", "/bookmarks");
  });

  it("labels the Deals and Impact tabs as samples rather than the reader's own data", async () => {
    render(<FeatureTabs />);

    fireEvent.click(screen.getByRole("button", { name: "Deals" }));
    expect(screen.getByText("Weeknight bento")).toBeInTheDocument();
    expect(screen.getByText(/Sample rows · live offers on \/deals/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Impact" }));
    expect(screen.getByText("Kept local")).toBeInTheDocument();
    expect(screen.getByText(/Sample figures · sign in for yours/)).toBeInTheDocument();

    // Back to Find: live rows return
    fireEvent.click(screen.getByRole("button", { name: "Find" }));
    await waitFor(() => expect(screen.getByText("Open Coffee")).toBeInTheDocument());
  });
});
