import { notFound } from 'next/navigation'
import { ArrowLeft, CheckCircle, FileQuestion } from 'lucide-react'
import { NavLink } from '@/components/ui/nav-link'
import { createClient } from '@/lib/supabase/server'

interface DbLesson {
  id: string
  slug: string
  title: string
  description: string | null
  order_index: number
  is_quiz: boolean
  status: string
}

export default async function ModulePage({
  params,
}: {
  params: Promise<{ moduleId: string }>
}) {
  const { moduleId } = await params
  const supabase = await createClient()

  // Fetch module by slug (moduleId in URL is actually the slug)
  const { data: mod } = await supabase
    .from('modules')
    .select('*')
    .eq('slug', moduleId)
    .eq('status', 'published')
    .single()

  if (!mod) notFound()

  // Fetch published lessons for this module
  const { data: lessons } = await supabase
    .from('lessons')
    .select('*')
    .eq('module_id', mod.id)
    .eq('status', 'published')
    .order('order_index', { ascending: true })

  const { data: { user } } = await supabase.auth.getUser()

  let completedLessons: Set<string> = new Set()

  if (user) {
    const { data } = await supabase
      .from('user_lesson_progress')
      .select('lesson_id')
      .eq('user_id', user.id)
      .eq('module_id', mod.id)
      .eq('completed', true)

    if (data) {
      completedLessons = new Set(data.map(r => r.lesson_id))
    }
  }

  // Fetch all modules for navigation
  const { data: allModules } = await supabase
    .from('modules')
    .select('id, slug, title, order_index')
    .eq('status', 'published')
    .order('order_index', { ascending: true })

  const modules = allModules || []
  const moduleIndex = modules.findIndex(m => m.id === mod.id)
  const prevModule = moduleIndex > 0 ? modules[moduleIndex - 1] : null
  const nextModule = moduleIndex < modules.length - 1 ? modules[moduleIndex + 1] : null

  const displayLessons = (lessons || []) as DbLesson[]

  return (
    <main className="mx-auto max-w-3xl px-6 py-8 space-y-8">
      {/* Breadcrumb */}
      <NavLink href="/learn" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3 w-3" />
        All Modules
      </NavLink>

      {/* Module Header */}
      <div className="animate-fade-in-up" suppressHydrationWarning>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{mod.icon}</span>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            Module {moduleIndex + 1}
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {mod.title}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {mod.description}
        </p>
      </div>

      {/* Lesson List */}
      {displayLessons.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No lessons available yet for this module.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayLessons.map((lesson, index) => {
            const isCompleted = completedLessons.has(lesson.id)

            return (
              <NavLink
                key={lesson.id}
                href={`/learn/${mod.slug}/${lesson.slug}`}
                className="group flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4 transition-all duration-200 hover:border-primary/20 hover:shadow-md hover:-translate-y-0.5"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${
                  isCompleted
                    ? 'bg-green-500/10 text-green-600'
                    : 'bg-primary/10 text-primary'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : lesson.is_quiz ? (
                    <FileQuestion className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-card-foreground group-hover:text-primary transition-colors">
                    {lesson.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    {lesson.is_quiz && (
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        Test
                      </span>
                    )}
                    {!lesson.is_quiz && (
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        Lesson
                      </span>
                    )}
                  </div>
                </div>

                {isCompleted && (
                  <span className="text-xs text-green-600 font-medium">Completed</span>
                )}
              </NavLink>
            )
          })}
        </div>
      )}

      {/* Module Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-border/50">
        {prevModule ? (
          <NavLink href={`/learn/${prevModule.slug}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            &larr; {prevModule.title}
          </NavLink>
        ) : <div />}
        {nextModule ? (
          <NavLink href={`/learn/${nextModule.slug}`} className="text-sm text-primary hover:text-primary/80 transition-colors">
            {nextModule.title} &rarr;
          </NavLink>
        ) : <div />}
      </div>
    </main>
  )
}
