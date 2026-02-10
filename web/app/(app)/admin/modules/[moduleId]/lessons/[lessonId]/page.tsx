import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getLessonWithContent, getModule } from '@/lib/admin'

// Lazy-load LessonEditor (includes @dnd-kit, @tiptap, rich text editing)
const LessonEditor = dynamic(
  () => import('@/components/features/admin/LessonEditor').then(m => ({ default: m.LessonEditor })),
  { loading: () => <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></div> }
)

interface LessonDetailPageProps {
  params: Promise<{ moduleId: string; lessonId: string }>
}

async function LessonDetailContent({
  moduleId,
  lessonId,
}: {
  moduleId: string
  lessonId: string
}) {
  const [lesson, module] = await Promise.all([
    getLessonWithContent(lessonId),
    getModule(moduleId),
  ])

  if (!lesson || !module) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/admin/modules/${moduleId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <span>{module.icon}</span>
              <span>{module.title}</span>
              <span>/</span>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {lesson.title}
              </h1>
              {lesson.is_quiz && (
                <Badge variant="outline">Quiz</Badge>
              )}
              <Badge
                variant={lesson.status === 'published' ? 'default' : 'secondary'}
              >
                {lesson.status}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Lesson Editor */}
      <LessonEditor
        lesson={lesson}
        contentBlocks={lesson.content_blocks}
        quizQuestions={lesson.quiz_questions}
        moduleId={moduleId}
        moduleTitle={module.title}
      />
    </div>
  )
}

export default async function LessonDetailPage({ params }: LessonDetailPageProps) {
  const { moduleId, lessonId } = await params

  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LessonDetailContent moduleId={moduleId} lessonId={lessonId} />
    </Suspense>
  )
}
