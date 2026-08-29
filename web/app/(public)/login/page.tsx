"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BaanihaliPuzzleCaptcha } from "@/components/features/bot/BaanihaliPuzzleCaptcha"
import { ArrowLeft } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("login")
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [loginCaptchaToken, setLoginCaptchaToken] = useState<string | null>(null)
  const [showLoginCaptchaModal, setShowLoginCaptchaModal] = useState(false)
  const isLoginCaptchaVerified = Boolean(loginCaptchaToken)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Check if user is already logged in and redirect to dashboard
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        window.location.href = "/dashboard"
      } else {
        setCheckingAuth(false)
      }
    }
    checkAuth()
  }, [router])

  function handleTabChange(value: string) {
    setActiveTab(value)
    setError(null)
    setMessage(null)
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setResetLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) {
      setError(error.message)
      setResetLoading(false)
      return
    }

    setMessage("Check your email for a password reset link.")
    setResetLoading(false)
  }

  function handleBackToLogin() {
    setShowForgotPassword(false)
    setError(null)
    setMessage(null)
    setResetEmail("")
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!isLoginCaptchaVerified || !loginCaptchaToken) {
      setError("Please complete CAPTCHA verification to continue.")
      return
    }

    setLoading(true)

    // Login goes through our API route so attempts are rate limited
    // server-side (per IP and per account).
    let response: Response
    try {
      response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
    } catch {
      setError("Network error. Please try again.")
      setLoading(false)
      return
    }

    if (!response.ok) {
      const data = await response.json().catch(() => null)
      if (response.status === 429) {
        const retryAfter = data?.retryAfter
        const wait = retryAfter
          ? retryAfter >= 120
            ? `${Math.ceil(retryAfter / 60)} minutes`
            : `${retryAfter} seconds`
          : "a few minutes"
        setError(`Too many login attempts. Please try again in ${wait}.`)
      } else {
        setError(data?.error || "Unable to sign in. Please try again.")
      }
      setLoading(false)
      return
    }

    const data = await response.json()

    // Update the singleton Supabase browser client's in-memory session.
    // createBrowserClient caches a single instance — the server API set
    // the session cookie via Set-Cookie headers, but the in-memory state
    // was initialized to null before the cookie existed.  setSession()
    // writes the session into memory AND document.cookie so the hard
    // navigation below picks it up on the fresh page load.
    const supabase = createClient()
    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })

    // Hard navigation forces a full page reload where the server reads
    // the auth cookie and AuthProvider mounts with the correct session.
    window.location.href = "/dashboard"
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setMessage("Check your email for a confirmation link.")
    setLoading(false)
  }

  // Show nothing while checking auth to prevent flash
  if (!mounted || checkingAuth) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6" />
    )
  }

  return (
    <>
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6">
        <div className="w-full max-w-sm animate-scale-in">
          <Card className="border-border/70">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-h3 font-medium">
                {showForgotPassword ? "Reset password" : "Sign in"}
              </CardTitle>
              <CardDescription>
                {showForgotPassword
                  ? "Enter your email to receive a reset link"
                  : "Use your account to save places, claim deals, and keep a verified ledger."}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              {showForgotPassword ? (
                <div className="animate-fade-in-up [animation-duration:0.3s]">
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 mb-4"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to login
                  </button>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email" className="text-sm font-medium">Email</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="you@example.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        className="h-10"
                      />
                    </div>
                    {error && (
                      <p className="animate-fade-in text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                        {error}
                      </p>
                    )}
                    {message && (
                      <p className="animate-fade-in text-sm text-chart-2 bg-chart-2/10 rounded-md px-3 py-2">
                        {message}
                      </p>
                    )}
                    <Button
                      type="submit"
                      className="w-full h-10"
                      disabled={resetLoading}
                    >
                      {resetLoading ? "Sending..." : "Send reset link"}
                    </Button>
                  </form>
                </div>
              ) : (
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="login" className="transition-colors duration-200">Log in</TabsTrigger>
                    <TabsTrigger value="signup" className="transition-colors duration-200">Sign up</TabsTrigger>
                  </TabsList>

                  <div className="min-h-[296px] relative">
                    <TabsContent value="login" className="mt-0 data-[state=active]:animate-fade-in-up [&[data-state=active]]:![animation-duration:0.3s]">
                      <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            onFocus={() => setError(null)}
                            className="h-10"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="login-password" className="text-sm font-medium">Password</Label>
                          <Input
                            id="login-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            onFocus={() => setError(null)}
                            className="h-10"
                          />
                        </div>
                        {error && (
                          <p className="animate-fade-in text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                            {error}
                          </p>
                        )}
                        <div className="space-y-2">
                          <Button
                            type="button"
                            variant={isLoginCaptchaVerified ? "secondary" : "outline"}
                            className="w-full h-10"
                            onClick={() => {
                              setError(null)
                              setShowLoginCaptchaModal(true)
                            }}
                          >
                            {isLoginCaptchaVerified
                              ? "CAPTCHA Verified"
                              : "Verify CAPTCHA"}
                          </Button>
                          {!isLoginCaptchaVerified && (
                            <p className="text-xs text-muted-foreground text-center">
                              Required before signing in.
                            </p>
                          )}
                        </div>
                        <Button
                          type="submit"
                          className="w-full h-10"
                          disabled={loading}
                        >
                          {loading ? "Signing in..." : "Sign in"}
                        </Button>
                        <div className="text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setShowForgotPassword(true)
                              setResetEmail(email)
                              setError(null)
                              setMessage(null)
                            }}
                            className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
                          >
                            Forgot password?
                          </button>
                        </div>
                      </form>
                    </TabsContent>

                    <TabsContent value="signup" className="mt-0 data-[state=active]:animate-fade-in-up [&[data-state=active]]:![animation-duration:0.3s]">
                      <form onSubmit={handleSignup} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="signup-name" className="text-sm font-medium">Full name</Label>
                          <Input
                            id="signup-name"
                            type="text"
                            placeholder="Jane Doe"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                            className="h-10"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="h-10"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
                          <Input
                            id="signup-password"
                            type="password"
                            placeholder="At least 6 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="h-10"
                          />
                        </div>
                        {error && (
                          <p className="animate-fade-in text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                            {error}
                          </p>
                        )}
                        {message && (
                          <p className="animate-fade-in text-sm text-chart-2 bg-chart-2/10 rounded-md px-3 py-2">
                            {message}
                          </p>
                        )}
                        <Button
                          type="submit"
                          className="w-full h-10"
                          disabled={loading}
                        >
                          {loading ? "Creating account..." : "Create account"}
                        </Button>
                      </form>
                    </TabsContent>
                  </div>
                </Tabs>
              )}
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground transition-colors duration-200 hover:text-foreground/70">
            Local directory &middot; Saved places &middot; Verified spend
          </p>
        </div>
      </main>

      {showLoginCaptchaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm space-y-3 rounded-lg border border-border bg-background p-4">
            <h3 className="text-base font-semibold">Security check</h3>
            <p className="text-sm text-muted-foreground">
              Complete this CAPTCHA to continue signing in.
            </p>
            <BaanihaliPuzzleCaptcha
              onVerify={(token) => {
                setLoginCaptchaToken(token)
                setShowLoginCaptchaModal(false)
                setError(null)
              }}
              onCancel={() => {
                setShowLoginCaptchaModal(false)
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}
