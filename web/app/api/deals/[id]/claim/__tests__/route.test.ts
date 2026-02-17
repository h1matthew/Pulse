import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";

const mockFrom = vi.fn();
const mockUser = { id: "user-1", email: "test@example.com" };

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: mockUser } })),
      },
      from: mockFrom,
    })
  ),
}));

function createParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/deals/[id]/claim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is unauthenticated", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: null } })),
      },
      from: mockFrom,
    } as never);

    const request = new NextRequest("http://localhost/api/deals/deal-1/claim", {
      method: "POST",
    });
    const response = await POST(request, createParams("deal-1"));

    expect(response.status).toBe(401);
  });

  it("returns 404 when deal does not exist", async () => {
    const dealQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
    };
    mockFrom.mockReturnValueOnce(dealQuery);

    const request = new NextRequest("http://localhost/api/deals/missing/claim", {
      method: "POST",
    });
    const response = await POST(request, createParams("missing"));

    expect(response.status).toBe(404);
  });

  it("rejects inactive deals", async () => {
    const dealQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "deal-1",
          is_active: false,
          start_date: null,
          end_date: null,
          usage_limit: null,
          usage_count: 0,
        },
        error: null,
      }),
    };
    mockFrom.mockReturnValueOnce(dealQuery);

    const request = new NextRequest("http://localhost/api/deals/deal-1/claim", {
      method: "POST",
    });
    const response = await POST(request, createParams("deal-1"));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("This deal is no longer active");
  });

  it("rejects deals that are already claimed by the same user", async () => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    const dealQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "deal-1",
          is_active: true,
          start_date: new Date(now - oneDay).toISOString(),
          end_date: new Date(now + oneDay).toISOString(),
          usage_limit: null,
          usage_count: 1,
        },
        error: null,
      }),
    };

    const existingClaimQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "claim-1" }, error: null }),
    };

    mockFrom
      .mockReturnValueOnce(dealQuery)
      .mockReturnValueOnce(existingClaimQuery);

    const request = new NextRequest("http://localhost/api/deals/deal-1/claim", {
      method: "POST",
    });
    const response = await POST(request, createParams("deal-1"));

    expect(response.status).toBe(409);
    const json = await response.json();
    expect(json.error).toBe("You have already claimed this deal");
  });

  it("creates a claim and increments usage count", async () => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const update = vi.fn().mockReturnThis();
    const eq = vi.fn().mockResolvedValue({ error: null });

    const dealQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "deal-1",
          is_active: true,
          start_date: new Date(now - oneDay).toISOString(),
          end_date: new Date(now + oneDay).toISOString(),
          usage_limit: 10,
          usage_count: 3,
        },
        error: null,
      }),
    };

    const existingClaimQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
    };

    const insertClaimQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "claim-new", deal_id: "deal-1", user_id: "user-1" },
        error: null,
      }),
    };

    const updateDealQuery = {
      update,
      eq,
    };

    mockFrom
      .mockReturnValueOnce(dealQuery)
      .mockReturnValueOnce(existingClaimQuery)
      .mockReturnValueOnce(insertClaimQuery)
      .mockReturnValueOnce(updateDealQuery);

    const request = new NextRequest("http://localhost/api/deals/deal-1/claim", {
      method: "POST",
    });
    const response = await POST(request, createParams("deal-1"));

    expect(response.status).toBe(201);
    expect(update).toHaveBeenCalledWith({ usage_count: 4 });
    expect(eq).toHaveBeenCalledWith("id", "deal-1");
  });
});
