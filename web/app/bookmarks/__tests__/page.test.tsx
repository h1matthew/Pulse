/**
 * @vitest-environment jsdom
 */
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import BookmarksPage from "../page";

// NOTE: deliberately NOT importing from @/__tests__/mocks/providers.mock here —
// that module contains a nested vi.mock('@tanstack/react-query') which vitest
// hoists on import and breaks useQueryClient in the page under test.
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

// ============================================================================
// Hoisted mock state (vi.mock factories are hoisted above file-body consts)
// ============================================================================

const h = vi.hoisted(() => {
  const state = {
    localIds: [] as string[],
    user: null as { id: string; email: string } | null,
    authLoading: false,
    serverBookmarks: { bookmarks: [] as unknown[] },
  };

  const getLocalBookmarkIds = vi.fn(() => [...state.localIds]);
  const toggleLocalBookmark = vi.fn((id: string) => {
    const had = state.localIds.includes(id);
    state.localIds = had
      ? state.localIds.filter((existing) => existing !== id)
      : [...state.localIds, id];
    return { bookmarked: !had };
  });

  const toastSuccess = vi.fn();
  const toastError = vi.fn();
  const deleteBookmarkMutate = vi.fn(() => Promise.resolve());

  const makeBusiness = (overrides: Record<string, unknown>) => ({
    id: "biz-x",
    name: "Placeholder",
    slug: "placeholder",
    category_id: "cat-1",
    description: "A local business.",
    short_description: "A local spot.",
    address: "123 Main St",
    city: "Diamond Bar",
    state: "CA",
    zip_code: "91765",
    phone: null,
    email: null,
    website: null,
    latitude: null,
    longitude: null,
    hours: {},
    photos: [],
    logo_url: null,
    owner_id: null,
    is_verified: false,
    is_featured: false,
    price_range: 2,
    tags: ["local"],
    amenities: [],
    average_rating: 4.5,
    review_count: 42,
    bookmark_count: 3,
    place_id: null,
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
    ...overrides,
  });

  const businesses = [
    makeBusiness({ id: "biz-1", name: "Cafe Luna", slug: "cafe-luna" }),
    makeBusiness({ id: "biz-2", name: "Verde Books", slug: "verde-books" }),
  ];

  const supabaseIn = vi.fn(async (_column: string, ids: string[]) => ({
    data: businesses.filter((b) => ids.includes(b.id as string)),
    error: null,
  }));

  return {
    state,
    getLocalBookmarkIds,
    toggleLocalBookmark,
    toastSuccess,
    toastError,
    deleteBookmarkMutate,
    makeBusiness,
    businesses,
    supabaseIn,
  };
});

// ============================================================================
// Module mocks
// ============================================================================

vi.mock("@/components/layout/Header", () => ({
  Header: () => <header data-testid="header">Header</header>,
}));

vi.mock("@/components/ui/nav-link", () => ({
  NavLink: ({
    children,
    href,
    className,
  }: {
    children: ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/features/home/AnimatedSection", () => ({
  AnimatedSection: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: () => ({
    user: h.state.user,
    userId: h.state.user?.id ?? null,
    isLoggedIn: !!h.state.user,
    loading: h.state.authLoading,
  }),
}));

vi.mock("@/lib/bookmarks/local", () => ({
  LOCAL_BOOKMARKS_STORAGE_KEY: "pulse-local-bookmarks",
  getLocalBookmarkIds: h.getLocalBookmarkIds,
  isLocallyBookmarked: vi.fn((id: string) => h.state.localIds.includes(id)),
  toggleLocalBookmark: h.toggleLocalBookmark,
  clearLocalBookmarks: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        in: h.supabaseIn,
      })),
    })),
  }),
}));

vi.mock("@/hooks/useBookmarks", () => ({
  useUserBookmarks: (userId: string) => ({
    data: userId ? h.state.serverBookmarks : undefined,
    isLoading: false,
  }),
  useDeleteBookmark: () => ({ mutateAsync: h.deleteBookmarkMutate }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: h.toastSuccess,
    error: h.toastError,
    info: vi.fn(),
  },
}));

// ============================================================================
// Helpers
// ============================================================================

function renderPage() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BookmarksPage />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  h.state.localIds = [];
  h.state.user = null;
  h.state.authLoading = false;
  h.state.serverBookmarks = { bookmarks: [] };
});

// ============================================================================
// Tests
// ============================================================================

describe("BookmarksPage — guest with device-saved bookmarks", () => {
  beforeEach(() => {
    h.state.localIds = ["biz-1", "biz-2"];
  });

  it("shows the 'Saved on this device' banner with honest copy and a sign-in link", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Saved on this device")).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        "These bookmarks live only in this browser. Sign in to keep them on your account and across devices."
      )
    ).toBeInTheDocument();

    const signInLink = screen.getByRole("link", { name: "Sign in" });
    expect(signInLink).toHaveAttribute("href", "/login");

    // No hard sign-in wall
    expect(screen.queryByText("Sign in required")).not.toBeInTheDocument();
  });

  it("renders the locally bookmarked businesses fetched from Supabase", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Cafe Luna")).toBeInTheDocument();
    });
    expect(screen.getByText("Verde Books")).toBeInTheDocument();

    // Fetched via .in('id', localIds)
    expect(h.supabaseIn).toHaveBeenCalledWith("id", ["biz-1", "biz-2"]);

    // Local entries have no note/created_at — no "Saved <date>" footer
    expect(screen.queryByText(/^Saved \d/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Saved Today|Saved Yesterday/)).not.toBeInTheDocument();
  });

  it("removes a local bookmark: calls toggleLocalBookmark, shows the guest toast, and hides the card", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Cafe Luna")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Remove Cafe Luna from bookmarks" })
    );

    expect(h.toggleLocalBookmark).toHaveBeenCalledWith("biz-1");
    expect(h.toastSuccess).toHaveBeenCalledWith("Removed from this device", {
      description: "Sign in to sync bookmarks across devices.",
    });

    await waitFor(() => {
      expect(screen.queryByText("Cafe Luna")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Verde Books")).toBeInTheDocument();
  });
});

describe("BookmarksPage — guest without device-saved bookmarks", () => {
  it("keeps the sign-in card and explains that signed-out saves stay on this device", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Sign in required")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Please sign in to view your bookmarks")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Bookmarks you save while signed out are kept on this device."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign In" })).toHaveAttribute(
      "href",
      "/login"
    );

    // No guest banner and no Supabase fetch when there is nothing saved
    expect(screen.queryByText("Saved on this device")).not.toBeInTheDocument();
    expect(h.supabaseIn).not.toHaveBeenCalled();
  });
});

describe("BookmarksPage — signed-in flow (unchanged)", () => {
  it("renders server bookmarks with note and saved date, no guest banner", async () => {
    h.state.user = { id: "user-1", email: "test@example.com" };
    h.state.serverBookmarks = {
      bookmarks: [
        {
          id: "bookmark-1",
          user_id: "user-1",
          business_id: "biz-1",
          note: "Great oat milk latte",
          created_at: new Date().toISOString(),
          business: h.makeBusiness({ id: "biz-1", name: "Cafe Luna" }),
        },
      ],
    };

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Cafe Luna")).toBeInTheDocument();
    });

    expect(screen.getByText(/Great oat milk latte/)).toBeInTheDocument();
    expect(screen.getByText("Saved Today")).toBeInTheDocument();
    expect(
      screen.queryByText(
        "These bookmarks live only in this browser. Sign in to keep them on your account and across devices."
      )
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Sign in required")).not.toBeInTheDocument();
  });
});
