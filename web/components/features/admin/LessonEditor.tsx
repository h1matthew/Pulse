'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  Save,
  Loader2,
  Settings,
  FileText,
  HelpCircle,
  Plus,
  Trash2,
  GripVertical,
} from 'lucide-react'
import { useDebouncedCallback } from '@/hooks/useDebounce'
import { toast } from 'sonner'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'
import type {
  DbLesson,
  DbContentBlock,
  DbQuizQuestion,
  ContentStatus,
} from '@/types/admin'
import { QuizQuestionEditor } from './QuizQuestionEditor'
import { LessonRichTextEditor } from './editor'

// Sortable wrapper for quiz questions
function SortableQuestionWrapper({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? 'opacity-80 shadow-lg z-50' : ''}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-4 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted z-10"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="pl-8">
        {children}
      </div>
    </div>
  )
}

interface LessonEditorProps {
  lesson: DbLesson
  contentBlocks: DbContentBlock[]
  quizQuestions: DbQuizQuestion[]
  moduleId: string
  moduleTitle?: string
}

export function LessonEditor({
  lesson,
  contentBlocks: initialBlocks,
  quizQuestions: initialQuestions,
  moduleId,
  moduleTitle,
}: LessonEditorProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Lesson settings
  const [lessonData, setLessonData] = useState({
    title: lesson.title,
    slug: lesson.slug,
    description: lesson.description || '',
    estimated_minutes: lesson.estimated_minutes,
    is_quiz: lesson.is_quiz,
    status: lesson.status,
  })

  // Quiz questions
  const [questions, setQuestions] = useState<DbQuizQuestion[]>(initialQuestions)

  // Memoized sorted questions
  const sortedQuestions = useMemo(
    () => [...questions].sort((a, b) => a.order_index - b.order_index),
    [questions]
  )

  // Save lesson settings
  const handleSaveSettings = useCallback(async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('lessons')
        .update(lessonData)
        .eq('id', lesson.id)

      if (updateError) throw updateError

      setSuccess(true)
      router.refresh()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Error updating lesson:', err)
      setError(err instanceof Error ? err.message : 'Failed to update lesson')
    } finally {
      setSaving(false)
    }
  }, [lessonData, lesson.id, router])

  // Add new quiz question
  const handleAddQuestion = useCallback(async () => {
    try {
      const supabase = createClient()
      const nextOrder = questions.length > 0 ? Math.max(...questions.map(q => q.order_index)) + 1 : 0

      const { data, error } = await supabase
        .from('quiz_questions')
        .insert({
          lesson_id: lesson.id,
          question_text: 'New question',
          question_type: 'multiple-choice',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correct_answer: 'Option A',
          order_index: nextOrder,
        })
        .select()
        .single()

      if (error) throw error

      setQuestions(prev => [...prev, data])
    } catch (err) {
      console.error('Error adding question:', err)
      toast.error('Failed to add quiz question')
    }
  }, [questions.length, lesson.id])

  // Delete quiz question
  const handleDeleteQuestion = useCallback(async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return

    try {
      const supabase = createClient()
      const { error } = await supabase.from('quiz_questions').delete().eq('id', questionId)

      if (error) throw error

      setQuestions(prev => prev.filter(q => q.id !== questionId))
    } catch (err) {
      console.error('Error deleting question:', err)
      toast.error('Failed to delete question')
    }
  }, [])

  // Update quiz question
  const handleUpdateQuestion = useCallback(async (questionId: string, updates: Partial<DbQuizQuestion>) => {
    // Optimistic local update
    setQuestions(prev => prev.map(q => (q.id === questionId ? { ...q, ...updates } : q)))

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('quiz_questions')
        .update(updates)
        .eq('id', questionId)

      if (error) throw error
    } catch (err) {
      console.error('Error updating question:', err)
    }
  }, [])

  // Debounced version for auto-save
  const debouncedUpdateQuestion = useDebouncedCallback(handleUpdateQuestion, 500)

  // Delete lesson
  const handleDeleteLesson = useCallback(async () => {
    if (!confirm('Are you sure you want to delete this lesson? This cannot be undone.')) return

    try {
      const supabase = createClient()
      const { error } = await supabase.from('lessons').delete().eq('id', lesson.id)

      if (error) throw error

      router.push(`/admin/modules/${moduleId}`)
    } catch (err) {
      console.error('Error deleting lesson:', err)
      toast.error('Failed to delete lesson')
    }
  }, [lesson.id, moduleId, router])

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle question reorder
  const handleQuestionDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event

      if (over && active.id !== over.id) {
        const oldIndex = sortedQuestions.findIndex(q => q.id === active.id)
        const newIndex = sortedQuestions.findIndex(q => q.id === over.id)

        const newQuestions = arrayMove(sortedQuestions, oldIndex, newIndex)
        // Update local state with new order_index values
        const updatedQuestions = newQuestions.map((q, idx) => ({ ...q, order_index: idx }))
        setQuestions(updatedQuestions)

        // Persist to database
        try {
          const response = await fetch('/api/admin/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entityType: 'quiz_questions',
              items: newQuestions.map((q, idx) => ({ id: q.id, order_index: idx })),
            }),
          })

          if (!response.ok) throw new Error('Failed to reorder')
          toast.success('Questions reordered')
        } catch (error) {
          console.error('Failed to reorder questions:', error)
          toast.error('Failed to reorder questions')
          setQuestions(initialQuestions)
        }
      }
    },
    [sortedQuestions, initialQuestions]
  )

  return (
    <Tabs defaultValue="content" className="space-y-6">
      <TabsList>
        <TabsTrigger value="content" className="gap-2">
          <FileText className="h-4 w-4" />
          Content
        </TabsTrigger>
        <TabsTrigger value="quiz" className="gap-2">
          <HelpCircle className="h-4 w-4" />
          Quiz ({questions.length})
        </TabsTrigger>
        <TabsTrigger value="settings" className="gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </TabsTrigger>
      </TabsList>

      {/* Content Tab - Rich Text Editor */}
      <TabsContent value="content">
        <LessonRichTextEditor
          lessonId={lesson.id}
          initialBlocks={initialBlocks}
          lessonTitle={lessonData.title}
          moduleTitle={moduleTitle}
          onSave={() => router.refresh()}
        />
      </TabsContent>

      {/* Quiz Tab */}
      <TabsContent value="quiz" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Quiz Questions</h2>
          <Button onClick={handleAddQuestion}>
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        </div>

        {sortedQuestions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <HelpCircle className="h-10 w-10 mx-auto mb-4 opacity-50" />
              <p className="mb-4">No quiz questions yet</p>
              <Button variant="outline" onClick={handleAddQuestion}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Question
              </Button>
            </CardContent>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleQuestionDragEnd}
            modifiers={[restrictToVerticalAxis]}
          >
            <SortableContext items={sortedQuestions.map(q => q.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {sortedQuestions.map((question, index) => (
                  <SortableQuestionWrapper key={question.id} id={question.id}>
                    <QuizQuestionEditor
                      question={question}
                      index={index}
                      onUpdate={updates => debouncedUpdateQuestion(question.id, updates)}
                      onDelete={() => handleDeleteQuestion(question.id)}
                    />
                  </SortableQuestionWrapper>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </TabsContent>

      {/* Settings Tab */}
      <TabsContent value="settings">
        <Card>
          <CardHeader>
            <CardTitle>Lesson Settings</CardTitle>
            <CardDescription>Configure lesson properties and visibility</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 rounded-lg bg-green-500/10 text-green-600 text-sm">
                Lesson updated successfully
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={lessonData.title}
                onChange={e => setLessonData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={lessonData.slug}
                onChange={e => setLessonData(prev => ({ ...prev, slug: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={lessonData.description}
                onChange={e => setLessonData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimated_minutes">Estimated Duration (minutes)</Label>
              <Input
                id="estimated_minutes"
                type="number"
                min={1}
                value={lessonData.estimated_minutes}
                onChange={e =>
                  setLessonData(prev => ({
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
                checked={lessonData.is_quiz}
                onCheckedChange={is_quiz => setLessonData(prev => ({ ...prev, is_quiz }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={lessonData.status}
                onValueChange={(status: ContentStatus) =>
                  setLessonData(prev => ({ ...prev, status }))
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

            <div className="flex gap-3 pt-4">
              <Button onClick={handleSaveSettings} disabled={saving} className="flex-1">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={handleDeleteLesson}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Lesson
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
