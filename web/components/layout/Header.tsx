'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState, useRef, useLayoutEffect } from 'react'
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

// Remembers the pill's last placement across client-side navigations. Each
// page renders its own <Header />, so the component remounts on route change;
// restoring this position before first paint lets the pill SLIDE from the
// previous page's active item over to the new one instead of popping into
// place. Module scope is client-only here (written exclusively from layout
// effects), so SSR markup is unaffected.
let lastPillSnapshot: { left: number; width: number } | null = null

export function Header() {
  const { isLoggedIn, isAdmin } = useAuth()
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [hovered, setHovered] = useState(false)
  const lastScrollY = useRef(0)
  const scrollRafId = useRef<number | null>(null)
  const scrolledRef = useRef(false)
  const hiddenRef = useRef(false)
  const hoveredRef = useRef(false)

  // Sliding pill. Animated imperatively (rAF easing toward the measured
  // target, styles written straight to the DOM node) instead of a CSS
  // transition: per-frame target updates during the header's compact/expand
  // morph would otherwise make a CSS transition trail ~300ms behind the
  // moving buttons, which reads as lag.
  const pillRef = useRef<HTMLDivElement>(null)
  const pillPos = useRef<{ left: number; width: number } | null>(null)
  const navRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<Map<string, HTMLSpanElement>>(new Map())
  const isFirstPlacement = useRef(true)

  // Keep the ref in sync so stable event listeners can read hover state.
  hoveredRef.current = hovered

  useEffect(() => {
    let mounted = true

    const updateFromScroll = () => {
      if (!mounted) return
      const currentScrollY = window.scrollY
      const delta = currentScrollY - lastScrollY.current

      // Hysteresis: compact past 64px, expand again under 32px — the gap
      // prevents flip-flopping when the scroll position hovers at a boundary.
      const nextScrolled = scrolledRef.current
        ? currentScrollY > 32
        : currentScrollY > 64
      if (nextScrolled !== scrolledRef.current) {
        scrolledRef.current = nextScrolled
        setScrolled(nextScrolled)
      }

      // Hide only on a deliberate downward scroll (>4px) deep in the page;
      // any deliberate upward scroll reveals it again. Tiny deltas (trackpad
      // inertia, scroll anchoring) are ignored entirely.
      if (Math.abs(delta) > 4) {
        const nextHidden = delta > 0 && currentScrollY > 240
        if (nextHidden !== hiddenRef.current) {
          hiddenRef.current = nextHidden
          setHidden(nextHidden)
        }
      }

      lastScrollY.current = currentScrollY
      scrollRafId.current = null
    }

    const handleScroll = () => {
      if (!mounted) return
      if (scrollRafId.current !== null) return
      scrollRafId.current = requestAnimationFrame(updateFromScroll)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    updateFromScroll()

    return () => {
      mounted = false
      window.removeEventListener('scroll', handleScroll)
      if (scrollRafId.current !== null) {
        cancelAnimationFrame(scrollRafId.current)
      }
    }
  }, [])

  // Reveal the hidden header when the mouse approaches the top of the
  // viewport, and release the reveal once the pointer moves well below the
  // header band — otherwise `hovered` stays stuck and the header never
  // re-compacts/hides (it previously only reset via the header's own
  // onMouseLeave, which never fires if the pointer never entered it).
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY <= 15 && hiddenRef.current && !hoveredRef.current) {
        setHovered(true)
      } else if (e.clientY > 120 && hoveredRef.current) {
        setHovered(false)
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Get nav items based on login state
  const navItems = isLoggedIn ? NAV_ITEMS_LOGGED_IN : NAV_ITEMS_PUBLIC

  // Hover only REVEALS a hidden header — it must not un-compact it.
  // (Expanding on hover meant the header flip-flopped sizes whenever the
  // cursor sat near the top of the page while scrolling.)
  const isCompact = scrolled
  const isHidden = hidden && !hovered

  // Update pill position when pathname or scroll state changes.
  //
  // Pill animator. One rAF loop eases the pill toward the active item's
  // measured position every frame, writing styles directly to the DOM node:
  // - during the header's compact/expand morph the target moves each frame
  //   and the pill stays glued to it (no CSS-transition trailing lag);
  // - after a client-side navigation the pill starts from the previous
  //   page's remembered position and glides over to the new active item;
  // - on the very first load it appears in place (no slide-in from the edge).
  useLayoutEffect(() => {
    const el = pillRef.current
    if (!el) return

    let rafId: number | null = null

    const measure = (): { left: number; width: number } | null => {
      const activeItem = navItems.find(item => pathname.startsWith(item.href))
      if (!activeItem) return null
      const button = buttonRefs.current.get(activeItem.href)
      const nav = navRef.current
      if (!button || !nav) return null
      const navRect = nav.getBoundingClientRect()
      const buttonRect = button.getBoundingClientRect()
      return { left: buttonRect.left - navRect.left, width: buttonRect.width }
    }

    const write = (pos: { left: number; width: number }, visible: boolean) => {
      el.style.left = `${pos.left}px`
      el.style.width = `${pos.width}px`
      el.style.opacity = visible ? '1' : '0'
    }

    // Starting point: mid-animation position from a previous run of this
    // effect (isCompact flip), the previous page's position (client-side
    // navigation), or the current target (first ever load — appear in place).
    if (isFirstPlacement.current) {
      isFirstPlacement.current = false
      pillPos.current = pillPos.current ?? lastPillSnapshot ?? measure()
      if (pillPos.current) write(pillPos.current, true)
    }

    const startedAt = performance.now()
    let lastFrameAt = startedAt

    const step = () => {
      const now = performance.now()
      // Time-based easing so speed is frame-rate independent (~90ms to cover
      // 63% of the remaining distance — snappy but visibly gliding).
      const alpha = 1 - Math.exp(-(now - lastFrameAt) / 90)
      lastFrameAt = now

      const target = measure()
      if (!target) {
        el.style.opacity = '0'
        // No active nav item (e.g. the homepage): park the loop once the
        // mount window has passed instead of spinning rAF forever.
        rafId = now - startedAt > 600 ? null : requestAnimationFrame(step)
        return
      }

      const from = pillPos.current ?? target
      let next = {
        left: from.left + (target.left - from.left) * alpha,
        width: from.width + (target.width - from.width) * alpha,
      }

      const settledOnTarget =
        Math.abs(next.left - target.left) < 0.5 && Math.abs(next.width - target.width) < 0.5
      if (settledOnTarget) next = target

      pillPos.current = next
      lastPillSnapshot = { left: target.left, width: target.width }
      write(next, true)

      // Keep looping until we're parked on a target that has itself stopped
      // moving past the header's longest transition window (500ms).
      const layoutSettled = settledOnTarget && now - startedAt > 600
      if (!layoutSettled) {
        rafId = requestAnimationFrame(step)
      } else {
        rafId = null
      }
    }
    step()

    const handleResize = () => {
      if (rafId === null) {
        lastFrameAt = performance.now()
        rafId = requestAnimationFrame(step)
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [pathname, navItems, isCompact])

  return (
    <header
      className={cn(
        "fixed left-0 right-0 z-50 transition-all duration-300 ease-out",
        isCompact ? "top-2 px-3" : "top-4 px-4",
        isHidden && "-translate-y-full opacity-0"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={cn(
        "mx-auto transition-all duration-300 ease-out",
        isCompact ? "max-w-3xl" : "max-w-5xl"
      )}>
        <nav
          aria-label="Main navigation"
          className={cn(
            "flex items-center justify-between border transition-all duration-300 ease-out",
            isCompact
              ? "rounded-full border-border bg-background px-3 py-1.5 shadow-sm"
              : "rounded-2xl border-border bg-background px-4 py-2.5 shadow-sm"
          )}
        >
          {/* Logo */}
          <NavLink
            href="/"
            aria-label="Pulse — Home"
            className={cn(
              "flex items-center gap-2.5 transition-all duration-300 hover:opacity-80",
              isCompact && "gap-2"
            )}
          >
            <PulseLogo
              className={cn(
                "transition-all duration-300 text-foreground",
                isCompact ? "h-8 w-8" : "h-9 w-9"
              )}
            />
            <span
              className={cn(
                "font-semibold tracking-tight transition-all duration-300",
                isCompact ? "text-sm" : "text-base",
                isCompact && "hidden sm:inline"
              )}
            >
              Pulse
            </span>
          </NavLink>

          {/* Desktop nav - centered with sliding pill */}
          <div
            ref={navRef}
            className={cn(
              "hidden items-center sm:flex relative",
              isCompact
                ? "gap-0.5 rounded-full bg-muted/40 p-0.5"
                : "gap-0.5 rounded-xl bg-muted/50 p-1"
            )}
          >
            {/* Sliding pill background — position/opacity driven imperatively
                by the rAF animator (no CSS position transition; see effect). */}
            <div
              ref={pillRef}
              className="absolute rounded-md bg-background shadow-sm pointer-events-none"
              style={{
                left: 0,
                width: 0,
                opacity: 0,
                top: isCompact ? '2px' : '4px',
                bottom: isCompact ? '2px' : '4px',
              }}
            />
            
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
                    ref={(el) => {
                      if (el) buttonRefs.current.set(item.href, el)
                    }}
                    className={cn(
                      "relative flex items-center font-medium transition-colors duration-300 z-10",
                      isCompact
                        ? "gap-1 rounded-full px-2.5 py-1 text-xs"
                        : "gap-1.5 rounded-lg px-3 py-1.5 text-sm",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <item.icon className={cn(
                      "transition-all duration-300",
                      isCompact ? "h-3 w-3" : "h-3.5 w-3.5"
                    )} aria-hidden="true" />
                    <span className={cn(
                      "transition-all duration-300",
                      isCompact ? "hidden xl:inline" : "hidden lg:inline"
                    )}>
                      {item.label}
                    </span>
                  </span>
                </NavLink>
              )
            })}
          </div>

          {/* Right side actions */}
          <div className="hidden items-center gap-0.5 sm:flex">
            <ThemeToggle compact={isCompact} />
            <HelpMenu compact={isCompact} />
            {isAdmin && (
              <NavLink
                href="/admin"
                aria-label="Admin panel"
                className={cn(
                  "flex items-center gap-1.5 font-medium transition-all duration-300",
                  isCompact
                    ? "rounded-full px-2 py-1 text-xs"
                    : "rounded-lg px-2.5 py-1.5 text-sm",
                  pathname.startsWith('/admin')
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Shield className={cn(
                  "transition-all duration-300",
                  isCompact ? "h-3.5 w-3.5" : "h-4 w-4"
                )} aria-hidden="true" />
                <span className="hidden lg:inline">Admin</span>
              </NavLink>
            )}
            {isLoggedIn ? (
              <SignOutButton>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Sign out"
                  className={cn(
                    "gap-1.5 text-muted-foreground hover:text-foreground transition-all duration-300",
                    isCompact ? "h-7 rounded-full px-2 text-xs" : "rounded-lg"
                  )}
                >
                  <LogOut className={cn(
                    "transition-all duration-300",
                    isCompact ? "h-3.5 w-3.5" : "h-4 w-4"
                  )} aria-hidden="true" />
                  <span className={cn(
                    "hidden transition-all duration-300",
                    isCompact ? "xl:inline" : "lg:inline"
                  )}>
                    Sign out
                  </span>
                </Button>
              </SignOutButton>
            ) : (
              <NavLink
                href="/login"
                className={cn(
                  buttonVariants({ size: "sm" }),
                    // Gradient + foreground come from the default button variant
                    "transition-all duration-300",
                    isCompact
                      ? "h-7 rounded-full px-3 text-xs"
                      : "rounded-lg px-4"
                )}
              >
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
