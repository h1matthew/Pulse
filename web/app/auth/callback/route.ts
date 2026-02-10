import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Whitelist of allowed redirect paths after authentication
// Prevents open redirect attacks where attackers craft URLs like:
// /auth/callback?code=...&next=//attacker.com
const ALLOWED_REDIRECT_PREFIXES = [
  '/dashboard',
  '/learn',
  '/admin',
  '/practice',
  '/about',
  '/flashcards',
  '/simulator',
  '/leaderboard',
  '/auth/reset-password',
]

function isValidRedirectPath(path: string): boolean {
  // Must be a relative path starting with /
  if (!path || !path.startsWith('/')) {
    return false
  }

  // Reject protocol-relative URLs that could redirect to external sites
  // e.g., //attacker.com would redirect to https://attacker.com
  if (path.startsWith('//')) {
    return false
  }

  // Reject paths with encoded characters that could bypass validation
  // e.g., %2F%2Fattacker.com
  if (path.includes('%')) {
    try {
      const decoded = decodeURIComponent(path)
      if (decoded.startsWith('//') || decoded.includes('://')) {
        return false
      }
    } catch {
      // If decoding fails, reject the path
      return false
    }
  }

  // Check if path starts with an allowed prefix
  return ALLOWED_REDIRECT_PREFIXES.some(prefix => path.startsWith(prefix))
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const requestedNext = searchParams.get("next")

  // Validate the redirect path - fallback to /dashboard if invalid
  const next = requestedNext && isValidRedirectPath(requestedNext)
    ? requestedNext
    : "/dashboard"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
