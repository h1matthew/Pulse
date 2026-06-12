/**
 * @vitest-environment jsdom
 */
import React, { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { toast } from "sonner";
import DiscoverPage from "../page";
import type { BusinessWithCategory } from "@/types/business";

const { mockToggleBookmark } = vi.hoisted(() => ({
  mockToggleBookmark: vi.fn(),
}));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    matches: false,
    media: "",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn();
}

Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: MockIntersectionObserver,
});

vi.mock("@/components/layout/Header", () => ({
  Header: () => <header data-testid="header">Header</header>,
}));

vi.mock("@/components/ui/nav-link", () => ({
  NavLink: ({ children, href, className }: { children: ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/features/discover/LocationPrompt", () => ({
  LocationPrompt: () => <div data-testid="location-prompt" />,
}));

vi.mock("@/components/features/discover/ChangeLocationDialog", () => ({
  ChangeLocationDialog: () => null,
}));

vi.mock("@/hooks/useLocation", () => ({
  useLocation: () => ({
    location: null,
    loading: false,
    error: null,
    requestLocation: vi.fn(),
    permission: "prompt",
  }),
  calculateDistance: () => 1200,
  formatDistance: () => "1.2 km",
}));

vi.mock("@/lib/location", () => ({
  getCachedLocation: () => ({ lat: 34.0286, lng: -117.8208 }),
  getCachedLocationSource: () => ({ source: "zip", label: "Diamond Bar" }),
  geocodeZipCode: vi.fn(),
  getLocationSuggestions: vi.fn(async () => []),
  resolveLocationByPlaceId: vi.fn(async () => null),
  cacheLocation: vi.fn(),
  cacheLocationSource: vi.fn(),
}));

vi.mock("@/hooks/useBusinesses", () => ({
  useNearbyBusinesses: () => ({
    data: mockBusinesses,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/useBookmarks", () => ({
  useBookmarkedIds: () => ({ data: ["business-2"] }),
  useIsBookmarked: () => ({ data: false }),
  useToggleBookmark: () => ({ mutateAsync: mockToggleBookmark, isPending: false }),
}));

let mockAuthUserId: string | null = null;
vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: () => ({
    user: mockAuthUserId ? { id: mockAuthUserId } : null,
    userId: mockAuthUserId,
    isLoggedIn: !!mockAuthUserId,
    loading: false,
  }),
}));

// Started missions surfaced as a context banner when their category matches
let mockStartedMissions: unknown[] = [];
vi.mock("@/hooks/useMissions", () => ({
  useMissionProgressDetails: () => ({
    activeMissions: mockStartedMissions,
    completedMissions: [],
    claimedMissions: [],
    isLoading: false,
  }),
}));

// Deterministic open-now: driven entirely by the mock data, never wall-clock.
// Hours containing the marker "OPEN" => open, "CLOSED" => closed, else unknown.
vi.mock("@/lib/business/hours", () => ({
  isOpenNow: (hours: unknown) => {
    const serialized = JSON.stringify(hours ?? null);
    if (serialized.includes("OPEN")) return true;
    if (serialized.includes("CLOSED")) return false;
    return null;
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

function makeBaseBusinesses(): BusinessWithCategory[] {
  return [
  {
    id: "business-1",
    name: "H Mart Diamond Bar",
    slug: "h-mart-diamond-bar",
    category_id: "cat-1",
    description: "Fresh grocery and prepared food.",
    short_description: "Asian grocery and food court.",
    address: "2825 S Diamond Bar Blvd",
    city: "Diamond Bar",
    state: "CA",
    zip_code: "91765",
    phone: null,
    email: null,
    website: null,
    latitude: 34.028,
    longitude: -117.82,
    hours: { monday: "OPEN" },
    photos: [],
    logo_url: null,
    owner_id: null,
    is_verified: true,
    is_featured: true,
    price_range: 2,
    tags: ["grocery", "food"],
    amenities: [],
    average_rating: 4.6,
    review_count: 312,
    is_chain: true,
    sba_certified: false,
    bookmark_count: 10,
    place_id: "place-1",
    data_source: "google",
    last_synced_at: null,
    sync_status: "active",
    claimed_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ai_description: null,
    ai_description_generated_at: null,
    ai_description_source: null,
    editorial_summary: null,
    ai_business_summary: null,
    category: {
      id: "cat-1",
      slug: "food-drink",
      name: "Food & Drink",
      description: null,
      icon: "",
      color: "",
      sort_order: 1,
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
    },
  },
  {
    id: "business-2",
    name: "Pinpoint Lanes",
    slug: "pinpoint-lanes",
    category_id: "cat-2",
    description: "Bowling, arcade games, and karaoke.",
    short_description: "Games and bowling.",
    address: "1600 S Azusa Ave",
    city: "City of Industry",
    state: "CA",
    zip_code: "91748",
    phone: null,
    email: null,
    website: null,
    latitude: 34.03,
    longitude: -117.91,
    hours: { monday: "CLOSED" },
    photos: [],
    logo_url: null,
    owner_id: null,
    is_verified: false,
    is_featured: false,
    price_range: 1,
    tags: ["arcade", "bowling"],
    amenities: [],
    average_rating: 3.9,
    review_count: 210,
    is_chain: false,
    sba_certified: true,
    bookmark_count: 6,
    place_id: "place-2",
    data_source: "google",
    last_synced_at: null,
    sync_status: "active",
    claimed_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ai_description: null,
    ai_description_generated_at: null,
    ai_description_source: null,
    editorial_summary: null,
    ai_business_summary: null,
    category: {
      id: "cat-2",
      slug: "entertainment",
      name: "Entertainment",
      description: null,
      icon: "",
      color: "",
      sort_order: 2,
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
    },
  },
  ];
}

let mockBusinesses: BusinessWithCategory[] = makeBaseBusinesses();

beforeEach(() => {
  mockBusinesses = makeBaseBusinesses();
  vi.clearAllMocks();
  // mockClear keeps implementations — reset so resolved values never leak between tests
  mockToggleBookmark.mockReset();
  mockAuthUserId = null;
  mockStartedMissions = [];
});

async function renderPage() {
  render(<DiscoverPage />);
  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Discover places nearby" })).toBeInTheDocument();
  });
}

describe("DiscoverPage", () => {
  it("renders a concise directory surface with search, filters, and results", async () => {
    render(<DiscoverPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Discover places nearby" })).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText("Search by name, food, or service")).toBeInTheDocument();
    expect(screen.getByText("Near Diamond Bar")).toBeInTheDocument();
    expect(screen.getByText("2 places")).toBeInTheDocument();
    expect(screen.getByText("H Mart Diamond Bar")).toBeInTheDocument();
    expect(screen.getByText("Pinpoint Lanes")).toBeInTheDocument();
  });

  it("pre-selects the category from the ?category= search param", async () => {
    // use(searchParams) suspends until the promise settles
    await act(async () => {
      render(
        <React.Suspense fallback={null}>
          <DiscoverPage searchParams={Promise.resolve({ category: "retail" })} />
        </React.Suspense>
      );
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Discover places nearby" })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Filter by Retail" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Filter by All" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("shows a mission banner when a started mission matches the category filter", async () => {
    mockAuthUserId = "user-1";
    mockStartedMissions = [
      {
        progress: {
          id: "progress-1",
          current_count: 1,
          mission: {
            id: "mission-1",
            title: "Coffee Explorer",
            target_count: 3,
            category: { slug: "food-drink", name: "Food & Drink" },
          },
        },
        percentageComplete: 33,
      },
    ];

    await act(async () => {
      render(
        <React.Suspense fallback={null}>
          <DiscoverPage searchParams={Promise.resolve({ category: "food-drink" })} />
        </React.Suspense>
      );
    });

    expect(screen.getByText("Mission: Coffee Explorer")).toBeInTheDocument();
    expect(screen.getByText("1/3")).toBeInTheDocument();
    expect(screen.getByText(/check in with your receipt/i)).toBeInTheDocument();
  });

  it("hides the mission banner when the category does not match", async () => {
    mockAuthUserId = "user-1";
    mockStartedMissions = [
      {
        progress: {
          id: "progress-1",
          current_count: 1,
          mission: {
            id: "mission-1",
            title: "Coffee Explorer",
            target_count: 3,
            category: { slug: "food-drink", name: "Food & Drink" },
          },
        },
        percentageComplete: 33,
      },
    ];

    await act(async () => {
      render(
        <React.Suspense fallback={null}>
          <DiscoverPage searchParams={Promise.resolve({ category: "retail" })} />
        </React.Suspense>
      );
    });

    expect(screen.queryByText("Mission: Coffee Explorer")).not.toBeInTheDocument();
  });

  it("ignores unknown ?category= values and falls back to All", async () => {
    await act(async () => {
      render(
        <React.Suspense fallback={null}>
          <DiscoverPage searchParams={Promise.resolve({ category: "not-a-category" })} />
        </React.Suspense>
      );
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Discover places nearby" })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Filter by All" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("does not render the old explainer-heavy discover copy", async () => {
    render(<DiscoverPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Discover places nearby" })).toBeInTheDocument();
    });

    expect(screen.queryByText("How Pulse Works")).not.toBeInTheDocument();
    expect(screen.queryByText(/three easy steps/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/real Google Places listings/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Discover Local Businesses/i)).not.toBeInTheDocument();
  });

  describe("more filters", () => {
    it("filters to independent businesses and shows the count inline", async () => {
      await renderPage();

      const chip = screen.getByRole("button", { name: "Independent" });
      expect(chip).toHaveAttribute("aria-pressed", "false");

      fireEvent.click(chip);

      // Chain (is_chain: true) hidden, independent (is_chain: false) shown
      expect(screen.queryByText("H Mart Diamond Bar")).not.toBeInTheDocument();
      expect(screen.getByText("Pinpoint Lanes")).toBeInTheDocument();
      expect(screen.getByText("1 place")).toBeInTheDocument();

      // Active chip shows the inline count and pressed state
      const activeChip = screen.getByRole("button", { name: "Independent (1)" });
      expect(activeChip).toHaveAttribute("aria-pressed", "true");
    });

    it("falls back to name classification when is_chain is null", async () => {
      mockBusinesses = [
        { ...makeBaseBusinesses()[0], name: "Starbucks", is_chain: null },
        { ...makeBaseBusinesses()[1], name: "Maya's Kitchen", is_chain: null },
      ];
      await renderPage();

      fireEvent.click(screen.getByRole("button", { name: "Independent" }));

      expect(screen.queryByText("Starbucks")).not.toBeInTheDocument();
      expect(screen.getByText("Maya's Kitchen")).toBeInTheDocument();
    });

    it("filters to businesses that are open now", async () => {
      await renderPage();

      fireEvent.click(screen.getByRole("button", { name: "Open now" }));

      // H Mart hours resolve open, Pinpoint Lanes resolves closed
      expect(screen.getByText("H Mart Diamond Bar")).toBeInTheDocument();
      expect(screen.queryByText("Pinpoint Lanes")).not.toBeInTheDocument();
      expect(screen.getByText("1 place")).toBeInTheDocument();
    });

    it("excludes businesses with unknown hours while open-now is active", async () => {
      mockBusinesses = [
        makeBaseBusinesses()[0],
        { ...makeBaseBusinesses()[1], hours: {} },
      ];
      await renderPage();

      fireEvent.click(screen.getByRole("button", { name: "Open now" }));

      expect(screen.getByText("H Mart Diamond Bar")).toBeInTheDocument();
      expect(screen.queryByText("Pinpoint Lanes")).not.toBeInTheDocument();
    });

    it("filters by price level with multi-select", async () => {
      await renderPage();

      // $$ only matches H Mart (price_range 2)
      fireEvent.click(screen.getByRole("button", { name: "Price $$" }));
      expect(screen.getByText("H Mart Diamond Bar")).toBeInTheDocument();
      expect(screen.queryByText("Pinpoint Lanes")).not.toBeInTheDocument();

      // Adding $ brings back Pinpoint Lanes (price_range 1)
      fireEvent.click(screen.getByRole("button", { name: "Price $" }));
      expect(screen.getByText("H Mart Diamond Bar")).toBeInTheDocument();
      expect(screen.getByText("Pinpoint Lanes")).toBeInTheDocument();
      expect(screen.getByText("2 places")).toBeInTheDocument();
    });

    it("filters to the 4–5 star band", async () => {
      await renderPage();

      // Bands are [N, N+1): H Mart (4.6) is in 4–5, Pinpoint Lanes (3.9) is not
      fireEvent.click(screen.getByRole("button", { name: "4 to 5 stars" }));

      expect(screen.getByText("H Mart Diamond Bar")).toBeInTheDocument();
      expect(screen.queryByText("Pinpoint Lanes")).not.toBeInTheDocument();
    });

    it("filters to the 3–4 star band, excluding higher-rated places", async () => {
      await renderPage();

      // Pinpoint Lanes (3.9) falls in 3–4; H Mart (4.6) is above the band and excluded
      fireEvent.click(screen.getByRole("button", { name: "3 to 4 stars" }));

      expect(screen.getByText("Pinpoint Lanes")).toBeInTheDocument();
      expect(screen.queryByText("H Mart Diamond Bar")).not.toBeInTheDocument();
    });

    it("treats star bands as single-select and toggles off", async () => {
      await renderPage();

      const fourBand = screen.getByRole("button", { name: "4 to 5 stars" });
      fireEvent.click(fourBand);
      expect(fourBand).toHaveAttribute("aria-pressed", "true");

      // Picking another band replaces the first (single-select)
      fireEvent.click(screen.getByRole("button", { name: "3 to 4 stars" }));
      expect(fourBand).toHaveAttribute("aria-pressed", "false");

      // The top "5 stars" band matches neither fixture
      fireEvent.click(screen.getByRole("button", { name: "5 stars" }));
      expect(screen.getByText("No places found")).toBeInTheDocument();

      // Clicking the active band again clears the rating filter
      fireEvent.click(screen.getByRole("button", { name: "5 stars" }));
      expect(screen.getByText("2 places")).toBeInTheDocument();
    });

    it("filters by SBA certification", async () => {
      await renderPage();

      fireEvent.click(screen.getByRole("button", { name: "SBA certified" }));

      expect(screen.queryByText("H Mart Diamond Bar")).not.toBeInTheDocument();
      expect(screen.getByText("Pinpoint Lanes")).toBeInTheDocument();
    });

    it("hides the SBA chip when no business in the result set is certified", async () => {
      mockBusinesses = makeBaseBusinesses().map((b) => ({ ...b, sba_certified: false }));
      await renderPage();

      expect(screen.queryByRole("button", { name: "SBA certified" })).not.toBeInTheDocument();
    });

    it("resets the extra filters with the Reset button", async () => {
      await renderPage();

      // Reset is hidden until a filter is active
      expect(screen.queryByRole("button", { name: "Reset" })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Independent" }));
      fireEvent.click(screen.getByRole("button", { name: "Price $" }));
      expect(screen.getByText("1 place")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Reset" }));

      expect(screen.getByText("2 places")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Reset" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Independent" })).toHaveAttribute(
        "aria-pressed",
        "false"
      );
    });

    it("has an accessible group label and aria-pressed chips", async () => {
      await renderPage();

      const group = screen.getByRole("group", { name: "More filters" });
      const chips = within(group).getAllByRole("button");
      // Independent, Open now, 4 price levels, 5 rating levels, SBA certified
      expect(chips.length).toBe(12);
      for (const chip of chips) {
        expect(chip).toHaveAttribute("aria-pressed");
      }
    });

    it("offers one-click clear filters in the empty state", async () => {
      await renderPage();

      // No business has price level 4 — produces zero results
      fireEvent.click(screen.getByRole("button", { name: "Price $$$$" }));

      expect(screen.getByText("No places found")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

      expect(screen.getByText("2 places")).toBeInTheDocument();
      expect(screen.getByText("H Mart Diamond Bar")).toBeInTheDocument();
      expect(screen.getByText("Pinpoint Lanes")).toBeInTheDocument();
    });
  });

  describe("business card badges", () => {
    it("shows an Independent badge on independents and a muted Chain tag on chains", async () => {
      await renderPage();

      const independentCard = screen.getByText("Pinpoint Lanes").closest("article");
      const chainCard = screen.getByText("H Mart Diamond Bar").closest("article");
      expect(independentCard).not.toBeNull();
      expect(chainCard).not.toBeNull();

      expect(within(independentCard as HTMLElement).getByText("Independent")).toBeInTheDocument();
      expect(within(independentCard as HTMLElement).queryByText("Chain")).not.toBeInTheDocument();
      expect(within(chainCard as HTMLElement).getByText("Chain")).toBeInTheDocument();
      expect(within(chainCard as HTMLElement).queryByText("Independent")).not.toBeInTheDocument();
    });

    it("shows an open-now indicator only on businesses that are open", async () => {
      await renderPage();

      const openCard = screen.getByText("H Mart Diamond Bar").closest("article");
      const closedCard = screen.getByText("Pinpoint Lanes").closest("article");

      expect(within(openCard as HTMLElement).getByText("Open now")).toBeInTheDocument();
      expect(within(closedCard as HTMLElement).queryByText("Open now")).not.toBeInTheDocument();
    });

    it("shows an SBA certified badge on certified businesses", async () => {
      await renderPage();

      const sbaCard = screen.getByText("Pinpoint Lanes").closest("article");
      const plainCard = screen.getByText("H Mart Diamond Bar").closest("article");

      expect(within(sbaCard as HTMLElement).getByText("SBA")).toBeInTheDocument();
      expect(within(plainCard as HTMLElement).queryByText("SBA")).not.toBeInTheDocument();
    });
  });

  describe("card bookmarking", () => {
    function getBookmarkButton(businessName: string) {
      const card = screen.getByText(businessName).closest("article");
      expect(card).not.toBeNull();
      return within(card as HTMLElement).getByRole("button", { name: "Bookmark business" });
    }

    it("lets a guest save on-device without a sign-in gate and shows the honest toast", async () => {
      // Guest path: the auth-aware hook resolves local:true (saved in localStorage)
      mockToggleBookmark.mockResolvedValue({ bookmarked: true, local: true });
      await renderPage();

      fireEvent.click(getBookmarkButton("H Mart Diamond Bar"));

      await waitFor(() => {
        expect(vi.mocked(toast.success)).toHaveBeenCalledWith("Saved on this device", {
          description: "Sign in to sync bookmarks across devices.",
        });
      });
      expect(mockToggleBookmark).toHaveBeenCalledWith({
        businessId: "business-1",
        isBookmarked: false,
      });
      // The old "Sign in required" error gate must be gone
      expect(vi.mocked(toast.error)).not.toHaveBeenCalled();
    });

    it("shows the on-device removal toast when a guest un-bookmarks", async () => {
      mockToggleBookmark.mockResolvedValue({ bookmarked: false, local: true });
      await renderPage();

      fireEvent.click(getBookmarkButton("H Mart Diamond Bar"));

      await waitFor(() => {
        expect(vi.mocked(toast.success)).toHaveBeenCalledWith("Removed from this device", {
          description: "Sign in to sync bookmarks across devices.",
        });
      });
      expect(vi.mocked(toast.error)).not.toHaveBeenCalled();
    });

    it("keeps the classic toast for signed-in bookmarks", async () => {
      // Signed-in path: the auth-aware hook resolves local:false (server bookmark)
      mockToggleBookmark.mockResolvedValue({ bookmarked: true, local: false });
      await renderPage();

      fireEvent.click(getBookmarkButton("H Mart Diamond Bar"));

      await waitFor(() => {
        expect(vi.mocked(toast.success)).toHaveBeenCalledWith("Business bookmarked", {
          description: "Added to your saved businesses",
        });
      });
      expect(vi.mocked(toast.error)).not.toHaveBeenCalled();
    });

    it("shows an error toast when the toggle fails", async () => {
      mockToggleBookmark.mockRejectedValue(new Error("network down"));
      await renderPage();

      fireEvent.click(getBookmarkButton("H Mart Diamond Bar"));

      await waitFor(() => {
        expect(vi.mocked(toast.error)).toHaveBeenCalledWith("Error", {
          description: "Failed to update bookmark",
        });
      });
      expect(vi.mocked(toast.success)).not.toHaveBeenCalled();
    });
  });
});
