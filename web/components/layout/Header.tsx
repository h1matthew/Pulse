'use client'

import { usePathname } from 'next/navigation'
import { LogOut, Shield, Users, LayoutDashboard, Store, MapPin, Tag, Zap } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { NavLink } from '@/components/ui/nav-link'
import { PulseLogo } from '@/components/ui/PulseLogo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { MobileMenu } from './MobileMenu'
import { SignOutButton } from './SignOutButton'
import { HelpMenu } from '@/components/features/help/HelpMenu'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/providers/AuthProvider'

const NAV_ITEMS_PUBLIC = [
  { href: '/discover', label: 'Discover', icon: Store },
  { href: '/categories', label: 'Categories', icon: MapPin },
  { href: '/deals', label: 'Deals', icon: Tag },
  { href: '/about', label: 'About', icon: Users },
]

const NAV_ITEMS_LOGGED_IN = [
  { href: '/discover', label: 'Discover', icon: Store },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/missions', label: 'Missions', icon: Zap },
  { href: '/deals', label: 'Deals', icon: Tag },
  { href: '/about', label: 'About', icon: Users },
]

export function Header() {
  const { isLoggedIn, isAdmin } = useAuth()
  const pathname = usePathname()

  // Get nav items based on login state
  const navItems = isLoggedIn ? NAV_ITEMS_LOGGED_IN : NAV_ITEMS_PUBLIC

  return (
    <header className="fixed left-0 right-0 top-6 z-50 px-4">
      <div className="mx-auto max-w-5xl">
        <nav
          aria-label="Main navigation"
          className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-2.5 shadow-sm"
        >
          {/* Logo */}
          <NavLink
            href="/"
            aria-label="Pulse — Home"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <PulseLogo className="h-9 w-9 text-foreground" />
            <span className="text-lg font-semibold tracking-tight">Pulse</span>
          </NavLink>

          {/* Desktop nav - centered */}
          <div className="relative hidden items-center gap-0.5 rounded-md bg-muted/50 p-1 sm:flex">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <NavLink
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </span>
                </NavLink>
              )
            })}
          </div>

          {/* Right side actions */}
          <div className="hidden items-center gap-0.5 sm:flex">
            <ThemeToggle />
            {isAdmin && (
              <NavLink
                href="/admin"
                aria-label="Admin panel"
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                  pathname.startsWith('/admin')
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Shield className="h-4 w-4" aria-hidden="true" />
                <span className="hidden lg:inline">Admin</span>
              </NavLink>
            )}
            {/* Help sits directly beside the auth action */}
            <HelpMenu />
            {isLoggedIn ? (
              <SignOutButton>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Sign out"
                  className="gap-1.5 rounded-md text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden lg:inline">Sign out</span>
                </Button>
              </SignOutButton>
            ) : (
              <NavLink href="/login" className={cn(buttonVariants({ size: "sm" }), "px-4")}>
                Sign in
              </NavLink>
            )}
          </div>

          {/* Mobile menu */}
          <MobileMenu />
        </nav>
      </div>
    </header>
  )
}
