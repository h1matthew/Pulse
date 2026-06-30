"use client"

import { useState } from "react"
import { ShieldCheck, Check, ArrowLeft } from "lucide-react"
import { Header } from "@/components/layout/Header"
import { Button } from "@/components/ui/button"
import { BaanihaliPuzzleCaptcha } from "@/components/features/bot/BaanihaliPuzzleCaptcha"
import { NavLink } from "@/components/ui/nav-link"

export default function VerifyPage() {
  const [verified, setVerified] = useState(false)

  return (
    <div className="relative flex min-h-screen flex-col">
      <Header />

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-[13px] bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">Security check</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
              Slide the puzzle piece into the highlighted slot to confirm you&apos;re human.
              This keeps bot reviews and fake claims off Pulse.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            {verified ? (
              <div className="py-8 text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check className="h-6 w-6" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-lg font-semibold">Verified — you&apos;re human</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  You can close this page and continue where you left off.
                </p>
                <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <NavLink href="/login">
                    <Button variant="outline" className="w-full sm:w-auto">
                      Back to sign in
                    </Button>
                  </NavLink>
                  <Button className="w-full sm:w-auto" onClick={() => setVerified(false)}>
                    Verify again
                  </Button>
                </div>
              </div>
            ) : (
              <BaanihaliPuzzleCaptcha
                onVerify={() => setVerified(true)}
              />
            )}
          </div>

          <p className="mx-auto mt-6 max-w-sm text-center text-xs leading-5 text-muted-foreground">
            Protected by Pulse — receipt scans and CAPTCHA tokens are verified
            server-side before any reward is granted.
          </p>

          <div className="mt-4 text-center">
            <NavLink
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to home
            </NavLink>
          </div>
        </div>
      </main>
    </div>
  )
}
