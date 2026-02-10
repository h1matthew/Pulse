'use client'

import { useState, useEffect } from 'react'
import {
  Settings,
  Sparkles,
  FileText,
  Users,
  Database,
  Loader2,
  Save,
  RefreshCw,
  Shield,
  Check,
  X,
  BookOpen,
  GraduationCap,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { AnimatedSection } from '@/components/features/home/AnimatedSection'

interface AdminUser {
  id: string
  email: string
  full_name: string | null
  is_admin: boolean
  created_at: string
}

interface AISettings {
  defaultModel: string
  temperature: number
  maxTokens: number
}

interface ContentSettings {
  defaultModuleStatus: 'draft' | 'published'
  defaultLessonStatus: 'draft' | 'published'
  autoSaveInterval: number
}

interface DbStats {
  modules: number
  lessons: number
  contentBlocks: number
  quizQuestions: number
  users: number
  versions: number
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [allUsers, setAllUsers] = useState<AdminUser[]>([])
  const [dbStats, setDbStats] = useState<DbStats | null>(null)
  const [refreshingStats, setRefreshingStats] = useState(false)

  // AI Settings
  const [aiSettings, setAISettings] = useState<AISettings>({
    defaultModel: 'gemini-1.5-flash',
    temperature: 0.7,
    maxTokens: 4096,
  })

  // Content Settings
  const [contentSettings, setContentSettings] = useState<ContentSettings>({
    defaultModuleStatus: 'draft',
    defaultLessonStatus: 'draft',
    autoSaveInterval: 30,
  })

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      // Load admin users
      const { data: admins } = await supabase
        .from('profiles')
        .select('id, email, full_name, is_admin, created_at')
        .eq('is_admin', true)
        .order('created_at', { ascending: true })

      setAdminUsers(admins || [])

      // Load all users for admin management
      const { data: users } = await supabase
        .from('profiles')
        .select('id, email, full_name, is_admin, created_at')
        .order('created_at', { ascending: false })
        .limit(100)

      setAllUsers(users || [])

      // Load database stats
      await refreshDbStats()

      // Load saved settings from localStorage (or could be from database)
      const savedAI = localStorage.getItem('admin_ai_settings')
      const savedContent = localStorage.getItem('admin_content_settings')

      if (savedAI) {
        setAISettings(JSON.parse(savedAI))
      }
      if (savedContent) {
        setContentSettings(JSON.parse(savedContent))
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  async function refreshDbStats() {
    setRefreshingStats(true)
    try {
      const [modules, lessons, blocks, questions, users, versions] = await Promise.all([
        supabase.from('modules').select('id', { count: 'exact', head: true }),
        supabase.from('lessons').select('id', { count: 'exact', head: true }),
        supabase.from('content_blocks').select('id', { count: 'exact', head: true }),
        supabase.from('quiz_questions').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('content_versions').select('id', { count: 'exact', head: true }),
      ])

      setDbStats({
        modules: modules.count || 0,
        lessons: lessons.count || 0,
        contentBlocks: blocks.count || 0,
        quizQuestions: questions.count || 0,
        users: users.count || 0,
        versions: versions.count || 0,
      })
    } catch (error) {
      console.error('Error refreshing stats:', error)
    } finally {
      setRefreshingStats(false)
    }
  }

  async function saveSettings() {
    setSaving(true)
    try {
      // Save to localStorage (could also save to database)
      localStorage.setItem('admin_ai_settings', JSON.stringify(aiSettings))
      localStorage.setItem('admin_content_settings', JSON.stringify(contentSettings))
      toast.success('Settings saved successfully')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function toggleAdmin(userId: string, makeAdmin: boolean) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: makeAdmin })
        .eq('id', userId)

      if (error) throw error

      // Refresh user lists
      const { data: admins } = await supabase
        .from('profiles')
        .select('id, email, full_name, is_admin, created_at')
        .eq('is_admin', true)
        .order('created_at', { ascending: true })

      setAdminUsers(admins || [])

      // Update allUsers list
      setAllUsers(prev =>
        prev.map(u => (u.id === userId ? { ...u, is_admin: makeAdmin } : u))
      )

      toast.success(makeAdmin ? 'Admin access granted' : 'Admin access revoked')
    } catch (error) {
      console.error('Error updating admin status:', error)
      toast.error('Failed to update admin status')
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <AnimatedSection animation="fade-up">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
            </div>
            <p className="text-muted-foreground">
              Configure AI generation, content defaults, and manage admin users
            </p>
          </div>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Settings
          </Button>
        </div>
      </AnimatedSection>

      <Tabs defaultValue="ai" className="space-y-6">
        <TabsList>
          <TabsTrigger value="ai" className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI Generation
          </TabsTrigger>
          <TabsTrigger value="content" className="gap-2">
            <FileText className="h-4 w-4" />
            Content Defaults
          </TabsTrigger>
          <TabsTrigger value="admins" className="gap-2">
            <Users className="h-4 w-4" />
            Admin Users
          </TabsTrigger>
          <TabsTrigger value="database" className="gap-2">
            <Database className="h-4 w-4" />
            Database
          </TabsTrigger>
        </TabsList>

        {/* AI Settings Tab */}
        <TabsContent value="ai">
          <AnimatedSection animation="fade-up" delay={0.1}>
            <Card>
              <CardHeader>
                <CardTitle>AI Generation Settings</CardTitle>
                <CardDescription>
                  Configure default parameters for AI-generated content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Default Model</Label>
                  <Select
                    value={aiSettings.defaultModel}
                    onValueChange={v => setAISettings(prev => ({ ...prev, defaultModel: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash (Fast)</SelectItem>
                      <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro (Better)</SelectItem>
                      <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash (Latest)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Model used for content generation
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Max Tokens</Label>
                  <Input
                    type="number"
                    min={256}
                    max={8192}
                    value={aiSettings.maxTokens}
                    onChange={e =>
                      setAISettings(prev => ({
                        ...prev,
                        maxTokens: parseInt(e.target.value) || 4096,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum output length (256-8192)
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Temperature: {aiSettings.temperature.toFixed(1)}</Label>
                  <span className="text-sm text-muted-foreground">
                    {aiSettings.temperature < 0.3
                      ? 'More focused'
                      : aiSettings.temperature > 0.7
                        ? 'More creative'
                        : 'Balanced'}
                  </span>
                </div>
                <Slider
                  value={[aiSettings.temperature]}
                  onValueChange={([v]) => setAISettings(prev => ({ ...prev, temperature: v }))}
                  min={0}
                  max={1}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Lower values produce more predictable output, higher values are more creative
                </p>
              </div>
            </CardContent>
          </Card>
          </AnimatedSection>
        </TabsContent>

        {/* Content Defaults Tab */}
        <TabsContent value="content">
          <AnimatedSection animation="fade-up" delay={0.1}>
            <Card>
              <CardHeader>
                <CardTitle>Content Default Settings</CardTitle>
                <CardDescription>
                  Configure default values for new modules and lessons
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Default Module Status</Label>
                  <Select
                    value={contentSettings.defaultModuleStatus}
                    onValueChange={(v: 'draft' | 'published') =>
                      setContentSettings(prev => ({ ...prev, defaultModuleStatus: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Status assigned to newly created modules
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Default Lesson Status</Label>
                  <Select
                    value={contentSettings.defaultLessonStatus}
                    onValueChange={(v: 'draft' | 'published') =>
                      setContentSettings(prev => ({ ...prev, defaultLessonStatus: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Status assigned to newly created lessons
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Auto-save Interval: {contentSettings.autoSaveInterval}s</Label>
                </div>
                <Slider
                  value={[contentSettings.autoSaveInterval]}
                  onValueChange={([v]) =>
                    setContentSettings(prev => ({ ...prev, autoSaveInterval: v }))
                  }
                  min={10}
                  max={120}
                  step={10}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  How often to auto-save content changes (10-120 seconds)
                </p>
              </div>
            </CardContent>
          </Card>
          </AnimatedSection>
        </TabsContent>

        {/* Admin Users Tab */}
        <TabsContent value="admins">
          <AnimatedSection animation="fade-up" delay={0.1}>
            <div className="space-y-6">
              {/* Current Admins */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Current Admins
                  </CardTitle>
                  <CardDescription>
                    Users with administrative access to the CMS
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {adminUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No admin users found</p>
                  ) : (
                    <div className="space-y-2">
                      {adminUsers.map((admin, index) => (
                        <div
                          key={admin.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card animate-fade-in-up hover:-translate-y-0.5 hover:shadow-sm transition-all duration-300"
                          style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                        >
                          <div>
                            <p className="font-medium">{admin.full_name || 'Unnamed User'}</p>
                            <p className="text-sm text-muted-foreground">{admin.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              Admin
                            </span>
                            {adminUsers.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleAdmin(admin.id, false)}
                                className="text-destructive hover:text-destructive"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* All Users */}
              <Card>
                <CardHeader>
                  <CardTitle>All Users</CardTitle>
                  <CardDescription>
                    Grant or revoke admin access to users
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {allUsers
                      .filter(u => !u.is_admin)
                      .map((user, index) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card animate-fade-in-up hover:-translate-y-0.5 hover:shadow-sm transition-all duration-300"
                          style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                        >
                          <div>
                            <p className="font-medium">{user.full_name || 'Unnamed User'}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleAdmin(user.id, true)}
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            Make Admin
                          </Button>
                        </div>
                      ))}
                    {allUsers.filter(u => !u.is_admin).length === 0 && (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        All users are already admins
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </AnimatedSection>
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database">
          <AnimatedSection animation="fade-up" delay={0.1}>            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Database Statistics</CardTitle>
                    <CardDescription>
                      Overview of content stored in the database
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshDbStats}
                    disabled={refreshingStats}
                  >
                    {refreshingStats ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {dbStats ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    {[
                      { icon: BookOpen, label: 'Modules', value: dbStats.modules },
                      { icon: GraduationCap, label: 'Lessons', value: dbStats.lessons },
                      { icon: FileText, label: 'Content Blocks', value: dbStats.contentBlocks },
                      { icon: Sparkles, label: 'Quiz Questions', value: dbStats.quizQuestions },
                      { icon: Users, label: 'Users', value: dbStats.users },
                      { icon: Layers, label: 'Content Versions', value: dbStats.versions },
                    ].map((stat, index) => (
                      <AnimatedSection key={stat.label} animation="fade-up" delay={0.1 + (index * 0.08)}>
                        <Card className="animate-grid-item hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
                          <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                              <stat.icon className="h-4 w-4 text-muted-foreground" />
                              <CardDescription>{stat.label}</CardDescription>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-3xl font-bold">{stat.value.toLocaleString()}</p>
                          </CardContent>
                        </Card>
                      </AnimatedSection>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Loading statistics...</p>
                )}
              </CardContent>
            </Card>
          </AnimatedSection>
        </TabsContent>
      </Tabs>
    </div>
  )
}
