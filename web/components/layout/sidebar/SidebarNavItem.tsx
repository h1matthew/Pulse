'use client'

import { usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { NavLink } from '@/components/ui/nav-link'
import { cn } from '@/lib/utils'
import type { NavItem } from '@/lib/constants/navigation'

interface SidebarNavItemProps {
  item: NavItem
  onClick?: () => void
}

export function SidebarNavItem({ item, onClick }: SidebarNavItemProps) {
  const pathname = usePathname()
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

  return (
    <NavLink
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
    </NavLink>
  )
}
