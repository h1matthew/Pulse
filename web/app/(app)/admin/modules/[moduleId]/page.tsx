import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  ArrowLeft,
  Loader2,
  Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getModuleWithLessons } from '@/lib/admin'
import { ModuleSettingsForm } from '@/components/features/admin/ModuleSettingsForm'
import { DeleteModuleButton } from '@/components/features/admin/DeleteModuleButton'

// Lazy-load LessonsList (includes @dnd-kit drag-and-drop)
const LessonsList = dynamic(
  () => import('@/components/features/admin/LessonsList').then(m => ({ default: m.LessonsList })),
  { loading: () => <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div> }
)

interface ModuleDetailPageProps {
  params: Promise<{ moduleId: string }>
}

async function ModuleDetailContent({ moduleId }: { moduleId: string }) {
  const mod = await getModuleWithLessons(moduleId)

  if (!mod) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/modules">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{mod.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {mod.title}
                </h1>
                <Badge
                  variant={mod.status === 'published' ? 'default' : 'secondary'}
                >
                  {mod.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{mod.description}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DeleteModuleButton moduleId={mod.id} moduleName={mod.title} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,300px]">
        {/* Lessons List */}
        <LessonsList moduleId={mod.id} initialLessons={mod.lessons} />

        {/* Module Settings */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Module Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ModuleSettingsForm module={mod} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default async function ModuleDetailPage({ params }: ModuleDetailPageProps) {
  const { moduleId } = await params

  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ModuleDetailContent moduleId={moduleId} />
    </Suspense>
  )
}
