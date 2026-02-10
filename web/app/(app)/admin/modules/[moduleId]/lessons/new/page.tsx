'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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

interface NewLessonPageProps {
  params: Promise<{ moduleId: string }>
}

export default function NewLessonPage({ params }: NewLessonPageProps) {
  const { moduleId } = use(params)
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    estimated_minutes: 10,
    is_quiz: false,
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
      const { data: lessons } = await supabase
        .from('lessons')
        .select('order_index')
        .eq('module_id', moduleId)
        .order('order_index', { ascending: false })
        .limit(1)

      const nextOrder = lessons && lessons.length > 0 ? lessons[0].order_index + 1 : 0

      const { data, error: insertError } = await supabase
        .from('lessons')
        .insert({
          ...formData,
          module_id: moduleId,
          order_index: nextOrder,
        })
        .select()
        .single()

      if (insertError) throw insertError

      router.push(`/admin/modules/${moduleId}/lessons/${data.id}`)
    } catch (err) {
      console.error('Error creating lesson:', err)
      setError(err instanceof Error ? err.message : 'Failed to create lesson')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/admin/modules/${moduleId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">New Lesson</h1>
          <p className="text-sm text-muted-foreground">Create a new lesson for this module</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Lesson Details</CardTitle>
            <CardDescription>Basic information about the lesson</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="e.g., What is Thrust?"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={e => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="what-is-thrust"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of what this lesson covers..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimated_minutes">Estimated Duration (minutes)</Label>
              <Input
                id="estimated_minutes"
                type="number"
                min={1}
                value={formData.estimated_minutes}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    estimated_minutes: parseInt(e.target.value) || 10,
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Module Quiz</Label>
                <p className="text-xs text-muted-foreground">
                  Mark this lesson as a module test/quiz
                </p>
              </div>
              <Switch
                checked={formData.is_quiz}
                onCheckedChange={is_quiz => setFormData(prev => ({ ...prev, is_quiz }))}
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
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-6">
          <Link href={`/admin/modules/${moduleId}`}>
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
                Create Lesson
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
