/**
 * Next.js mock utilities for testing.
 * Provides mocks for router, request/response, and Next.js-specific functions.
 */
import { vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { createElement } from 'react'

// Mock router
export interface MockRouter {
  push: ReturnType<typeof vi.fn>
  replace: ReturnType<typeof vi.fn>
  back: ReturnType<typeof vi.fn>
  forward: ReturnType<typeof vi.fn>
  refresh: ReturnType<typeof vi.fn>
  prefetch: ReturnType<typeof vi.fn>
  pathname: string
  query: Record<string, string>
}

export function createMockRouter(overrides: Partial<MockRouter> = {}): MockRouter {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    pathname: '/',
    query: {},
    ...overrides,
  }
}

// Mock useRouter hook
export function setupRouterMock(router: Partial<MockRouter> = {}) {
  const mockRouter = createMockRouter(router)

  vi.mock('next/navigation', () => ({
    useRouter: () => mockRouter,
    usePathname: () => mockRouter.pathname,
    useSearchParams: () => new URLSearchParams(mockRouter.query),
    useParams: () => ({}),
    redirect: vi.fn(),
    notFound: vi.fn(),
  }))

  return mockRouter
}

// Create mock NextRequest
export function createMockNextRequest(options: {
  method?: string
  url?: string
  body?: unknown
  headers?: Record<string, string>
  searchParams?: Record<string, string>
} = {}): NextRequest {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    body,
    headers = {},
    searchParams = {},
  } = options

  const urlWithParams = new URL(url)
  Object.entries(searchParams).forEach(([key, value]) => {
    urlWithParams.searchParams.set(key, value)
  })

  const requestInit: RequestInit = {
    method,
    headers: new Headers({
      'Content-Type': 'application/json',
      ...headers,
    }),
  }

  if (body && method !== 'GET') {
    requestInit.body = JSON.stringify(body)
  }

  return new NextRequest(urlWithParams.toString(), requestInit)
}

// Create mock API context with params
export function createMockAPIContext<T extends Record<string, string>>(params: T) {
  return {
    params: Promise.resolve(params),
  }
}

// Helper to parse NextResponse body
export async function parseNextResponse<T = unknown>(response: NextResponse): Promise<{
  data: T
  status: number
}> {
  const body = await response.json()
  return {
    data: body as T,
    status: response.status,
  }
}

// Mock authenticated request helpers
export function createAuthenticatedRequest(options: {
  method?: string
  url?: string
  body?: unknown
  userId?: string
  isAdmin?: boolean
} = {}) {
  const { userId = 'test-user-id', isAdmin = false, ...restOptions } = options

  return createMockNextRequest({
    ...restOptions,
    headers: {
      'x-user-id': userId,
      'x-is-admin': isAdmin ? 'true' : 'false',
    },
  })
}

// Mock cookies
export function createMockCookies(cookies: Record<string, string> = {}) {
  const cookieStore = new Map(Object.entries(cookies))

  return {
    get: vi.fn((name: string) => {
      const value = cookieStore.get(name)
      return value ? { name, value } : undefined
    }),
    set: vi.fn((name: string, value: string) => {
      cookieStore.set(name, value)
    }),
    delete: vi.fn((name: string) => {
      cookieStore.delete(name)
    }),
    has: vi.fn((name: string) => cookieStore.has(name)),
    getAll: vi.fn(() => Array.from(cookieStore.entries()).map(([name, value]) => ({ name, value }))),
  }
}

// Setup cookies mock
export function setupCookiesMock(cookies: Record<string, string> = {}) {
  const mockCookies = createMockCookies(cookies)

  vi.mock('next/headers', () => ({
    cookies: () => mockCookies,
    headers: () => new Headers(),
  }))

  return mockCookies
}

// Mock redirect function
export function setupRedirectMock() {
  const mockRedirect = vi.fn()

  vi.mock('next/navigation', async () => {
    const actual = await vi.importActual('next/navigation')
    return {
      ...actual,
      redirect: mockRedirect,
    }
  })

  return mockRedirect
}

// Mock image component
export function setupImageMock() {
  vi.mock('next/image', () => ({
    default: (props: Record<string, unknown>) => {
      return createElement('img', {
        ...props,
        alt: typeof props.alt === 'string' ? props.alt : '',
      })
    },
  }))
}

// Mock Link component
export function setupLinkMock() {
  vi.mock('next/link', () => ({
    default: ({
      children,
      href,
      ...props
    }: {
      children: React.ReactNode
      href: string
      [key: string]: unknown
    }) => {
      return createElement('a', { href, ...props }, children)
    },
  }))
}

// Combined Next.js mocks setup
export function setupNextMocks(options: {
  router?: Partial<MockRouter>
  cookies?: Record<string, string>
} = {}) {
  const router = setupRouterMock(options.router)
  const cookies = setupCookiesMock(options.cookies)
  setupImageMock()
  setupLinkMock()

  return { router, cookies }
}

// Helper to test API route handlers
export async function testAPIRoute<T>(
  handler: (req: NextRequest, ctx?: unknown) => Promise<NextResponse>,
  options: {
    method?: string
    url?: string
    body?: unknown
    headers?: Record<string, string>
    searchParams?: Record<string, string>
    context?: unknown
  } = {}
): Promise<{ data: T; status: number }> {
  const request = createMockNextRequest(options)
  const response = await handler(request, options.context)
  return parseNextResponse<T>(response)
}
