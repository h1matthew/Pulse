'use client'

import { useState } from 'react'
import { LogOut, Settings, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserSettingsModal } from '@/components/features/user/UserSettingsModal'

interface SidebarUserSectionProps {
  email?: string | null
  fullName?: string | null
}

export function SidebarUserSection({ email, fullName }: SidebarUserSectionProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Use fullName if available, otherwise fall back to email prefix
  const displayName = fullName || (email ? email.split('@')[0] : 'User')

  return (
    <>
      <div className="border-t border-sidebar-border px-3 py-4">
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="group flex w-full items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-sidebar-accent/50"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent">
            <User className="h-4 w-4 text-sidebar-accent-foreground" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {displayName}
            </p>
            {email && (
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {email}
              </p>
            )}
          </div>
          <Settings className="h-4 w-4 text-sidebar-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
        <form action="/auth/signout" method="post" className="mt-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </form>
      </div>

      <UserSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        email={email}
        fullName={fullName}
      />
    </>
  )
}
