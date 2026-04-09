import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public PAGE routes — skip Supabase entirely for instant navigation.
  // API routes are NOT in this list — they need cookie refresh for auth.
  const isPublicPage =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/about') ||
    pathname.startsWith('/mission') ||
    pathname.startsWith('/get-involved') ||
    pathname.startsWith('/volunteer') ||
    pathname.startsWith('/contact') ||
    pathname.startsWith('/discover') ||
    pathname.startsWith('/categories') ||
    pathname.startsWith('/deals') ||
    pathname.startsWith('/business') ||
    pathname.startsWith('/missions') ||
    pathname.startsWith('/reviews') ||
    pathname.startsWith('/leaderboard')

  if (isPublicPage) {
    return NextResponse.next({ request })
  }

  // All other routes (API + protected pages) — refresh Supabase session cookie.
  let supabaseResponse = NextResponse.next({ request })

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
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh the session cookie (reads from cookie, no network call)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // API routes: pass through after cookie refresh (handlers do their own auth)
  if (pathname.startsWith('/api/')) {
    return supabaseResponse
  }

  // Protected page routes: redirect to login if no session
  if (!session?.user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
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
