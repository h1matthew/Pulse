'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  BookOpen,
  Settings,
} from 'lucide-react'

interface AdminLayoutProps {
  children: ReactNode
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    name: 'Modules',
    href: '/admin/modules',
    icon: BookOpen,
  },
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: Settings,
  },
]

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col min-h-full">
      {/* Admin header with tabs */}
      <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 pt-6 pb-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-4">
            Admin Panel
          </h1>
          <nav className="flex gap-1">
            {navigation.map(item => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/admin' && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-colors border-b-2 -mb-[1px]',
                    isActive
                      ? 'bg-background border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  )
}
