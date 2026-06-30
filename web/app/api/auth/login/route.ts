import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIP } from '@/lib/rateLimit'

/**
 * POST /api/auth/login
 *
 * Signs the user in with email + password. Running this server-side (instead
 * of calling Supabase directly from the browser) lets us enforce a rate limit
 * on login attempts: 10 per 10 minutes per IP and per account email, so
 * credential-stuffing against one account is throttled even across IPs.
 */
export async function POST(request: NextRequest) {
  let body: { email?: unknown; password?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 }
    )
  }

  const ip = getClientIP(request)
  const [ipLimit, emailLimit] = await Promise.all([
    checkRateLimit(`ip:${ip}`, 'login'),
    checkRateLimit(`email:${email.toLowerCase()}`, 'login'),
  ])

  if (!ipLimit.success || !emailLimit.success) {
    const retryAfterMs = Math.max(ipLimit.retryAfterMs, emailLimit.retryAfterMs)
    const retryAfter = Math.max(1, Math.ceil(retryAfterMs / 1000))
    return NextResponse.json(
      {
        error: 'Too many login attempts. Please try again later.',
        retryAfter,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) },
      }
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  return NextResponse.json({
    user: data.user,
    session: {
      access_token: data.session!.access_token,
      refresh_token: data.session!.refresh_token,
    },
  })
}
