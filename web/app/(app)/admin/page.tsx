import { Suspense } from 'react'
import Link from 'next/link'
import {
  Shield,
  BookOpen,
  GraduationCap,
  Video,
  Users,
  Plus,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getAdminStats, getModules } from '@/lib/admin'
import { AnimatedStatCard } from '@/components/features/dashboard/AnimatedStatCard'
import { AnimatedSection } from '@/components/features/home/AnimatedSection'

async function DashboardContent() {
  const [stats, modules] = await Promise.all([
    getAdminStats(),
    getModules(),
  ])

  const recentModules = modules.slice(0, 5)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Manage course content, videos, and settings
            </p>
          </div>
        </div>
        <Link href="/admin/modules/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Module
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AnimatedStatCard
          icon={<BookOpen className="h-5 w-5" />}
          value={stats.modules.total}
          label="Total Modules"
          description={`${stats.modules.published} published, ${stats.modules.draft} drafts`}
          delay={0.1}
        />
        <AnimatedStatCard
          icon={<GraduationCap className="h-5 w-5" />}
          value={stats.lessons.total}
          label="Total Lessons"
          description={`${stats.lessons.published} published, ${stats.lessons.draft} drafts`}
          delay={0.2}
        />
        <AnimatedStatCard
          icon={<Video className="h-5 w-5" />}
          value={stats.videos.total}
          label="Video Compositions"
          description={`${stats.videos.published} published, ${stats.videos.draft} drafts`}
          delay={0.3}
        />
        <AnimatedStatCard
          icon={<Users className="h-5 w-5" />}
          value={stats.users.total}
          label="Registered Users"
          description="Total registered users"
          delay={0.4}
        />
      </div>

      {/* Quick Actions & Recent Modules */}
      <AnimatedSection animation="fade-up" delay={0.5}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Quick Actions */}
          <Card className="animate-tilt-in" style={{ animationDelay: '0.5s' }}>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks for content management</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Link href="/admin/modules/new" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Module
                </Button>
              </Link>
              <Link href="/admin/videos/new" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Video className="h-4 w-4 mr-2" />
                  Create New Video
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Modules */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Modules</CardTitle>
                <CardDescription>Your latest course modules</CardDescription>
              </div>
              <Link href="/admin/modules">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentModules.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No modules yet</p>
                  <Link href="/admin/modules/new">
                    <Button variant="link" size="sm">
                      Create your first module
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentModules.map((module, index) => (
                    <Link
                      key={module.id}
                      href={`/admin/modules/${module.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card
                        transition-all duration-300 hover:bg-muted/50 hover:-translate-y-0.5
                        hover:shadow-md hover:border-primary/20 animate-fade-in-up"
                      style={{ animationDelay: `${0.6 + index * 0.08}s` }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{module.icon}</span>
                        <div>
                          <p className="font-medium">{module.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {module.status === 'published' ? (
                              <span className="text-green-600">Published</span>
                            ) : (
                              <span className="text-yellow-600">Draft</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AnimatedSection>
    </div>
  )
}

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}
