"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle } from "lucide-react"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [sessionError, setSessionError] = useState(false)

  useEffect(() => {
    // Check if we have a valid session from the reset link
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setSessionError(true)
      }
    }
    checkSession()
  }, [])

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        router.push("/dashboard")
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [success, router])

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  async function handleRequestNewLink() {
    router.push("/login")
  }

  if (sessionError) {
    return (
      <>
        <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6">
          <div className="w-full max-w-sm animate-scale-in">
            <Card className="border-border/50">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                  <XCircle className="h-6 w-6 text-destructive" />
                </div>
                <CardTitle className="text-2xl font-bold">Link Expired</CardTitle>
                <CardDescription>
                  This password reset link has expired or is invalid
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <Button
                  onClick={handleRequestNewLink}
                  className="w-full h-10"
                >
                  Request new link
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </>
    )
  }

  if (success) {
    return (
      <>
        <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6">
          <div className="w-full max-w-sm animate-scale-in">
            <Card className="border-border/50">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-chart-2/10">
                  <CheckCircle className="h-6 w-6 text-chart-2" />
                </div>
                <CardTitle className="text-2xl font-bold">Password Updated</CardTitle>
                <CardDescription>
                  Your password has been successfully updated. Redirecting to dashboard...
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6">
        <div className="w-full max-w-sm animate-scale-in">
          <Card className="border-border/50">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
              <CardDescription>Enter your new password below</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-sm font-medium">
                    New Password
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-sm font-medium">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                <Button
                  type="submit"
                  className="w-full h-10"
                  disabled={loading}
                >
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}
