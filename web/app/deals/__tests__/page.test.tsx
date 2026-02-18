/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DealsPage from "../page";
import { toast } from "sonner";

const mockUseAvailableDeals = vi.fn();
const mockUseUserClaims = vi.fn();
const mockUseClaimDeal = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("@/components/layout/Header", () => ({
  Header: () => <div data-testid="header">Header</div>,
}));

vi.mock("@/components/features/home/AnimatedSection", () => ({
  AnimatedSection: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/hooks/useDeals", () => ({
  useAvailableDeals: () => mockUseAvailableDeals(),
  useUserClaims: (userId: string) => mockUseUserClaims(userId),
  useClaimDeal: () => mockUseClaimDeal(),
  useScrapeDeals: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ scraped: 0, dealsFound: 0 }),
    isPending: false,
  }),
}));

vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const availableDeals = [
  {
    id: "deal-1",
    title: "Happy Hour",
    description: "50% off appetizers",
    deal_type: "flash",
    discount_type: "percentage",
    discount_value: 50,
    code: "FLASH50",
    start_date: null,
    end_date: "2099-12-31T23:59:59.000Z",
    isClaimed: false,
    business: {
      id: "biz-1",
      name: "Corner Bistro",
      category: { name: "Food & Drink", icon: "🍽️" },
      average_rating: 4.7,
      review_count: 128,
    },
  },
  {
    id: "deal-2",
    title: "Welcome Coffee",
    description: "15% off first visit",
    deal_type: "standard",
    discount_type: "percentage",
    discount_value: 15,
    code: "WELCOME15",
    start_date: null,
    end_date: null,
    isClaimed: true,
    business: {
      id: "biz-2",
      name: "Local Bean",
      category: { name: "Food & Drink", icon: "☕" },
      average_rating: 4.5,
      review_count: 90,
    },
  },
];

const claimedDeals = [
  {
    id: "claim-1",
    claimed_at: "2026-02-14T12:00:00.000Z",
    redeemed_at: "2026-02-15T12:00:00.000Z",
    redeemed_code: "ABCD1234",
    deal: {
      id: "deal-3",
      title: "Book Bundle",
      description: "Buy 2 get 1 half off",
      discount_type: "bogo",
      discount_value: null,
      business: {
        name: "Paper Trail Books",
        category: { name: "Retail", icon: "📚" },
      },
    },
  },
];

function setDefaultMocks() {
  mockUseAuth.mockReturnValue({
    isLoggedIn: true,
    userId: "user-1",
    user: { id: "user-1" },
  });

  mockUseAvailableDeals.mockReturnValue({
    data: availableDeals,
    isLoading: false,
    isError: false,
  });

  mockUseUserClaims.mockReturnValue({
    data: claimedDeals,
    isLoading: false,
    isError: false,
  });

  mockUseClaimDeal.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({ id: "claim-new" }),
    isPending: false,
  });
}

describe("DealsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDefaultMocks();
  });

  it("renders deal sections and dynamic stat cards", () => {
    render(<DealsPage />);

    expect(screen.getByRole("heading", { name: "Deals & Offers" })).toBeInTheDocument();
    expect(screen.getByTestId("stat-available")).toHaveTextContent("2");
    expect(screen.getByTestId("stat-flash")).toHaveTextContent("1");
    expect(screen.getByTestId("stat-claimed")).toHaveTextContent("1");
    expect(screen.getByText("Happy Hour")).toBeInTheDocument();
  });

  it("renders loading state while queries are in flight", () => {
    mockUseAvailableDeals.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    mockUseUserClaims.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    render(<DealsPage />);
    expect(screen.getByText("Loading deals...")).toBeInTheDocument();
  });

  it("shows API error state", () => {
    mockUseAvailableDeals.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    mockUseUserClaims.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });

    render(<DealsPage />);
    expect(screen.getByText("Could not load deals")).toBeInTheDocument();
  });

  it("prevents claiming deals when signed out", async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ id: "claim-new" });
    mockUseAuth.mockReturnValue({
      isLoggedIn: false,
      userId: null,
      user: null,
    });
    mockUseClaimDeal.mockReturnValue({
      mutateAsync,
      isPending: false,
    });

    render(<DealsPage />);
    fireEvent.click(screen.getByRole("button", { name: /claim deal/i }));

    expect(mutateAsync).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it("claims an available deal when signed in", async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ id: "claim-new" });
    mockUseClaimDeal.mockReturnValue({
      mutateAsync,
      isPending: false,
    });

    render(<DealsPage />);
    fireEvent.click(screen.getByRole("button", { name: /claim deal/i }));

    expect(mutateAsync).toHaveBeenCalledWith("deal-1");
  });

  it("renders already-claimed available deal as disabled", () => {
    render(<DealsPage />);

    const claimedButton = screen.getByRole("button", { name: /claimed/i });
    expect(claimedButton).toBeDisabled();
  });

  it("shows claimed tab content and used badge", () => {
    render(<DealsPage />);
    const claimedTab = screen.getByRole("tab", { name: /^claimed$/i });
    fireEvent.mouseDown(claimedTab);
    fireEvent.click(claimedTab);

    expect(screen.getByText("Book Bundle")).toBeInTheDocument();
    expect(screen.getByText("Used")).toBeInTheDocument();
  });

  it("shows empty states for both tabs", () => {
    mockUseAvailableDeals.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
    mockUseUserClaims.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });

    render(<DealsPage />);
    expect(screen.getByText("No available deals right now")).toBeInTheDocument();

    const claimedTab = screen.getByRole("tab", { name: /^claimed$/i });
    fireEvent.mouseDown(claimedTab);
    fireEvent.click(claimedTab);
    expect(screen.getByText("No claimed deals yet")).toBeInTheDocument();
  });
});
