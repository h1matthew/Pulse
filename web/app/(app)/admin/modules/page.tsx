import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { Loader2, BookOpen, GraduationCap, Layers } from 'lucide-react'
import { getModules, getAdminStats } from '@/lib/admin'
import { AnimatedSection } from '@/components/features/home/AnimatedSection'
import { Card } from '@/components/ui/card'

// Lazy-load ModulesList (includes @dnd-kit drag-and-drop)
const ModulesList = dynamic(
  () => import('@/components/features/admin/ModulesList').then(m => ({ default: m.ModulesList })),
  { loading: () => <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div> }
)

async function ModulesListContent() {
  const modules = await getModules()
  const stats = await getAdminStats()

  const totalLessons = stats.lessons.total
  const publishedModules = stats.modules.published

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <AnimatedSection animation="fade-up" delay={0.1}>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="animate-grid-item hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{modules.length}</p>
                  <p className="text-sm text-muted-foreground">Total Modules</p>
                </div>
              </div>
            </div>
          </Card>
          <Card className="animate-grid-item hover:-translate-y-0.5 hover:shadow-md transition-all duration-300" style={{ animationDelay: '0.15s' }}>
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalLessons}</p>
                  <p className="text-sm text-muted-foreground">Total Lessons</p>
                </div>
              </div>
            </div>
          </Card>
          <Card className="animate-grid-item hover:-translate-y-0.5 hover:shadow-md transition-all duration-300" style={{ animationDelay: '0.2s' }}>
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Layers className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{publishedModules}</p>
                  <p className="text-sm text-muted-foreground">Published</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </AnimatedSection>

      {/* Modules List */}
      <AnimatedSection animation="fade-up" delay={0.3}>
        <Card className="animate-tilt-in">
          <ModulesList initialModules={modules} />
        </Card>
      </AnimatedSection>
    </div>
  )
}

export default function ModulesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ModulesListContent />
    </Suspense>
  )
}
