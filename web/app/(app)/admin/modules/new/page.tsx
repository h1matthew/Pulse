'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import type { ContentStatus } from '@/types/admin'

const EMOJI_OPTIONS = ['🚀', '🛸', '🌍', '🌙', '⭐', '🔥', '💨', '📏', '⚖️', '🧭', '🧮', '📋', '🤲', '🍎', '⬆️']

export default function NewModulePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    icon: '🚀',
    status: 'draft' as ContentStatus,
  })

  // Auto-generate slug from title
  const handleTitleChange = (title: string) => {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    setFormData(prev => ({
      ...prev,
      title,
      slug: prev.slug === '' || prev.slug === generateSlug(prev.title) ? slug : prev.slug,
    }))
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const supabase = createClient()

      // Get next order index
      const { data: modules } = await supabase
        .from('modules')
        .select('order_index')
        .order('order_index', { ascending: false })
        .limit(1)

      const nextOrder = modules && modules.length > 0 ? modules[0].order_index + 1 : 0

      const { data, error: insertError } = await supabase
        .from('modules')
        .insert({
          ...formData,
          order_index: nextOrder,
        })
        .select()
        .single()

      if (insertError) throw insertError

      router.push(`/admin/modules/${data.id}`)
    } catch (err) {
      console.error('Error creating module:', err)
      setError(err instanceof Error ? err.message : 'Failed to create module')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/modules">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">New Module</h1>
          <p className="text-sm text-muted-foreground">Create a new course module</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Module Details</CardTitle>
            <CardDescription>
              Basic information about the module
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-[auto,1fr]">
              <div className="space-y-2">
                <Label>Icon</Label>
                <Select
                  value={formData.icon}
                  onValueChange={icon => setFormData(prev => ({ ...prev, icon }))}
                >
                  <SelectTrigger className="w-20 h-12 text-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="grid grid-cols-5 gap-1">
                      {EMOJI_OPTIONS.map(emoji => (
                        <SelectItem
                          key={emoji}
                          value={emoji}
                          className="text-2xl cursor-pointer"
                        >
                          {emoji}
                        </SelectItem>
                      ))}
                    </div>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={e => handleTitleChange(e.target.value)}
                  placeholder="e.g., How Rockets Fly"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={e => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="how-rockets-fly"
                required
              />
              <p className="text-xs text-muted-foreground">
                URL-friendly identifier. Will be used in /learn/{formData.slug || 'slug'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what students will learn in this module..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(status: ContentStatus) =>
                  setFormData(prev => ({ ...prev, status }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Only published modules are visible to students
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-6">
          <Link href="/admin/modules">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Module
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
