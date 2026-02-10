"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SpaceBackground } from "@/components/features/home/SpaceBackground"
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

  useEffect(() => {
    setMounted(true)
  }, [])

  // Check if user is already logged in and redirect to dashboard
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.replace("/dashboard")
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
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push("/dashboard")
    router.refresh()
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
      <>
        <SpaceBackground />
        <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6" />
      </>
    )
  }

  return (
    <>
      <SpaceBackground />
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6">
        <div className="w-full max-w-sm animate-scale-in">
          <Card className="border-border/50 shadow-xl shadow-primary/5 transition-shadow duration-300 hover:shadow-2xl hover:shadow-primary/10">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold">
                {showForgotPassword ? "Reset Password" : "Welcome"}
              </CardTitle>
              <CardDescription>
                {showForgotPassword
                  ? "Enter your email to receive a reset link"
                  : "Sign in to track your learning progress"}
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
                    <div className="group space-y-2">
                      <Label htmlFor="reset-email" className="text-sm font-medium transition-colors duration-200 group-focus-within:text-primary">Email</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="you@example.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        className="h-10 transition-all duration-200 hover:border-primary/40 focus:shadow-md focus:shadow-primary/10 focus:border-primary"
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
                      className="w-full h-10 shadow-md shadow-primary/20 transition-all duration-200 hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]"
                      disabled={resetLoading}
                    >
                      {resetLoading ? "Sending..." : "Send reset link"}
                    </Button>
                  </form>
                </div>
              ) : (
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="login" className="transition-all duration-200 data-[state=active]:shadow-sm">Log in</TabsTrigger>
                    <TabsTrigger value="signup" className="transition-all duration-200 data-[state=active]:shadow-sm">Sign up</TabsTrigger>
                  </TabsList>

                  <div className="min-h-[296px] relative">
                    <TabsContent value="login" className="mt-0 data-[state=active]:animate-fade-in-up [&[data-state=active]]:![animation-duration:0.3s]">
                      <form onSubmit={handleLogin} className="space-y-4">
                        <div className="group space-y-2">
                          <Label htmlFor="login-email" className="text-sm font-medium transition-colors duration-200 group-focus-within:text-primary">Email</Label>
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="h-10 transition-all duration-200 hover:border-primary/40 focus:shadow-md focus:shadow-primary/10 focus:border-primary"
                          />
                        </div>
                        <div className="group space-y-2">
                          <Label htmlFor="login-password" className="text-sm font-medium transition-colors duration-200 group-focus-within:text-primary">Password</Label>
                          <Input
                            id="login-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="h-10 transition-all duration-200 hover:border-primary/40 focus:shadow-md focus:shadow-primary/10 focus:border-primary"
                          />
                        </div>
                        {error && (
                          <p className="animate-fade-in text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                            {error}
                          </p>
                        )}
                        <Button
                          type="submit"
                          className="w-full h-10 shadow-md shadow-primary/20 transition-all duration-200 hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]"
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
                        <div className="group space-y-2">
                          <Label htmlFor="signup-name" className="text-sm font-medium transition-colors duration-200 group-focus-within:text-primary">Full name</Label>
                          <Input
                            id="signup-name"
                            type="text"
                            placeholder="Jane Doe"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                            className="h-10 transition-all duration-200 hover:border-primary/40 focus:shadow-md focus:shadow-primary/10 focus:border-primary"
                          />
                        </div>
                        <div className="group space-y-2">
                          <Label htmlFor="signup-email" className="text-sm font-medium transition-colors duration-200 group-focus-within:text-primary">Email</Label>
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="h-10 transition-all duration-200 hover:border-primary/40 focus:shadow-md focus:shadow-primary/10 focus:border-primary"
                          />
                        </div>
                        <div className="group space-y-2">
                          <Label htmlFor="signup-password" className="text-sm font-medium transition-colors duration-200 group-focus-within:text-primary">Password</Label>
                          <Input
                            id="signup-password"
                            type="password"
                            placeholder="At least 6 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="h-10 transition-all duration-200 hover:border-primary/40 focus:shadow-md focus:shadow-primary/10 focus:border-primary"
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
                          className="w-full h-10 shadow-md shadow-primary/20 transition-all duration-200 hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]"
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
            All lessons are free &middot; Sign in to save progress
          </p>
        </div>
      </main>
    </>
  )
}
