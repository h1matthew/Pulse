import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { checkRateLimit, getCategoryFromPath, storeRateLimitInfo, getClientIP } from '@/lib/rateLimit'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Store rate limit result for adding headers to successful responses
  let rateLimitResult: { limit: number; remaining: number; reset: number } | null = null

  // Apply rate limiting to API routes
  if (pathname.startsWith('/api/')) {
    const isConversationMetaRoute =
      pathname.startsWith('/api/ai/conversations') && !pathname.includes('/messages')

    if (isConversationMetaRoute) {
      // Skip rate limiting for conversation list/create/rename/delete endpoints
      // to avoid double-counting non-message requests in the UI.
    } else {
      // Use IP as base identifier
      let identifier = getClientIP(request)
      const category = getCategoryFromPath(pathname)

      // For admin-ai category, we'll get the user ID later after Supabase auth
      // For now, store the category to check after auth
      const isAdminAiRoute = category === 'admin-ai'

      // Temporarily check rate limit with IP (will be refined for admin routes below)
      if (!isAdminAiRoute) {
        const result = await checkRateLimit(identifier, category)
        rateLimitResult = { limit: result.limit, remaining: result.remaining, reset: result.reset }

        // Store rate limit info in Redis so route handlers can read it
        // (Headers don't propagate from middleware to route handlers in Next.js Node.js runtime)
        await storeRateLimitInfo(identifier, category, rateLimitResult)

        if (!result.success) {
          const retryAfterSeconds = Math.ceil(result.retryAfterMs / 1000)

          return NextResponse.json(
            {
              error: 'Too many requests',
              message: `Rate limit exceeded. Please try again in ${retryAfterSeconds} seconds.`,
              retryAfter: retryAfterSeconds,
            },
            {
              status: 429,
              headers: {
                'Retry-After': String(retryAfterSeconds),
                'X-RateLimit-Limit': String(result.limit),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': String(result.reset),
              },
            }
          )
        }
      }
    }
  }

  // Supabase session handling
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Apply user-based rate limiting for admin AI routes after we have the user
  const category = getCategoryFromPath(pathname)
  if (pathname.startsWith('/api/admin/') && category === 'admin-ai') {
    // Use user ID for rate limiting if available, otherwise fall back to IP
    const identifier = user?.id || getClientIP(request)
    const result = await checkRateLimit(identifier, category)
    rateLimitResult = { limit: result.limit, remaining: result.remaining, reset: result.reset }

    await storeRateLimitInfo(identifier, category, rateLimitResult)

    if (!result.success) {
      const retryAfterSeconds = Math.ceil(result.retryAfterMs / 1000)

      return NextResponse.json(
        {
          error: 'Too many requests',
          message: `Rate limit exceeded. Please try again in ${retryAfterSeconds} seconds.`,
          retryAfter: retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSeconds),
            'X-RateLimit-Limit': String(result.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(result.reset),
          },
        }
      )
    }
  }

  // Protected routes that require authentication
  // Public routes: /, /login, /auth, /about, /mission, /get-involved, /volunteer, /api/, /contact
  // Protected routes: /learn, /dashboard, /admin, /ai-tutor, /practice, /simulate, /achievements, /leaderboard
  if (
    !user &&
    pathname !== '/' &&
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/auth') &&
    !pathname.startsWith('/about') &&
    !pathname.startsWith('/mission') &&
    !pathname.startsWith('/get-involved') &&
    !pathname.startsWith('/volunteer') &&
    !pathname.startsWith('/models') &&
    !pathname.startsWith('/api/') &&
    !pathname.startsWith('/contact')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Add rate limit headers to successful API responses (for 429 responses and logging)
  // Note: These headers won't reach the client for non-429 responses due to Next.js middleware limitations
  // API routes should read the request headers and include rate limit info in response body instead
  if (rateLimitResult && pathname.startsWith('/api/')) {
    supabaseResponse.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit))
    supabaseResponse.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining))
    supabaseResponse.headers.set('X-RateLimit-Reset', String(rateLimitResult.reset))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Static assets (images, 3D models, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|models/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|glb|gltf)$).*)',
  ],
}
