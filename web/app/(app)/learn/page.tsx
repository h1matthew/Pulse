import { ArrowRight } from 'lucide-react'
import { NavLink } from '@/components/ui/nav-link'
import { createClient } from '@/lib/supabase/server'

export default async function LearnPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch modules from database (only published ones for non-admins)
  const { data: modules } = await supabase
    .from('modules')
    .select(`
      id,
      slug,
      title,
      description,
      icon,
      order_index,
      status,
      lessons (id, status)
    `)
    .eq('status', 'published')
    .order('order_index', { ascending: true })

  const progressMap: Record<string, number> = {}

  if (user) {
    const { data } = await supabase
      .from('user_lesson_progress')
      .select('module_id, lesson_id')
      .eq('user_id', user.id)
      .eq('completed', true)

    if (data) {
      for (const row of data) {
        progressMap[row.module_id] = (progressMap[row.module_id] || 0) + 1
      }
    }
  }

  const displayModules = modules || []

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
      <div className="animate-fade-in-up" suppressHydrationWarning>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Course Modules
        </h1>
        <p className="mt-2 text-muted-foreground">
          Learn rocket science from the ground up. Start anywhere or follow the modules in order.
        </p>
      </div>

      {displayModules.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg mb-2">No modules available yet</p>
          <p className="text-sm">Check back soon for new content!</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {displayModules.map((mod, index) => {
            const publishedLessons = (mod.lessons || []).filter(
              (l: { status: string }) => l.status === 'published'
            )
            const completedLessons = progressMap[mod.id] || 0
            const totalLessons = publishedLessons.length
            const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

            return (
              <NavLink
                key={mod.id}
                href={`/learn/${mod.slug}`}
                className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 animate-tilt-in"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl">
                    {mod.icon}
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    Module {index + 1}
                  </span>
                </div>

                <h3 className="font-semibold text-card-foreground mb-1 group-hover:text-primary transition-colors">
                  {mod.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {mod.description}
                </p>

                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                  <span>{totalLessons} lessons</span>
                </div>

                {user && progress > 0 ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{completedLessons}/{totalLessons} completed</span>
                      <span className="text-primary font-medium">{progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Start module <ArrowRight className="h-3 w-3" />
                  </div>
                )}

                {/* Shimmer effect on hover */}
                <div
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2s linear infinite',
                  }}
                />
              </NavLink>
            )
          })}
        </div>
      )}
    </main>
  )
}
