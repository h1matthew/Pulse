'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState, useRef, useLayoutEffect } from 'react'
import { LogOut, Shield, Users, Heart, LayoutDashboard, Handshake, Store, MapPin, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NavLink } from '@/components/ui/nav-link'
import { MobileMenu } from './MobileMenu'
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
  { href: '/deals', label: 'Deals', icon: Tag },
  { href: '/about', label: 'About', icon: Users },
]

export function Header() {
  const { isLoggedIn, isAdmin } = useAuth()
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [isScrolling, setIsScrolling] = useState(false)
  const lastScrollY = useRef(0)
  const scrollRafId = useRef<number | null>(null)
  const scrolledRef = useRef(false)
  const hiddenRef = useRef(false)
  const scrollingRef = useRef(false)
  const scrollingTimeout = useRef<NodeJS.Timeout | null>(null)
  
  // Sliding pill state
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0, opacity: 0 })
  const navRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  useEffect(() => {
    let mounted = true

    const updateFromScroll = () => {
      if (!mounted) return
      const currentScrollY = window.scrollY

      const nextScrolled = currentScrollY > 50
      if (nextScrolled !== scrolledRef.current) {
        scrolledRef.current = nextScrolled
        setScrolled(nextScrolled)
      }

      const nextHidden = currentScrollY > lastScrollY.current && currentScrollY > 200
      if (nextHidden !== hiddenRef.current) {
        hiddenRef.current = nextHidden
        setHidden(nextHidden)
      }

      lastScrollY.current = currentScrollY
      scrollRafId.current = null
    }

    const handleScroll = () => {
      if (!mounted) return
      if (scrollRafId.current !== null) return
      scrollRafId.current = requestAnimationFrame(updateFromScroll)
      if (!scrollingRef.current) {
        scrollingRef.current = true
        setIsScrolling(true)
      }
      if (scrollingTimeout.current) {
        clearTimeout(scrollingTimeout.current)
      }
      scrollingTimeout.current = setTimeout(() => {
        if (!mounted) return
        scrollingRef.current = false
        setIsScrolling(false)
      }, 120)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    updateFromScroll()

    return () => {
      mounted = false
      window.removeEventListener('scroll', handleScroll)
      if (scrollRafId.current !== null) {
        cancelAnimationFrame(scrollRafId.current)
      }
      if (scrollingTimeout.current) {
        clearTimeout(scrollingTimeout.current)
      }
    }
  }, [])

  // Reveal header when mouse approaches top of viewport
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY <= 15 && hiddenRef.current) {
        setHovered(true)
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Get nav items based on login state
  const navItems = isLoggedIn ? NAV_ITEMS_LOGGED_IN : NAV_ITEMS_PUBLIC

  // When hovered, show full size regardless of scroll state
  const isCompact = scrolled && !hovered
  const isHidden = hidden && !hovered

  // Update pill position when pathname or scroll state changes
  useLayoutEffect(() => {
    const updatePillPosition = () => {
      const activeItem = navItems.find(item => pathname.startsWith(item.href))
      if (activeItem) {
        const button = buttonRefs.current.get(activeItem.href)
        const nav = navRef.current
        if (button && nav) {
          const navRect = nav.getBoundingClientRect()
          const buttonRect = button.getBoundingClientRect()
          setPillStyle({
            left: buttonRect.left - navRect.left,
            width: buttonRect.width,
            opacity: 1,
          })
        }
      } else {
        setPillStyle(prev => ({ ...prev, opacity: 0 }))
      }
    }

    // Throttled resize handler using requestAnimationFrame
    let rafId: number | null = null
    const throttledResize = () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          updatePillPosition()
          rafId = null
        })
      }
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(updatePillPosition, 0)
    window.addEventListener('resize', throttledResize)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', throttledResize)
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [pathname, navItems, isCompact])

  return (
    <header
      className={cn(
        "fixed left-0 right-0 z-50 transition-all duration-500 ease-out",
        isCompact ? "top-2 px-3" : "top-4 px-4",
        isHidden && "-translate-y-full opacity-0"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={cn(
        "mx-auto transition-all duration-500 ease-out",
        isCompact ? "max-w-3xl" : "max-w-5xl"
      )}>
        <nav
          aria-label="Main navigation"
          className={cn(
            "flex items-center justify-between border transition-all duration-500 ease-out backdrop-blur-xl",
            isScrolling && "backdrop-blur-none",
            isCompact
              ? "rounded-full border-border/40 bg-background/80 px-3 py-1.5 shadow-xl shadow-black/10"
              : "rounded-2xl border-border/30 bg-background/70 px-4 py-2.5 shadow-lg shadow-black/5"
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
            <img
              src="/logo.svg"
              alt="Pulse logo"
              className={cn(
                "transition-all duration-300",
                isCompact ? "h-6 w-6" : "h-7 w-7"
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
            {/* Sliding pill background */}
            <div
              className="absolute rounded-md bg-background shadow-sm transition-all duration-300 ease-out pointer-events-none"
              style={{
                left: pillStyle.left,
                width: pillStyle.width,
                opacity: pillStyle.opacity,
                top: isCompact ? '2px' : '4px',
                bottom: isCompact ? '2px' : '4px',
              }}
            />
            
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <NavLink key={item.href} href={item.href}>
                  <button
                    ref={(el) => {
                      if (el) buttonRefs.current.set(item.href, el)
                    }}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
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
                  </button>
                </NavLink>
              )
            })}
          </div>

          {/* Right side actions */}
          <div className="hidden items-center gap-0.5 sm:flex">
            <HelpMenu compact={isCompact} />
            {isAdmin && (
              <NavLink href="/admin">
                <button
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
                </button>
              </NavLink>
            )}
            {isLoggedIn ? (
              <form action="/auth/signout" method="post">
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
              </form>
            ) : (
              <NavLink href="/login">
                <Button
                  size="sm"
                  className={cn(
                    "bg-primary text-primary-foreground transition-all duration-300",
                    isCompact
                      ? "h-7 rounded-full px-3 text-xs shadow-md shadow-primary/20"
                      : "rounded-lg px-4 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
                  )}
                >
                  Sign in
                </Button>
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
