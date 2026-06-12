/**
 * @vitest-environment jsdom
 */
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import BusinessDetailPage from "../page";
import type { BusinessWithDetails, ExternalReview, ReviewWithUser } from "@/types/business";
import { toast } from "sonner";

const BUSINESS_ID = "11111111-1111-4111-8111-111111111111";

const mockUseBusiness = vi.fn();
const mockUseAuth = vi.fn();
const mockUseIsBookmarked = vi.fn();
const mockUseToggleBookmark = vi.fn();
const mockUseClaimDeal = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    use: vi.fn((value: unknown) => value),
  };
});

vi.mock("@/components/layout/Header", () => ({
  Header: () => <div data-testid="header">Header</div>,
}));

vi.mock("@/components/features/home/AnimatedSection", () => ({
  AnimatedSection: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/features/bot/BaanihaliPuzzleCaptcha", () => ({
  BaanihaliPuzzleCaptcha: ({ onVerify }: { onVerify: (token: string) => void }) => (
    <button
      type="button"
      data-testid="captcha-widget"
      onClick={() => onVerify("test-captcha-token")}
    >
      Solve puzzle
    </button>
  ),
}));

vi.mock("@/components/ui/nav-link", () => ({
  NavLink: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({
    alt,
    src,
  }: {
    alt: string;
    src: string;
  }) => <div role="img" aria-label={alt} data-src={src} />,
}));

vi.mock("@/hooks/useBusinesses", () => ({
  useBusiness: (id: string) => mockUseBusiness(id),
}));

vi.mock("@/hooks/useDeals", () => ({
  useClaimDeal: () => mockUseClaimDeal(),
}));

vi.mock("@/hooks/useBookmarks", () => ({
  useIsBookmarked: (businessId: string) => mockUseIsBookmarked(businessId),
  useToggleBookmark: () => mockUseToggleBookmark(),
}));

vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
    }),
  };
});

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

function createLocalReview(index: number): ReviewWithUser {
  return {
    id: `pulse-review-${index}`,
    business_id: BUSINESS_ID,
    user_id: `user-${index}`,
    rating: 5,
    content: `Local review ${index}`,
    photos: [],
    verified_purchase: false,
    helpful_count: 0,
    is_featured: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    user: {
      id: `user-${index}`,
      full_name: `Local Reviewer ${index}`,
      avatar_url: null,
    },
  };
}

function createExternalReview(index: number): ExternalReview {
  return {
    id: `google-review-${index}`,
    source: "google",
    rating: 4,
    content: `External review ${index}`,
    author_name: `Google Reviewer ${index}`,
    created_at: "2026-01-01T00:00:00.000Z",
    relative_time: `${index} days ago`,
    maps_url: `https://maps.google.com/review/${index}`,
  };
}

function createBusiness(overrides: Partial<BusinessWithDetails> = {}): BusinessWithDetails {
  return {
    id: BUSINESS_ID,
    name: "Corner Bistro",
    slug: "corner-bistro",
    category_id: "food-drink",
    description: "A neighborhood restaurant.",
    short_description: "Great local food and drinks.",
    address: "123 Main St",
    city: "Austin",
    state: "TX",
    zip_code: "78701",
    phone: "555-123-4567",
    email: null,
    website: "https://corner-bistro.example.com",
    latitude: null,
    longitude: null,
    hours: { monday: "9AM - 5PM" },
    photos: [],
    logo_url: null,
    owner_id: null,
    is_verified: true,
    is_featured: false,
    price_range: 2,
    tags: ["restaurant", "food"],
    amenities: [],
    average_rating: 4.7,
    review_count: 300,
    bookmark_count: 0,
    place_id: "place-123",
    data_source: "google",
    last_synced_at: null,
    sync_status: "active",
    claimed_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    category: {
      id: "food-drink",
      slug: "food-drink",
      name: "Food & Drink",
      description: null,
      icon: "🍽️",
      color: "#00aa88",
      sort_order: 1,
      is_active: true,
      created_at: "2026-01-01T00:00:00.000Z",
    },
    reviews: [createLocalReview(1), createLocalReview(2), createLocalReview(3)],
    external_reviews: [
      createExternalReview(1),
      createExternalReview(2),
      createExternalReview(3),
      createExternalReview(4),
    ],
    deals: [],
    local_review_count: 3,
    ...overrides,
  };
}

function setDefaultMocks() {
  mockUseBusiness.mockReturnValue({
    data: createBusiness(),
    isLoading: false,
  });

  mockUseAuth.mockReturnValue({
    user: null,
  });

  mockUseIsBookmarked.mockReturnValue({ data: false });

  mockUseToggleBookmark.mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  });

  mockUseClaimDeal.mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  });
}

async function renderPage() {
  const params = { id: "slug-biz-1" } as unknown as Promise<{ id: string }>;
  render(<BusinessDetailPage params={params} />);
  await screen.findByRole("heading", { name: "Corner Bistro" });
}

function openReviewsTab() {
  const reviewsTab = screen.getByRole("tab", { name: /Reviews \(300\)/i });
  fireEvent.mouseDown(reviewsTab);
  fireEvent.click(reviewsTab);
}

describe("BusinessDetailPage reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    setDefaultMocks();
  });

  it("shows About/Reviews/Deals tab order and paginates combined reviews", async () => {
    await renderPage();

    const tabs = screen.getAllByRole("tab").map((tab) => tab.textContent?.trim() || "");
    expect(tabs[0]).toBe("About");
    expect(tabs[1]).toContain("Reviews (300)");
    expect(tabs[2]).toBe("Deals (0)");

    const reviewsTab = screen.getByRole("tab", { name: /Reviews \(300\)/i });
    expect(reviewsTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /About/i })).toHaveAttribute("aria-selected", "false");

    const readAllReviewsLink = screen.getByRole("link", {
      name: /read all reviews on google maps/i,
    });
    expect(readAllReviewsLink).toHaveAttribute("href", expect.stringContaining("google.com/maps/search"));
    expect(readAllReviewsLink).toHaveAttribute("href", expect.stringContaining("query_place_id=place-123"));

    expect(
      screen.queryByText(/Google currently exposes only a subset of full review text/i)
    ).not.toBeInTheDocument();

    expect(screen.getByText("Local review 1")).toBeInTheDocument();
    expect(screen.getByText("External review 2")).toBeInTheDocument();
    expect(screen.queryByText("External review 4")).not.toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByText("External review 3")).toBeInTheDocument();
    expect(screen.getByText("External review 4")).toBeInTheDocument();
    expect(screen.queryByText("Local review 1")).not.toBeInTheDocument();
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
  });

  it("submits reviews against the canonical business id", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    mockUseAuth.mockReturnValue({
      user: { id: "user-1" },
    });

    await renderPage();
    openReviewsTab();

    fireEvent.change(screen.getByPlaceholderText(/share your experience/i), {
      target: { value: "Great food and service." },
    });

    // Submitting requires CAPTCHA verification, so the button starts disabled.
    const submitButton = screen.getByRole("button", { name: /submit review/i });
    expect(submitButton).toBeDisabled();

    // Open the CAPTCHA modal and solve it the way a user would. Verifying the
    // CAPTCHA submits the review with the resolved token.
    fireEvent.click(screen.getByRole("button", { name: /verify captcha/i }));
    fireEvent.click(screen.getByTestId("captcha-widget"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/reviews",
        expect.objectContaining({ method: "POST" })
      );
    });

    // The page also fetches check-in status on mount; pick the review POST
    const reviewCall = fetchMock.mock.calls.find(([url]) => url === "/api/reviews");
    const requestBody = JSON.parse(reviewCall![1].body as string);
    expect(requestBody.business_id).toBe(BUSINESS_ID);
    expect(requestBody.content).toBe("Great food and service.");

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["businesses", "detail"],
    });

    expect(toast.success).toHaveBeenCalledWith("Review submitted", {
      description: "Thank you for sharing your experience!",
    });
  });

  it("reflects an existing check-in today on load", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ checkIns: [], checkedInToday: true, totalCheckIns: 1 }),
    });
    vi.stubGlobal("fetch", fetchMock);
    mockUseAuth.mockReturnValue({ user: { id: "user-1" } });

    await renderPage();

    expect(fetchMock).toHaveBeenCalledWith(`/api/businesses/${BUSINESS_ID}/checkin`);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /checked in/i })).toBeDisabled();
    });
  });

  it("does not fetch check-in status for signed-out visitors", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await renderPage();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
