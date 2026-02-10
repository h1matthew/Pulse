/**
 * Chainable Supabase client mock for testing.
 * Provides a fully mockable Supabase client with chainable query builder methods.
 */
import { vi } from 'vitest'
import type { User, Session } from '@supabase/supabase-js'

// Mock user factory
export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'test-user-id-123',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

// Mock session factory
export function createMockSession(overrides: Partial<Session> = {}): Session {
  return {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: createMockUser(),
    ...overrides,
  }
}

// Chainable query builder mock
export interface MockQueryBuilder {
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  upsert: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  neq: ReturnType<typeof vi.fn>
  gt: ReturnType<typeof vi.fn>
  gte: ReturnType<typeof vi.fn>
  lt: ReturnType<typeof vi.fn>
  lte: ReturnType<typeof vi.fn>
  like: ReturnType<typeof vi.fn>
  ilike: ReturnType<typeof vi.fn>
  is: ReturnType<typeof vi.fn>
  in: ReturnType<typeof vi.fn>
  contains: ReturnType<typeof vi.fn>
  containedBy: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  limit: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
  range: ReturnType<typeof vi.fn>
  match: ReturnType<typeof vi.fn>
  or: ReturnType<typeof vi.fn>
  filter: ReturnType<typeof vi.fn>
  not: ReturnType<typeof vi.fn>
  then: ReturnType<typeof vi.fn>
}

export function createMockQueryBuilder(
  resolvedData: unknown = null,
  resolvedError: unknown = null
): MockQueryBuilder {
  const result = { data: resolvedData, error: resolvedError }

  const builder: MockQueryBuilder = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    upsert: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    neq: vi.fn(() => builder),
    gt: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lt: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    like: vi.fn(() => builder),
    ilike: vi.fn(() => builder),
    is: vi.fn(() => builder),
    in: vi.fn(() => builder),
    contains: vi.fn(() => builder),
    containedBy: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    range: vi.fn(() => builder),
    match: vi.fn(() => builder),
    or: vi.fn(() => builder),
    filter: vi.fn(() => builder),
    not: vi.fn(() => builder),
    then: vi.fn((resolve) => Promise.resolve(result).then(resolve)),
  }

  return builder
}

// Auth mock
export interface MockAuth {
  getUser: ReturnType<typeof vi.fn>
  getSession: ReturnType<typeof vi.fn>
  signInWithOAuth: ReturnType<typeof vi.fn>
  signOut: ReturnType<typeof vi.fn>
  onAuthStateChange: ReturnType<typeof vi.fn>
  refreshSession: ReturnType<typeof vi.fn>
}

export function createMockAuth(user: User | null = null): MockAuth {
  const mockSubscription = { unsubscribe: vi.fn() }

  return {
    getUser: vi.fn(() => Promise.resolve({ data: { user }, error: null })),
    getSession: vi.fn(() => Promise.resolve({
      data: { session: user ? createMockSession({ user }) : null },
      error: null
    })),
    signInWithOAuth: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
    onAuthStateChange: vi.fn((callback) => {
      // Immediately call with current user state
      setTimeout(() => callback('SIGNED_IN', user ? createMockSession({ user }) : null), 0)
      return { data: { subscription: mockSubscription } }
    }),
    refreshSession: vi.fn(() => Promise.resolve({
      data: { session: user ? createMockSession({ user }) : null },
      error: null
    })),
  }
}

// Full Supabase client mock
export interface MockSupabaseClient {
  from: ReturnType<typeof vi.fn>
  auth: MockAuth
  rpc: ReturnType<typeof vi.fn>
  storage: {
    from: ReturnType<typeof vi.fn>
  }
}

export function createMockSupabaseClient(options: {
  user?: User | null
  queryData?: Record<string, unknown>
  queryError?: unknown
} = {}): MockSupabaseClient {
  const { user = null, queryData = null, queryError = null } = options

  const tableBuilders: Record<string, MockQueryBuilder> = {}

  return {
    from: vi.fn((table: string) => {
      if (!tableBuilders[table]) {
        tableBuilders[table] = createMockQueryBuilder(
          queryData?.[table] ?? queryData,
          queryError
        )
      }
      return tableBuilders[table]
    }),
    auth: createMockAuth(user),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: { path: 'mock-path' }, error: null })),
        download: vi.fn(() => Promise.resolve({ data: new Blob(), error: null })),
        remove: vi.fn(() => Promise.resolve({ data: null, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/mock-file' } })),
        list: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    },
  }
}

// Helper to set query builder response
export function setQueryBuilderResponse(
  builder: MockQueryBuilder,
  data: unknown,
  error: unknown = null
) {
  const result = { data, error }
  builder.single.mockResolvedValue(result)
  builder.maybeSingle.mockResolvedValue(result)
  builder.then.mockImplementation((resolve) => Promise.resolve(result).then(resolve))
}

// Default mock setup for vi.mock
export const mockSupabaseClient = createMockSupabaseClient()

export function setupSupabaseMock() {
  vi.mock('@/lib/supabase/client', () => ({
    createClient: () => mockSupabaseClient,
  }))

  vi.mock('@/lib/supabase/server', () => ({
    createClient: () => mockSupabaseClient,
  }))
}
