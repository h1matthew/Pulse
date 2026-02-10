'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AlertTriangle, User, Key } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  email?: string | null
  fullName?: string | null
}

export function UserSettingsModal({
  open,
  onOpenChange,
  email,
  fullName,
}: UserSettingsModalProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('account')

  // Password state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)

  // Delete account state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const displayName = fullName || (email ? email.split('@')[0] : 'User')

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    setPasswordLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      setPasswordError(error.message)
      setPasswordLoading(false)
      return
    }

    setPasswordSuccess(true)
    setNewPassword('')
    setConfirmPassword('')
    setPasswordLoading(false)

    // Clear success message after 3 seconds
    setTimeout(() => setPasswordSuccess(false), 3000)
  }

  async function handleDeleteAccount() {
    if (deleteConfirmation !== 'DELETE') return

    setDeleteLoading(true)
    setDeleteError(null)

    try {
      const response = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete account')
      }

      // Sign out and redirect
      const supabase = createClient()
      await supabase.auth.signOut()

      router.push('/login')
      router.refresh()
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete account')
      setDeleteLoading(false)
    }
  }

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      // Reset state when closing
      setActiveTab('account')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordError(null)
      setPasswordSuccess(false)
      setDeleteConfirmation('')
      setDeleteError(null)
    }
    onOpenChange(newOpen)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-xl">Settings</DialogTitle>
            <DialogDescription>
              Manage your account settings
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-4 pt-2">
            {/* Sidebar Navigation */}
            <nav className="w-32 flex-shrink-0 space-y-1 border-r border-border/50 pr-3">
              <button
                type="button"
                onClick={() => setActiveTab('account')}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200',
                  activeTab === 'account'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <User className="h-4 w-4" />
                Account
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('password')}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200',
                  activeTab === 'password'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Key className="h-4 w-4" />
                Password
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('danger')}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200',
                  activeTab === 'danger'
                    ? 'bg-destructive/10 text-destructive'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <AlertTriangle className="h-4 w-4" />
                Danger Zone
              </button>
            </nav>

            {/* Content Area */}
            <div className="flex-1 min-w-0 min-h-[280px]">
              {activeTab === 'account' && (
                <div className="space-y-5 animate-fade-in">
                  <div className="space-y-2">
                    <Label htmlFor="display-name">Display Name</Label>
                    <Input
                      id="display-name"
                      value={displayName}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={email || ''}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Contact support to change your email address.
                  </p>
                </div>
              )}

              {activeTab === 'password' && (
                <form onSubmit={handlePasswordChange} className="space-y-5 animate-fade-in">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  {passwordError && (
                    <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                      {passwordError}
                    </p>
                  )}
                  {passwordSuccess && (
                    <p className="text-sm text-chart-2 bg-chart-2/10 rounded-md px-3 py-2">
                      Password updated successfully
                    </p>
                  )}
                  <Button
                    type="submit"
                    disabled={passwordLoading || !newPassword || !confirmPassword}
                    className="w-full"
                  >
                    {passwordLoading ? 'Updating...' : 'Update Password'}
                  </Button>
                </form>
              )}

              {activeTab === 'danger' && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-5 space-y-4 animate-fade-in">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Danger Zone</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                    className="w-full"
                  >
                    Delete Account
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span className="block">
                This action cannot be undone. This will permanently delete your account
                and remove all your data from our servers.
              </span>
              <span className="block font-medium">
                Type <span className="font-mono text-foreground">DELETE</span> to confirm:
              </span>
              <Input
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value.toUpperCase())}
                placeholder="Type DELETE to confirm"
                className="mt-2"
              />
              {deleteError && (
                <span className="block text-sm text-destructive">
                  {deleteError}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteConfirmation('')
                setDeleteError(null)
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmation !== 'DELETE' || deleteLoading}
              variant="destructive"
            >
              {deleteLoading ? 'Deleting...' : 'Delete Account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
