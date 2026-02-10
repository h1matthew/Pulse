'use client'

import { SIDEBAR_NAVIGATION } from '@/lib/constants/navigation'
import { SidebarNavItem } from './SidebarNavItem'

interface SidebarNavProps {
  onItemClick?: () => void
  isAdmin?: boolean
}

export function SidebarNav({ onItemClick, isAdmin }: SidebarNavProps) {
  return (
    <nav className="flex-1 space-y-6 px-3 py-4 overflow-y-auto">
      {SIDEBAR_NAVIGATION.map((section) => {
        // Skip admin-only sections if user is not admin
        if (section.adminOnly && !isAdmin) {
          return null
        }

        return (
          <div key={section.title}>
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => (
                <SidebarNavItem
                  key={item.href}
                  item={item}
                  onClick={onItemClick}
                />
              ))}
            </div>
          </div>
        )
      })}
    </nav>
  )
}
