import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { BookOpen, CheckCircle, Trophy, ArrowRight, Rocket, GraduationCap, Beaker, History } from 'lucide-react'
import { NavLink } from '@/components/ui/nav-link'
import { COURSE_MODULES } from '@/lib/constants/modules'
import { AnimatedStatCard } from '@/components/features/dashboard/AnimatedStatCard'
import { AnimatedSection } from '@/components/features/home/AnimatedSection'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch progress data
  const [profileResult, progressResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, full_name, lessons_completed')
      .eq('id', user.id)
      .single(),
    supabase
      .from('user_lesson_progress')
      .select('*')
      .eq('user_id', user.id),
  ])

  const profile = profileResult?.data ?? { id: user.id, email: user.email ?? '', full_name: null, lessons_completed: 0 }
  const progressData = progressResult?.data ?? []

  // Build lookup maps for O(1) access (avoids O(n²) in loops below)
  const moduleMap = new Map(COURSE_MODULES.map(m => [m.id, m]))
  const lessonMap = new Map(
    COURSE_MODULES.flatMap(m => m.lessons.map(l => [`${m.id}:${l.id}`, { lesson: l, module: m }]))
  )

  // Calculate stats
  const completedLessons = progressData.filter(p => p.completed)
  const totalLessons = COURSE_MODULES.reduce((acc, m) => acc + m.lessons.length, 0)
  const quizResults = progressData.filter(p => p.quiz_score !== null && p.quiz_total !== null)
  const totalQuizScore = quizResults.reduce((acc, p) => acc + Math.min(p.quiz_score || 0, p.quiz_total || 0), 0)
  const totalQuizQuestions = quizResults.reduce((acc, p) => acc + (p.quiz_total || 0), 0)
  const quizAccuracy = totalQuizQuestions > 0 ? Math.min(100, Math.round((totalQuizScore / totalQuizQuestions) * 100)) : 0
  const modulesStarted = new Set(progressData.map(p => p.module_id)).size

  // Find next lesson to continue (using map for O(1) module lookup)
  let nextLessonLink: string | null = null
  for (const mod of COURSE_MODULES) {
    const completedInModule = new Set(
      progressData.filter(p => p.module_id === mod.id && p.completed).map(p => p.lesson_id)
    )
    const nextLesson = mod.lessons.find(l => !completedInModule.has(l.id))
    if (nextLesson) {
      nextLessonLink = `/learn/${mod.id}/${nextLesson.id}`
      break
    }
  }

  // Build recent activity: last 5 completed lessons sorted by updated_at
  // Use lookup map for O(1) module/lesson access instead of .find()
  const recentActivity = completedLessons
    .filter(p => p.updated_at)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5)
    .map(p => {
      const data = lessonMap.get(`${p.module_id}:${p.lesson_id}`)
      return {
        moduleId: p.module_id,
        lessonId: p.lesson_id,
        moduleTitle: data?.module.title ?? p.module_id,
        lessonTitle: data?.lesson.title ?? p.lesson_id,
        completedAt: p.updated_at,
      }
    })

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
      {/* Welcome */}
      <AnimatedSection animation="fade-up" className="will-change-transform">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Your Rocket Science Journey
        </h1>
        <p className="mt-2 text-muted-foreground">
          Welcome back{profile.full_name ? ', ' + profile.full_name : (profile.email ? ', ' + profile.email.split('@')[0] : '')}. Keep learning!
        </p>
      </AnimatedSection>

      {/* Continue Learning */}
      {nextLessonLink && (
        <AnimatedSection animation="fade-up" delay={0.05} className="will-change-transform">
          <NavLink href={nextLessonLink}>
            <div className="group rounded-xl border border-primary/20 bg-primary/5 p-6 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary mb-1">Continue Learning</p>
                  <p className="text-foreground font-semibold">Pick up where you left off</p>
                </div>
                <Button className="shadow-lg shadow-primary/20 gap-1 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-primary/30">
                  Continue <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </div>
          </NavLink>
        </AnimatedSection>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedStatCard
          icon={<BookOpen className="h-5 w-5" />}
          value={completedLessons.length}
          label="Lessons Completed"
          description={`of ${totalLessons} total`}
          delay={0.1}
        />
        <AnimatedStatCard
          icon={<Rocket className="h-5 w-5" />}
          value={modulesStarted}
          label="Modules Started"
          description={`of ${COURSE_MODULES.length} total`}
          delay={0.2}
        />
        <AnimatedStatCard
          icon={<Trophy className="h-5 w-5" />}
          value={quizAccuracy}
          suffix="%"
          label="Quiz Accuracy"
          description={quizResults.length > 0 ? `${quizResults.length} quizzes taken` : 'No quizzes yet'}
          delay={0.3}
        />
        <AnimatedStatCard
          icon={<CheckCircle className="h-5 w-5" />}
          value={Math.round((completedLessons.length / totalLessons) * 100)}
          suffix="%"
          label="Course Progress"
          description="overall completion"
          delay={0.4}
        />
      </div>

      {/* Recent Activity */}
      <AnimatedSection animation="fade-up" delay={0.3} className="will-change-transform">
        <h2 className="text-2xl font-bold text-foreground mb-4">Recent Activity</h2>
        {recentActivity.length > 0 ? (
          <div className="space-y-3">
            {recentActivity.map((item, index) => (
              <NavLink
                key={`${item.moduleId}-${item.lessonId}`}
                href={`/learn/${item.moduleId}/${item.lessonId}`}
                className="group flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4 transition-all duration-300 hover:border-primary/20 hover:shadow-md hover:-translate-y-0.5 animate-fade-in-up"
                style={{ animationDelay: `${0.4 + index * 0.05}s` }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground truncate group-hover:text-primary transition-colors">
                    {item.lessonTitle}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.moduleTitle}</p>
                </div>
                <div className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                  <History className="h-3 w-3" />
                  {new Date(item.completedAt).toLocaleDateString()}
                </div>
              </NavLink>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
            <BookOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">No lessons completed yet. Start your journey!</p>
            <NavLink href="/learn">
              <Button className="gap-2">
                Browse Lessons <ArrowRight className="h-4 w-4" />
              </Button>
            </NavLink>
          </div>
        )}
      </AnimatedSection>

      {/* Quick Links */}
      <AnimatedSection animation="fade-up" delay={0.5} className="will-change-transform">
        <h2 className="text-2xl font-bold text-foreground mb-4">Quick Links</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {([
            { href: '/learn', icon: GraduationCap, title: 'Learn', description: 'Browse course modules and lessons', colorClasses: 'bg-primary/10 text-primary' },
            { href: '/practice', icon: BookOpen, title: 'Practice', description: 'Flashcards, quizzes, and study modes', colorClasses: 'bg-chart-2/10 text-chart-2' },
            { href: '/simulate', icon: Beaker, title: 'Simulate', description: 'Interactive rocket physics simulations', colorClasses: 'bg-chart-3/10 text-chart-3' },
          ] as const).map((link, index) => (
            <NavLink
              key={link.href}
              href={link.href}
              className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 animate-tilt-in"
              style={{ animationDelay: `${0.55 + index * 0.08}s` }}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${link.colorClasses} mb-3 group-hover:scale-110 transition-transform`}>
                <link.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-card-foreground group-hover:text-primary transition-colors">
                {link.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">{link.description}</p>
              <div className="flex items-center gap-1 text-xs text-primary font-medium mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                Go to {link.title} <ArrowRight className="h-3 w-3" />
              </div>
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
          ))}
        </div>
      </AnimatedSection>
    </main>
  )
}
